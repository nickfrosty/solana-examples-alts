// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const { TokenSwap } = require("@solana/spl-token-swap");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

// load the local utility functions
const { loadOrGenerateKeypair, airdropOnLowBalance } = require("./utils");

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

  console.log(
    "\n\n-------------------------------------------------------------------"
  );
  console.log(
    "-------------------------------------------------------------------"
  );
  console.log(
    "-------------------------------------------------------------------\n"
  );

  console.log("Deposit liquidity...");

  const amountToSwap = 5;

  // create the swap deposit instruction
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

  console.log("swap program address:", swapProgramId.toBase58());
  console.log("pool token program address:", poolTokenProgramId.toBase58());
  console.log("token program:", TOKEN_PROGRAM_ID.toBase58());

  // console.log(ixLegacy);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  transaction = new web3.Transaction();
  transaction.add(ixLegacy);

  console.log("Swapping via 'legacy' transaction...");

  // console.log("Legacy byte length:", transaction.serialize().byteLength());

  // send a legacy 'transaction'
  txid = await web3.sendAndConfirmTransaction(connection, transaction, [
    // payer,
    receiver,
  ]);

  console.log(
    `Legacy swap transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );
}

// run our code, allowing use of Promises
main();
