// import the Solana web3.js library
const web3 = require("@solana/web3.js");

// const PROGRAM_ID = "5AQaXHRKmoZMuBem544ELfEAN2qe2y9PU8nnezvpgeP7";

// max of 30 in the same transaction as creating the lookup table?
const ACCOUNT_COUNTER = 30;

// define our program ID and cluster to interact with
const SOLANA_CLUSTER = "devnet";
const SOLANA_CLUSTER_URL = web3.clusterApiUrl(SOLANA_CLUSTER);

// const SOLANA_CLUSTER = "localhost";
// const SOLANA_CLUSTER_URL = "http://localhost:8899";

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

  // console.log(block);

  let recentBlockhash = await connection.getLatestBlockhash();
  console.log(recentBlockhash);
  // return;
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // generate a listing of keys
  // let accounts = [];

  // for (let i = 0; i < ACCOUNT_COUNTER; i++) {
  //   let key = web3.Keypair.generate().publicKey;
  //   // console.log(i, key.toBase58());
  //   accounts.push(key);
  // }

  // console.log("number of accounts:", accounts.length);

  // create a "throw away" wallet for testing
  let toAccount = web3.Keypair.generate();

  let payer = web3.Keypair.generate();
  console.log("Generated payer address:", payer.publicKey.toBase58());

  // fund the "throw away" wallet via an airdrop
  console.log("Requesting airdrop...");
  let airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction({ signature: airdropSignature });

  // log the signature to the console
  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `Airdrop complete: https://explorer.solana.com/tx/${airdropSignature}?cluster=${SOLANA_CLUSTER}`
    );
  else console.log(`Airdrop complete.\n\n`);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // console.log("create a lookup table");
  // let [lookupTableInst, lookupTableAddress] =
  //   web3.AddressLookupTableProgram.createLookupTable({
  //     authority: payer.publicKey,
  //     payer: payer.publicKey,
  //     recentSlot: slot,
  //   });

  // console.log("\nResponse:");
  // console.log("table address:", lookupTableAddress.toBase58());
  // console.log(lookupTableInst, "\n\n");
  // console.log(JSON.stringify(lookupTableInst));

  // // return;
  // //

  // console.log("add accounts to the lookup table");
  // let extender = web3.AddressLookupTableProgram.extendLookupTable({
  //   payer: payer.publicKey,
  //   lookupTable: lookupTableAddress,
  //   authority: payer.publicKey,
  //   // PublicKey[]
  //   addresses: accounts,
  // });
  // console.log(extender, "\n\n");

  // return;

  // let transactionOld = new web3.Transaction();
  // transactionOld.add(lookupTableInst, extender);

  // console.log("\n\nthe entire transaction to send:");
  // console.log(transactionOld);

  // return;

  /////////////////////////////////////////////////////////////////////////
  // log some account addresses

  // console.log("payer address:", payer.publicKey.toBase58());
  // console.log("table address:", lookupTableAddress.toBase58());

  // console.log("accounts added to lookup table:");
  // for (let i = 0; i < accounts.length; i++)
  //   console.log(i, accounts[i].toBase58());

  // return;

  let minimumAmount = await connection.getMinimumBalanceForRentExemption(0);
  console.log("min for rent:");
  console.log(minimumAmount);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  let instructions = [];

  instructions.push(
    web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: toAccount.publicKey,
      lamports: minimumAmount,
    })
  );

  console.log("instructions listing:");
  // console.log(instructions);

  // return;

  let message = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: recentBlockhash.blockhash,
    instructions,
  }).compileToV0Message();

  console.log("\nMessage:");
  // console.log(message);

  // console.log("compiled to v0");
  // console.log(message.compileToV0Message());

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  let transaction = new web3.VersionedTransaction(message);
  // , [payer]

  console.log("\n-------------------------------");
  console.log("initial transaction:\n");
  console.log(transaction);

  // return;
  // console.log("\n-----------------");
  // console.log("signatures:");
  // console.log(transaction.signatures);

  console.log("\n-----------------");
  console.log("signing:");
  transaction.sign([payer]);
  console.log("signed transaction:");
  // console.log(transaction);

  // return;

  console.log("Sending transaction...");
  let txid = await connection.sendTransaction(transaction);
  // let txid = await web3.sendAndConfirmTransaction(connection, transaction);
  console.log("Transaction submitted:", txid);

  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `https://explorer.solana.com/tx/${txid}?cluster=${SOLANA_CLUSTER}`
    );

  return;

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // return;

  const getTx = await connection.getTransaction(txid, {
    maxSupportedTransactionVersion: 0,
  });
  console.log("get the transaction from the cluster:\n", getTx);

  const blockNew = await connection.getBlock(getTx.slot, {
    maxSupportedTransactionVersion: 0,
  });

  console.log("blockNew data:", blockNew);

  // console.log(getTx.transaction.message);
  // console.log(getTx.transaction.loadedAddresses);
  // console.log(blockNew.transactions);
  // console.log(blockNew.transactions[0].meta.loadedAddresses);

  // return;
}

// run our code, allowing use of Promises
main();
