// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const { TokenSwap } = require("@solana/spl-token-swap");

// load the local utility functions
const { loadOrGenerateKeypair, airdropOnLowBalance } = require("./utils");

// load task specific helper functions
const { createFullTokenMint } = require("./minter");
const { createSwapPool } = require("./swapPool");

/*
  Define some assorted constants
*/
const amountToSwap = 5; // number of tokens to swap per instruction
const ixCounter = 24; // number of instructions to run per transaction

// define our program ID and cluster to interact with
// const SOLANA_CLUSTER_URL = web3.clusterApiUrl("devnet");
const SOLANA_CLUSTER_URL = "http://localhost:8899";

/*
  Create an async function to allow for Promises
*/
async function main() {
  // create a new connection to the Solana blockchain
  const connection = new web3.Connection(SOLANA_CLUSTER_URL);

  const slot = await connection.getSlot();

  // load or generate wallets for testing (aka "throw away" wallets), and fund them
  let payer = await loadOrGenerateKeypair("payer");
  await airdropOnLowBalance(connection, payer);

  let receiver = await loadOrGenerateKeypair("receiver");
  await airdropOnLowBalance(connection, receiver);

  // create the "token A"
  let tokenA = await createFullTokenMint(connection, "tokenA", payer, receiver);
  // console.log("Token A:", tokenA);

  // create the "token B"
  let tokenB = await createFullTokenMint(connection, "tokenB", payer, receiver);
  // console.log("Token B:", tokenB);

  // create the swap pool for tokenA and tokenB
  const swapPool = await createSwapPool(
    connection,
    payer,
    receiver,
    tokenA,
    tokenB
  );

  // return;

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("\n\n----------------------------------------------------------");
  console.log("-------------------------------------------------------------");
  console.log("----------------------------------------------------------\n");

  console.log("Create a swap 'legacy' transaction...");

  // swap transaction using the current JS swap library
  // the swap IX format that @solana/spl-token-swap v0.2.1 wants....
  // but it does not work (due to a bug in the library)...
  // const swapIx = TokenSwap.swapInstruction(
  //   swapPool.tokenSwap,
  //   swapPool.authority,
  //   receiver.publicKey,
  //   tokenA.receiverTokenAccount,
  //   swapPool.tokenAccountA,
  //   swapPool.tokenAccountB,
  //   tokenB.receiverTokenAccount,
  //   swapPool.poolToken,
  //   swapPool.feeAccount,
  //   null, // there is no host fee account!
  //   swapPool.swapProgramId,
  //   TOKEN_PROGRAM_ID, // this is the token program used to create TokenA
  //   TOKEN_PROGRAM_ID, // this is the token program used to create TokenB
  //   swapPool.poolTokenProgramId, // name changed from `tokenProgramId` in @swap/spl-token-swap v0.2.1
  //   amountToSwap,
  //   0 // allow a minimum amount of 0 tokens in return; 0 not recommended for production apps!
  // );

  // create a swap transaction using the JS swap library
  // the swap IX format that @solana/spl-token-swap v0.2.0 wants....
  const swapIx = TokenSwap.swapInstruction(
    swapPool.tokenSwap,
    swapPool.authority,
    receiver.publicKey,
    tokenA.receiverTokenAccount,
    swapPool.tokenAccountA,
    swapPool.tokenAccountB,
    tokenB.receiverTokenAccount,
    swapPool.poolToken,
    swapPool.feeAccount,
    null, // there is no host fee account!
    swapPool.swapProgramId,
    swapPool.tokenProgramId, // renamed to `poolTokenProgramId` in @swap/spl-token-swap v0.2.1
    amountToSwap,
    0 // allow a minimum amount of 0 tokens in return (0 not recommended for production apps!)
  );

  // create a `legacy` transaction to perform a swap
  const transactionLegacy = new web3.Transaction();

  // add `ixCounter` number of instructions to the `legacy` transaction
  for (let i = 0; i < ixCounter; i++) transactionLegacy.add(swapIx);

  // extract all the keys from the tokens and the token pool
  const addresses = [];

  for (let i = 0; i < swapIx.keys.length; i++) {
    addresses.push(swapIx.keys[i].pubkey);
    // console.log(swapIx.keys[i].pubkey.toBase58());
  }

  console.log("Total addresses to add to table:", addresses.length);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create and extend the Address Lookup Table 
  */

  console.log(
    "\nWaiting a few seconds to please the address lookup table slot checker...\n"
  );
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  // create an Address Lookup Table instruction (and derive it's address)
  const [lookupTableInst, lookupTableAddress] =
    web3.AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: slot,
    });

  console.log("Table address:", lookupTableAddress.toBase58());

  // create the ALT extend instruction to store all of our `addresses` on chain in the ALT
  const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    lookupTable: lookupTableAddress,
    addresses, // this will use the same address extracted from the `legacy` instruction
  });

  console.log("Sending the create/extend ALT via a 'legacy' transaction...");

  // send a legacy 'transaction' to create and extend the table
  const extendTxid = await web3.sendAndConfirmTransaction(
    connection,
    new web3.Transaction().add(lookupTableInst, extendInstruction),
    [payer]
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${extendTxid}?cluster=devnet`
  );

  /***************************************************************************************************
  ***************************************************************************************************

    NOTE:
    - Address lookup tables can be CREATED and/or EXTENDED via a `legacy` or `v0` transaction
      (The above example is using a 'legacy' transaction to create and extend)
    - However, to utilize the lookup capabilities within a transaction, you must use a `v0` transaction
        (like demonstrated below)
  
  ****************************************************************************************************
  ****************************************************************************************************/

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    You can fetch the complete on chain lookup table like so:
  */

  console.log("\nFetch the lookup table from the cluster...");

  // fetch the complete lookup table from the cluster
  const lookupTableAccount = await connection
    .getAddressLookupTable(lookupTableAddress)
    .then((res) => res.value);

  // display all the addresses in the table
  // NOTE: these should be in the exact same order as the `addresses` array
  // for (let i = 0; i < lookupTableAccount.state.addresses.length; i++) {
  //   let key = lookupTableAccount.state.addresses[i];
  //   console.log(i, key.toBase58());
  // }

  console.log("Lookup table address:", lookupTableAccount.key.toBase58());
  console.log(
    "Addresses found in table:",
    lookupTableAccount.state.addresses.length
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
  Create a new v0 transaction that uses the lookup table in it
  (you know, the reason you are reading this code) :)
  */

  console.log("Build the v0 Message and Transaction...");

  // get the latest blockhash for use in our transaction message
  const blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);

  /***************************************************************************************************
  ***************************************************************************************************
 
    NOTE:
      When we compile the `Message` into a v0 message (via `compileToV0Message`) 
      we are providing an array of all the address lookup tables used 
      (with each of these tables being a `AddressLookupTableAccount` item within the array)
 
  ****************************************************************************************************
  ****************************************************************************************************/

  // build a v0 compatible instruction for use with the v0 transaction we will create
  // const swapIxV0 = "";
  const swapIxV0 = [];

  // add `ixCounter` number of instructions to the `legacy` transaction
  for (let i = 0; i < ixCounter; i++) swapIxV0.push(swapIx);

  // build a v0 message to be used withing out v0 transaction
  const messageV0 = new web3.TransactionMessage({
    payerKey: receiver.publicKey,
    recentBlockhash: blockhash,
    instructions: swapIxV0, // note this is an array of instructions
  }).compileToV0Message([lookupTableAccount]);

  // create a v0 transaction from the v0 message
  const transactionV0 = new web3.VersionedTransaction(messageV0);

  /***************************************************************************************************
  ***************************************************************************************************
 
    NOTE:
    When sending a `VersionedTransaction`, it must be signed BEFORE calling the 
    `sendAndConfirmTransaction` method. If you pass an array of `Signer` 
    (like with `legacy` transactions) the method will trigger an error!
    
  ****************************************************************************************************
  ****************************************************************************************************/

  // sign the v0 transaction using the file system wallet we created named `payer`
  transactionV0.sign([receiver]);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("\n---------------------------------------------------------");
  console.log("Send the 'legacy' and 'v0' transactions to the cluster");
  console.log("---------------------------------------------------------\n");

  console.log("Sending the swap 'legacy' transaction...");

  // send the legacy transaction (`transactionLegacy`)
  const txidLegacy = await web3.sendAndConfirmTransaction(
    connection,
    transactionLegacy,
    [receiver]
  );

  console.log(
    `Legacy swap transaction: https://explorer.solana.com/tx/${txidLegacy}?cluster=devnet`
  );

  console.log("Sending the swap 'v0' transaction...");

  // send the v0 transaction (`transactionV0`)
  const txidV0 = await web3.sendAndConfirmTransaction(
    connection,
    transactionV0
  );

  console.log(
    `v0 swap transaction: https://explorer.solana.com/tx/${txidV0}?cluster=devnet`
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("\n---------------------------------------------------------");
  console.log("Versioned transaction stats");
  console.log("---------------------------------------------------------\n");

  console.log("Token swaps per transaction:", ixCounter);
  console.log("v0 transaction size:", transactionV0.serialize().length);
  console.log(
    "Legacy transaction size:",
    transactionLegacy.serialize().buffer.byteLength
  );

  console.log("\n"); // give extra space at the bottom :)
}

// run our code, allowing use of Promises
main();
