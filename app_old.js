// import the Solana web3.js library
const web3 = require("@solana/web3.js");

// define our program ID and cluster to interact with
const SOLANA_CLUSTER = "devnet";
const PROGRAM_ID = "5AQaXHRKmoZMuBem544ELfEAN2qe2y9PU8nnezvpgeP7";

async function main() {
  // create a new connection to the Solana blockchain
  const connection = new web3.Connection(web3.clusterApiUrl(SOLANA_CLUSTER));

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
  console.log(
    `Airdrop complete: https://explorer.solana.com/tx/${airdropSignature}?cluster=${SOLANA_CLUSTER}`
  );

  // create a simple transaction
  const transaction = new web3.Transaction().add(
    new web3.TransactionInstruction({
      keys: [
        {
          pubkey: payer.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: new web3.PublicKey(PROGRAM_ID),
    })
  );
  // submit the transaction to the cluster
  console.log("Sending transaction...");
  let txid = await web3.sendAndConfirmTransaction(connection, transaction, [
    payer,
  ]);
  console.log(
    "Transaction submitted:",
    `https://explorer.solana.com/tx/${txid}?cluster=${SOLANA_CLUSTER}`
  );
}

// run our code, allowing use of Promises
main();
