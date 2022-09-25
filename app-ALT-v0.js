// import the Solana web3.js library
const web3 = require("@solana/web3.js");

// const PROGRAM_ID = "5AQaXHRKmoZMuBem544ELfEAN2qe2y9PU8nnezvpgeP7";

// max of 30 in the same transaction as creating the lookup table?
const ACCOUNT_COUNTER = 3;

// define our program ID and cluster to interact with
// const SOLANA_CLUSTER = "devnet";
// const SOLANA_CLUSTER_URL = web3.clusterApiUrl(SOLANA_CLUSTER);

const SOLANA_CLUSTER = "localhost";
const SOLANA_CLUSTER_URL = "http://localhost:8899";

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
  let minimumAmount = await connection.getMinimumBalanceForRentExemption(
    web3.NONCE_ACCOUNT_LENGTH
  );
  // console.log("min balance for rent exempt:", minimumAmount);

  // console.log(block);

  blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);
  // console.log(recentBlockhash);

  // return;
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // let inst = new web3.TransactionInstruction({
  //   programId: web3.SystemProgram.programId,
  // });

  // console.log(inst);

  // return;

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // create a "throw away" wallet for testing
  let toAccount = web3.Keypair.generate();

  let payer = web3.Keypair.generate();
  console.log("Generated payer address:", payer.publicKey.toBase58());
  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `${explorerUrl}/address/${payer.publicKey.toBase58()}?cluster=${SOLANA_CLUSTER}`
    );

  // fund the "throw away" wallet via an airdrop
  console.log("\nRequesting airdrop...");
  let airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // log the signature to the console
  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `Airdrop complete: ${explorerUrl}/tx/${airdropSignature}?cluster=${SOLANA_CLUSTER}`
    );
  else console.log(`Airdrop complete.\n\n`);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  console.log("generate a lookup table");
  let [lookupTableInst, lookupTableAddress] =
    web3.AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: slot,
    });

  // console.log("\nResponse:");
  console.log("generated table address:", lookupTableAddress.toBase58());
  // console.log(lookupTableInst, "\n\n");
  // console.log(JSON.stringify(lookupTableInst));

  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `${explorerUrl}/address/${lookupTableAddress.toBase58()}?cluster=${SOLANA_CLUSTER}`
    );

  // return;

  /////////////////////////////////////////////////////////////////////////
  // log some account addresses

  // console.log("payer address:", payer.publicKey.toBase58());
  // console.log("table address:", lookupTableAddress.toBase58());

  // console.log("accounts added to lookup table:");
  // for (let i = 0; i < accounts.length; i++)
  //   console.log(i, accounts[i].toBase58());

  // return;

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  let instructions = [lookupTableInst];

  blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);

  // create the message for creating the lookup table
  let message = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  // create and sign the transaction
  let transaction = new web3.VersionedTransaction(message, [payer]);
  transaction.sign([payer]);

  console.log("\n-----------");
  console.log("Create the lookup table:");
  let txid = await sendTransaction(transaction);
  console.log("\n");

  let tmpAddresses = [];

  console.log("\n-----------");
  // await addAccountsToTable(lookupTableAddress, payer, tmpAddresses);
  await addAccountsToTable(lookupTableAddress, payer);

  // for (let i = 1; i < 1; i++) {
  //   console.log("\n-----------");
  //   console.log("counter:", i);

  //   // console.log("Add accounts to the lookup table:");
  //   await addAccountsToTable(lookupTableAddress, payer);

  //   console.log("waiting for 1 min");
  //   await new Promise((resolve) => setTimeout(resolve, 60_000));
  // }

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // const blockNew = await connection.getBlock(getTx.slot, {
  //   maxSupportedTransactionVersion: 0,
  // });
  // console.log("blockNew data:", blockNew);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  console.log(
    "\n\n--------------------------------------------------------------"
  );
  console.log("--------------------------------------------------------------");
  console.log("--------------------------------------------------------------");
  console.log("\n");

  let table = await connection
    .getAddressLookupTable(lookupTableAddress)
    .then((res) => res.value);
  // let lookupTable = web3.AddressLookupTableAccount();

  console.log(table);

  // display all the addresses in the table
  for (let i = 0; i < table.state.addresses.length; i++) {
    let key = table.state.addresses[i];
    console.log(i, key.toBase58());
  }

  // console.log("\n");
  console.log("Addresses found in table", table.state.addresses.length);
  // console.log("cluster version:", version);
  console.log("lookup table account:", lookupTableAddress.toBase58());

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // create an instruction to transfer SOL
  instructions = [];
  instructions.push(
    web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: lookupTableAddress,
      lamports: minimumAmount * table.state.addresses.length,
    })
  );

  blockhash = await connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);

  // console.log("\n-------------------------------------");
  // console.log("-------------------------------------");
  // console.log(table);
  // console.log("\n-------------------------------------");
  // console.log("-------------------------------------\n");

  // create the message for creating the lookup table
  console.log("\n\n---------------------------------------------");
  console.log("-------------- checker ----------------------");
  console.log("---------------------------------------------\n");
  message = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([table]);

  // return;

  // create a v0 transaction
  transaction = new web3.VersionedTransaction(message, [payer]);

  // have the `payer` sign the transaction
  transaction.sign([payer]);

  console.log("transaction to submit:");
  console.log(transaction);
  console.log("\n------------\n");

  txid = await sendTransaction(transaction);
  console.log("\n------------\n");
  await getTransaction(txid);

  // console.log("load the account again");
  // tableAccount = await connection.getAccountInfo(lookupTableAddress);
  // console.log(tableAccount);

  async function addAccountsToTable(lookupTable, payer, addresses) {
    console.log("add accounts to the lookup table");

    // generate a listing of random account `addresses`
    if (!addresses) {
      addresses = [];
      for (let i = 0; i < ACCOUNT_COUNTER; i++) {
        let key = web3.Keypair.generate().publicKey;
        // console.log(i, key.toBase58());
        addresses.push(key);
      }
    }

    if (!Array.isArray(addresses) || addresses.length <= 0)
      throw new Error("Account addresses were not found");

    // console.log("number of addresses:", addresses.length);

    blockhash = await connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    // create extend instruction
    let extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
      payer: payer.publicKey,
      authority: payer.publicKey,
      lookupTable,
      addresses,
    });

    // create the TransactionMessage
    let message = new web3.TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [extendInstruction],
    }).compileToV0Message();

    // create a v0 transaction
    let transaction = new web3.VersionedTransaction(message);
    // , [payer]

    // have the `payer` sign the transaction
    transaction.sign([payer]);

    let txid = await sendTransaction(transaction);
    return txid;
  }

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
}

// run our code, allowing use of Promises
main();
