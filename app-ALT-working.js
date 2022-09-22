// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const token = require("@solana/spl-token");
const {
  TokenSwap,
  TOKEN_SWAP_PROGRAM_ID,
  TokenSwapLayout,
} = require("@solana/spl-token-swap");

// define our program ID and cluster to interact with
const SOLANA_CLUSTER = "devnet";
const SOLANA_CLUSTER_URL = web3.clusterApiUrl(SOLANA_CLUSTER);

// const SOLANA_CLUSTER = "localhost";
// const SOLANA_CLUSTER_URL = "http://localhost:8899";

let explorerUrl =
  SOLANA_CLUSTER === "devnet"
    ? "https://explorer.solana.com"
    : "http://localhost:3000";

// explorerUrl = "http://localhost:3000";

async function main() {
  console.log(
    "\n\n--------------------------------------------------------------------------------------------"
  );
  console.log(
    "--------------------------------------------------------------------------------------------"
  );
  console.log(
    "--------------------------------------------------------------------------------------------"
  );

  // create a new connection to the Solana blockchain
  const connection = new web3.Connection(SOLANA_CLUSTER_URL);
  const version = await connection.getVersion();
  // console.log("version:", version);

  const slot = await connection.getSlot();

  const block = await connection.getBlock(slot, {
    maxSupportedTransactionVersion: 0,
  });

  // calculate the min rent needed to keep account open
  let minRent = await connection.getMinimumBalanceForRentExemption(
    web3.NONCE_ACCOUNT_LENGTH
  );
  // console.log("min balance for rent exempt:", minRent);

  // console.log(block);

  blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);
  // console.log(recentBlockhash);

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

  //
  let payer = web3.Keypair.generate();
  console.log("Generated `payer` address:", payer.publicKey.toBase58());
  logAccountLink(payer);

  // fund the "throw away" wallet via an airdrop
  console.log(`\nRequesting airdrop to ${payer.publicKey.toBase58()}...`);
  let airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

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

  // if (SOLANA_CLUSTER === "devnet")
  //   console.log(
  //     `${explorerUrl}/address/${lookupTableAddress.toBase58()}?cluster=${SOLANA_CLUSTER}`
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
  let transaction = new web3.VersionedTransaction(message);
  transaction.sign([payer]);

  //
  console.log("Send the transaction to create the lookup table:");
  let txid = await sendTransaction(transaction);
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

  /*
    Create a simple v0 transaction that uses the lookupTable (sort of)
  */

  const transferMsg = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: toAccount.publicKey,
        lamports: minRent,
      }),
    ],
  }).compileToV0Message([lookupTableAccount]);

  const transferTx = new web3.VersionedTransaction(transferMsg);
  transferTx.sign([payer]);

  console.log(
    "\n-------------------------------------------------------------"
  );
  console.log("transferTx: ");
  console.log(transferTx);

  // return;

  await sendTransaction(transferTx);

  console.log(
    "\n-------------------------------------------------------------"
  );

  // console.log("Get the transaction from the cluster");
  await getTransaction(txid);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function sendTransaction(transaction) {
    // send the transaction to the cluster
    console.log("Sending transaction...");
    let txid = await web3.sendAndConfirmTransaction(connection, transaction);
    console.log("Transaction submitted:", txid);

    if (SOLANA_CLUSTER === "devnet")
      console.log(`${explorerUrl}/tx/${txid}?cluster=${SOLANA_CLUSTER}`);

    return txid;
  }

  async function getTransaction(txid) {
    console.log("get the transaction from the cluster:\n");
    const getTx = await connection.getTransaction(txid, {
      maxSupportedTransactionVersion: 0,
    });
    console.log(getTx);
    return getTx;
  }

  function logAccountLink(account) {
    if (SOLANA_CLUSTER === "devnet")
      console.log(
        `${explorerUrl}/address/${account.publicKey.toBase58()}?cluster=${SOLANA_CLUSTER}`
      );
  }
}

// run our code, allowing use of Promises
main();
