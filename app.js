// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const { TokenSwap } = require("@solana/spl-token-swap");
const {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} = require("@solana/spl-token");

// load the local utility functions
const {
  sendTransactionV0,
  loadOrGenerateKeypair,
  airdropOnLowBalance,
} = require("./utils");

// load task specific helper functions
const { createFullTokenMint } = require("./minter");
const { createSwapPool } = require("./swapPool");

// define our program ID and cluster to interact with
const SOLANA_CLUSTER = "devnet";
const SOLANA_CLUSTER_URL = web3.clusterApiUrl(SOLANA_CLUSTER);
// const SOLANA_CLUSTER_URL = "http://localhost:8899";

async function main() {
  // create a new connection to the Solana blockchain
  const connection = new web3.Connection(SOLANA_CLUSTER_URL);

  let transaction;

  // const slot = await connection.getSlot();

  // const block = await connection.getBlock(slot, {
  //   maxSupportedTransactionVersion: 0,
  // });

  // // calculate the min rent needed to keep account open
  // let minRent = await connection.getMinimumBalanceForRentExemption(0);
  // console.log("min balance for rent exempt:", minRent);

  // // console.log(block);

  // blockhash = await connection
  //   .getLatestBlockhash()
  //   .then((res) => res.blockhash);
  // console.log(recentBlockhash);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    generate 2 address, saving them locally
    create 2 random tokens, all owned by a single payer
    create the token swap
    v0 this bitch
  */

  // create or generate keys for testing (aka "throw away" wallets), and fund them
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
  // console.log(swapPool);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // extract the public keys from the token swap
  const {
    tokenSwap,
    swapProgramId,
    poolTokenProgramId,
    poolToken,
    feeAccount,
    authority,
    tokenAccountA,
    tokenAccountB,
    mintA,
    mintB,
  } = swapPool;

  transaction = new web3.Transaction();

  console.log(
    "\n\n-------------------------------------------------------------------"
  );
  console.log(
    "-------------------------------------------------------------------"
  );
  console.log(
    "-------------------------------------------------------------------\n"
  );

  // console.log(
  //   `https://explorer.solana.com/address/${tokenSwap.toBase58()}?cluster=devnet`
  // );

  // console.log("token swap address:", tokenSwap.toBase58());
  // console.log("swap program address:", swapProgramId.toBase58());
  // console.log("pool token program address:", poolTokenProgramId.toBase58());
  // console.log("token program:", TOKEN_PROGRAM_ID.toBase58());

  // console.log(
  //   "-------------------------------------------------------------------\n"
  // );

  // console.log("mint A:", mintA.toBase58());
  // console.log("token mint A:", tokenA.tokenMint.toBase58());
  // console.log("mint B:", mintB.toBase58());
  // console.log("token mint B:", tokenB.tokenMint.toBase58());

  console.log("Create receiver's pool token ATA...");

  let poolAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    poolToken,
    receiver.publicKey
  );
  poolAccount = poolAccount.address;

  console.log("Receiver's pool token ATA:", poolAccount.toBase58());

  console.log(
    "-------------------------------------------------------------------\n"
  );

  console.log("Deposit liquidity...");

  const poolTokenAmount = 1;

  // create a deposit transactions (this also does not currently work...)
  // const depositIx = TokenSwap.depositAllTokenTypesInstruction(
  //   tokenSwap,
  //   authority,
  //   receiver.publicKey,
  //   // mintA,
  //   // mintB,
  //   tokenA.receiverTokenAccount,
  //   tokenB.receiverTokenAccount,
  //   tokenAccountA,
  //   tokenAccountB,
  //   poolToken,
  //   poolAccount,
  //   swapProgramId,
  //   TOKEN_PROGRAM_ID,
  //   TOKEN_PROGRAM_ID,
  //   poolTokenProgramId,
  //   // poolTokenAmount,
  //   poolTokenAmount * 10 ** 2,
  //   100e9,
  //   100e9
  // );
  // transaction.add(depositIx);

  const amountToSwap = 5;

  // create the swap deposit instruction with added params
  // NOTE: this is a suspected problem that the Rust swap program expects the token mints as well, but the current JS library does not provide?
  // https://github.com/solana-labs/solana-program-library/blob/master/token-swap/program/src/processor.rs#L400
  // const ixLegacy = TokenSwap.swapInstruction(
  //   tokenSwap,
  //   authority,
  //   receiver.publicKey,
  //   tokenA.receiverTokenAccount,
  //   tokenAccountA,
  //   tokenAccountB,
  //   tokenB.receiverTokenAccount,
  //   poolToken,
  //   feeAccount,
  //   null, // there is no host fee account!

  //   swapProgramId,
  //   TOKEN_PROGRAM_ID,
  //   TOKEN_PROGRAM_ID,
  //   poolTokenProgramId,
  //   amountToSwap,
  //   0 // allow a minimum amount of 0 tokens in return; 0 not recommended for production apps!

  //   mintA,
  //   mintB,
  // );

  // swap transaction using the current JS swap library
  const ixLegacy = TokenSwap.swapInstruction(
    tokenSwap,
    authority,
    receiver.publicKey,
    tokenA.receiverTokenAccount,
    tokenAccountA,
    tokenAccountB,
    tokenB.receiverTokenAccount,
    poolToken,
    feeAccount,
    null, // there is no host fee account!
    swapProgramId,
    TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    poolTokenProgramId,
    amountToSwap,
    0 // allow a minimum amount of 0 tokens in return; 0 not recommended for production apps!
  );

  // console.log(ixLegacy);
  transaction.add(ixLegacy);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("Sending via 'legacy' transaction...");

  // console.log("Legacy byte length:", transaction.serialize().byteLength());

  // send a legacy 'transaction'
  txid = await web3.sendAndConfirmTransaction(connection, transaction, [
    // payer,
    receiver,
  ]);

  console.log(
    `Legacy swap transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  //   depositSingleTokenTypeExactAmountIn(userAccount, poolAccount, sourceTokenProgramId, userTransferAuthority, sourceTokenAmount, minimumPoolTokenAmount, confirmOptions) {
  //     return __awaiter(this, void 0, void 0, function* () {
  //         return yield (0, web3_js_1.sendAndConfirmTransaction)(this.connection, new web3_js_1.Transaction().add(
  //           TokenSwap.depositSingleTokenTypeExactAmountInInstruction(this.tokenSwap, this.authority, userTransferAuthority.publicKey, userAccount, this.tokenAccountA, this.tokenAccountB, this.poolToken, poolAccount, this.swapProgramId, sourceTokenProgramId, this.poolTokenProgramId, sourceTokenAmount, minimumPoolTokenAmount))
  //           , [this.payer, userTransferAuthority], confirmOptions);
  //     });
  // }

  // const keys = [];

  // // extract all the keys from the tokens and the token pool
  // let ixs = swapPool.instructions;
  // for (let i = 0; i < ixs.length; i++) {
  //   for (let j = 0; j < ixs[i].keys.length; j++) {
  //     keys.push(ixs[i].keys[j].pubkey);
  //     console.log(ixs[i].keys[j].pubkey.toBase58());
  //   }
  // }

  // console.log("Total keys found:", keys.length);

  return;

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    generate 2 addresses
    airdrop sol to one
    create a ALT
    extend it with these two address
    create a v0 instruction
  */

  // create a "throw away" wallet for testing
  let toAccount = web3.Keypair.generate();
  console.log("Generated `toAccount` address:", toAccount.publicKey.toBase58());

  // create a random extra "throw away" wallet for testing
  let tokenSwapStateAccount = web3.Keypair.generate();
  console.log(
    "Generated `tokenSwapStateAccount` address:",
    tokenSwapStateAccount.publicKey.toBase58()
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("generate a lookup table");

  let [lookupTableInst, lookupTableAddress] =
    web3.AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: slot,
    });

  console.log("table address:", lookupTableAddress.toBase58());

  //   console.log(
  //     `https://explorer.solana.com/address/${lookupTableAddress.toBase58()}?cluster=${SOLANA_CLUSTER}`
  //   );

  // create the listing of accounts to add to the ALT

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);

  // create extend instruction
  let extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    authority: payer.publicKey,
    lookupTable: lookupTableAddress,
    addresses: [
      payer.publicKey,
      toAccount.publicKey,
      tokenSwapStateAccount.publicKey,
      // randomly generate some extra keys for the ALT
      web3.Keypair.generate().publicKey,
      web3.Keypair.generate().publicKey,
      web3.Keypair.generate().publicKey,
      web3.Keypair.generate().publicKey,
      web3.Keypair.generate().publicKey,
      web3.SystemProgram.programId,
    ],
  });

  // create the message for creating the lookup table
  let message = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [lookupTableInst, extendInstruction],
  }).compileToV0Message();

  // create and sign the transaction
  transaction = new web3.VersionedTransaction(message);
  transaction.sign([payer]);

  //
  console.log("Send the transaction to create the lookup table:");
  let txid = await sendTransactionV0(transaction);
  console.log("\n");

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // console.log(
  //   "\n\n--------------------------------------------------------------"
  // );
  // console.log("--------------------------------------------------------------");
  // console.log("--------------------------------------------------------------");
  // console.log("\n");

  const lookupTableAccount = await connection
    .getAddressLookupTable(lookupTableAddress)
    .then((res) => res.value);
  // let lookupTable = web3.AddressLookupTableAccount();

  console.log("Table from cluster:");
  console.log(lookupTableAccount);

  // display all the addresses in the table
  for (let i = 0; i < lookupTableAccount.state.addresses.length; i++) {
    let key = lookupTableAccount.state.addresses[i];
    console.log(i, key.toBase58());
  }

  console.log("\n");
  console.log("--------------------------------------------------------------");
  // console.log("cluster version:", version);

  console.log("Generated `toAccount` address:", toAccount.publicKey.toBase58());
  console.log("Generated `payer` address:", payer.publicKey.toBase58());

  console.log("lookup table account:", lookupTableAddress.toBase58());
  console.log(
    "Addresses found in table:",
    lookupTableAccount.state.addresses.length
  );

  console.log(
    "--------------------------------------------------------------\n"
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // console.log("waiting for 10 seconds");
  // await new Promise((resolve) => setTimeout(resolve, 10_000));

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const instructions = [];

  /*
    Create a new v0 transaction that uses the lookup table in it
  */

  return;

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create a simple v0 transaction that uses the lookupTable (sort of)
  */

  // const transferMsg = new web3.TransactionMessage({
  //   payerKey: payer.publicKey,
  //   recentBlockhash: blockhash,
  //   instructions: [
  //     web3.SystemProgram.transfer({
  //       fromPubkey: payer.publicKey,
  //       toPubkey: toAccount.publicKey,
  //       lamports: minRent,
  //     }),
  //   ],
  // }).compileToV0Message([lookupTableAccount]);

  // const transferTx = new web3.VersionedTransaction(transferMsg);
  // transferTx.sign([payer]);

  // console.log(
  //   "\n-------------------------------------------------------------"
  // );
  // console.log("transferTx: ");
  // console.log(transferTx);

  // // return;

  // await sendTransactionV0(transferTx);

  // console.log(
  //   "\n-------------------------------------------------------------"
  // );
  // // console.log("Get the transaction from the cluster");
  // await getTransactionV0(txid);
}

// run our code, allowing use of Promises
main();
