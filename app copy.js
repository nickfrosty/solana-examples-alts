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
  console.log("version:", version);

  const slot = await connection.getSlot();

  const block = await connection.getBlock(slot, {
    // maxSupportedTransactionVersion: 0,
  });

  // console.log(block);

  let recentBlockhash = await connection.getLatestBlockhash();

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // generate a listing of keys
  let accounts = [];

  for (let i = 0; i < ACCOUNT_COUNTER; i++) {
    let key = web3.Keypair.generate().publicKey;
    // console.log(i, key.toBase58());
    accounts.push(key);
  }

  console.log("number of accounts:", accounts.length);

  // create a "throw away" wallet for testing
  let payer = web3.Keypair.generate();
  console.log("Generated payer address:", payer.publicKey.toBase58());

  // fund the "throw away" wallet via an airdrop
  console.log("Requesting airdrop...");
  let airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // log the signature to the console
  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `Airdrop complete: https://explorer.solana.com/tx/${airdropSignature}?cluster=${SOLANA_CLUSTER}`
    );
  else console.log(`Airdrop complete.\n\n`);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  let transactionOld = new web3.Transaction();

  console.log("create a lookup table");
  let [lookupTableInst, lookupTableAddress] =
    web3.AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: slot,
    });

  console.log("\nResponse:");
  console.log("table address:", lookupTableAddress.toBase58());
  console.log(lookupTableInst, "\n\n");
  console.log(JSON.stringify(lookupTableInst));

  // return;
  //

  console.log("add accounts to the lookup table");
  let extender = web3.AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    lookupTable: lookupTableAddress,
    authority: payer.publicKey,
    // PublicKey[]
    addresses: accounts,
  });
  console.log(extender, "\n\n");

  // console.log(JSON.stringify(extender));

  // return;

  transactionOld.add(lookupTableInst, extender);

  console.log("\n\nthe entire transaction to send:");
  console.log(transactionOld);

  // return;

  console.log("\n\nSending legacy transaction...");
  let txidOld = await web3.sendAndConfirmTransaction(
    connection,
    transactionOld,
    [payer]
  );
  console.log("Transaction submitted:", txidOld);

  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `https://explorer.solana.com/tx/${txidOld}?cluster=${SOLANA_CLUSTER}`
    );

  // return;
  // "49J7Pe1tZDpwYumsPLvfVg2kgbarshEykX2BCY54sNjZhM9oRWMr2w3CX8a6abo7AbLMLgqSpPzg9WePevuUUpUb",

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  const getTx = await connection.getTransaction(txidOld, {
    // maxSupportedTransactionVersion: 0,
  });
  console.log("get the transaction from the cluster\n", getTx);

  const blockNew = await connection.getBlock(getTx.slot, {
    // maxSupportedTransactionVersion: 0,
  });

  console.log("blockNew data:", blockNew);

  // console.log(getTx.transaction.message);
  // console.log(getTx.transaction.loadedAddresses);
  console.log(blockNew.transactions);
  console.log(blockNew.transactions[0].meta.loadedAddresses);

  // return;

  /////////////////////////////////////////////////////////////////////////
  // log some account addresses

  console.log("payer address:", payer.publicKey.toBase58());
  console.log("table address:", lookupTableAddress.toBase58());

  console.log("accounts added to lookup table:");
  for (let i = 0; i < accounts.length; i++)
    console.log(i, accounts[i].toBase58());

  // return;

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  let tableAccount = await connection.getAccountInfo(lookupTableAddress);
  console.log(tableAccount);

  // load the lookup table
  // console.log(table.isActive());

  // console.log(web3.AddressLookupTableAccount.deserialize(tableAccount.data));

  let table = await new web3.AddressLookupTableAccount({
    key: lookupTableAddress,
    state: web3.AddressLookupTableAccount.deserialize(tableAccount.data),
  });

  console.log(table);

  // return;

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  console.log("\n\n------------------------------------");
  console.log("------------------------------------");
  console.log("generate another round of address to add");

  transactionOld = new web3.Transaction();
  accounts = [];

  for (let i = 0; i < ACCOUNT_COUNTER; i++) {
    let key = web3.Keypair.generate().publicKey;
    // console.log(i, key.toBase58());
    accounts.push(key);
  }

  console.log("add accounts to the lookup table");
  extender = web3.AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    lookupTable: lookupTableAddress,
    authority: payer.publicKey,
    // PublicKey[]
    addresses: accounts,
  });
  console.log(extender, "\n\n");

  // console.log(JSON.stringify(extender));

  // return;

  transactionOld.add(extender);

  console.log("\n\nthe entire transaction to send:");
  console.log(transactionOld);

  // return;

  console.log("\n\nSending legacy transaction...");
  txidOld = await web3.sendAndConfirmTransaction(connection, transactionOld, [
    payer,
  ]);
  console.log("Transaction submitted:", txidOld);

  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `https://explorer.solana.com/tx/${txidOld}?cluster=${SOLANA_CLUSTER}`
    );

  console.log("load the account again");
  tableAccount = await connection.getAccountInfo(lookupTableAddress);
  console.log(tableAccount);

  // load the lookup table
  // console.log(table.isActive());

  // console.log(web3.AddressLookupTableAccount.deserialize(tableAccount.data));

  console.log(
    "\n\n--------------------------------------------------------------"
  );
  console.log("--------------------------------------------------------------");
  console.log("--------------------------------------------------------------");

  console.log("cluster version:", version);
  console.log("lookup table account:", lookupTableAddress.toBase58());

  let tableListing = web3.AddressLookupTableAccount.deserialize(
    tableAccount.data
  );

  console.log("accounts in the table:", tableListing.addresses.length);

  for (let i = 0; i < tableListing.addresses.length; i++)
    console.log(i, tableListing.addresses[i].toBase58());

  // console.log("update the table:");
  // table = await new web3.AddressLookupTableAccount({
  //   key: lookupTableAddress,
  //   state: web3.AddressLookupTableAccount.deserialize(tableAccount.data),
  // });

  // console.log(table);
  // console.log("address count:", table.state.addresses.length);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  return;

  // {
  //   addressTableLookups: MessageAddressTableLookup[];
  //   compiledInstructions: MessageCompiledInstruction[];
  //   header: MessageHeader;
  //   recentBlockhash: Blockhash;
  //   staticAccountKeys: PublicKey[]
  // }

  let messageV0Params = {
    accountKeys: [
      // fromPublicKey.publicKey.toString(),
      // toPublicKey.toString(),
      web3.SystemProgram.programId.toString(),
    ],
    header: {
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 0,
      numRequiredSignatures: 1,
    },
    instructions: [
      // {
      //   accounts: [0, 1],
      //   data: bs58.encode(data),
      //   programIdIndex: 2,
      // },
    ],
    recentBlockhash,
  };

  let messageV0 = new web3.MessageV0(messageV0Params);

  console.log(messageV0);

  /////////////////////////////////////////////////////////////////////////

  let transaction = new web3.VersionedTransaction(messageV0);

  console.log(transaction);

  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // let instruction = new web3.TransactionInstruction({
  //   keys: [
  //     {
  //       pubkey: payer.publicKey,
  //       isSigner: true,
  //       isWritable: false,
  //     },
  //     {
  //       pubkey: web3.SystemProgram.programId,
  //       isSigner: false,
  //       isWritable: false,
  //     },
  //   ],
  //   programId: new web3.PublicKey(PROGRAM_ID),
  // });

  // console.log(instruction);
  // // submit the transaction to the cluster

  return;

  console.log("Sending final transaction...");
  let txid = await web3.sendAndConfirmTransaction(connection, transaction, [
    payer,
  ]);
  console.log("Transaction submitted:", txid);

  if (SOLANA_CLUSTER === "devnet")
    console.log(
      `https://explorer.solana.com/tx/${txid}?cluster=${SOLANA_CLUSTER}`
    );
}

// run our code, allowing use of Promises
main();
