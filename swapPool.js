// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const token = require("@solana/spl-token");
const {
  TokenSwap,
  TOKEN_SWAP_PROGRAM_ID,
  OLD_TOKEN_SWAP_PROGRAM_ID,
  CurveType,
} = require("@solana/spl-token-swap");

async function createSwapPool(
  connection,
  payer,
  receiver,
  tokenA,
  tokenB,
  airdrop = false
) {
  console.log(
    "\n\n---------------------------------------------------------------------------------------------------"
  );
  console.log("Create a swap pool");
  console.log(
    "---------------------------------------------------------------------------------------------------\n"
  );

  let txid;

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const tokenSwapAccount = web3.Keypair.generate();

  const minRent = await token.getMinimumBalanceForRentExemptAccount(connection);

  // init an empty transaction
  let transaction = new web3.Transaction();

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // fund the "payer" account via an airdrop (since it will pay for everything)
  if (airdrop) {
    console.log(`\nRequesting airdrop to ${payer.publicKey.toBase58()}...`);

    let airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      web3.LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(airdropSignature);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Derive the swap authority PDA account
  */

  console.log("swap program address:", TOKEN_SWAP_PROGRAM_ID.toBase58());
  console.log(
    "old swap program address:",
    OLD_TOKEN_SWAP_PROGRAM_ID.toBase58()
  );

  const [swapAuthority, bump] = await web3.PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID
  );

  console.log("Swap authority:", swapAuthority.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create the Token A minter
  */

  console.log("Locating TokenA ATA...");

  // let tokenAAccountAddress = await token.getAssociatedTokenAddress(
  //   tokenA.tokenMint, // mint
  //   swapAuthority, // owner
  //   true // allow owner off curve
  // );

  // console.log(tokenA.tokenMint.toBase58());

  let tokenAAccountAddress = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA.tokenMint,
    swapAuthority,
    true
  );
  // console.log("tokenAAccountAddress", tokenAAccountAddress);
  tokenAAccountAddress = tokenAAccountAddress.address;

  // return;

  // let tokenAAccountAddress = await token.createAccount(
  //   connection,
  //   payer,
  //   tokenA.tokenMint,
  //   swapAuthority
  // );

  // let tokenAAccountAddress = await token.getAssociatedTokenAddress(
  //   tokenA.tokenMint, // mint
  //   swapAuthority, // owner
  //   true // allow owner off curve
  // );

  console.log("Token A swap PDA:", tokenAAccountAddress.toBase58());

  // const tokenAAccountInstruction =
  //   token.createAssociatedTokenAccountInstruction(
  //     payer.publicKey, // payer
  //     tokenAAccountAddress, // ata
  //     swapAuthority, // owner
  //     tokenA.tokenMint // mint
  //   );

  // transaction.add(tokenAAccountInstruction);

  const txMintA = await token.mintTo(
    connection,
    payer,
    tokenA.tokenMint,
    tokenAAccountAddress,
    payer,
    100
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${txMintA}?cluster=devnet`
  );
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create the Token B minter
  */

  console.log("Locating TokenB ATA...");

  let tokenBAccountAddress = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB.tokenMint,
    swapAuthority,
    true
  );
  tokenBAccountAddress = tokenBAccountAddress.address;

  // let tokenBAccountAddress = await token.createAccount(
  //   connection,
  //   payer,
  //   tokenB.tokenMint,
  //   swapAuthority
  // );

  // let tokenBAccountAddress = await token.getAssociatedTokenAddress(
  //   tokenB.tokenMint, // mint
  //   swapAuthority, // owner
  //   true // allow owner off curve
  // );

  // const tokenBAccountInstruction =
  //   token.createAssociatedTokenAccountInstruction(
  //     payer.publicKey, // payer
  //     tokenBAccountAddress, // ata
  //     swapAuthority, // owner
  //     tokenB.tokenMint // mint
  //   );

  console.log("Token B swap PDA:", tokenBAccountAddress.toBase58());

  // transaction.add(tokenBAccountInstruction);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const txMintB = await token.mintTo(
    connection,
    payer,
    tokenB.tokenMint,
    tokenBAccountAddress,
    payer,
    100
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${txMintB}?cluster=devnet`
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // console.log("Init the token pool accounts...");

  // // send a legacy 'transaction'
  // txid = await web3.sendAndConfirmTransaction(connection, transaction, [
  //   payer,
  //   // tokenSwapAccount,
  // ]);

  // console.log(
  //   `Transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  // );

  // transaction = new web3.Transaction();

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
      Create the LP tokens mint
  */

  console.log("Creating the LP token's mint...");
  const poolTokenMint = await token.createMint(
    connection,
    payer,
    swapAuthority,
    null, // no freeze authority
    0
  );
  console.log("Pool mint:", poolTokenMint.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create the LP mint
  */

  console.log("Locating token pool account...");

  // let tokenAccountPool = await token.getOrCreateAssociatedTokenAccount(
  //   connection,
  //   payer,
  //   poolTokenMint,
  //   payer.publicKey,
  //   true
  // );
  // tokenAccountPool = tokenAccountPool.address;

  let tokenAccountPool = web3.Keypair.generate();
  // tokenAccountPool = await token.createAccount(
  //   connection,
  //   payer,
  //   poolTokenMint,
  //   swapAuthority,
  //   tokenAccountPool
  // );

  const createTokenAccountPoolInstruction = web3.SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: tokenAccountPool.publicKey,
    space: token.ACCOUNT_SIZE,
    lamports: minRent,
    programId: token.TOKEN_PROGRAM_ID,
  });
  const initializeTokenAccountPoolInstruction =
    token.createInitializeAccountInstruction(
      tokenAccountPool.publicKey,
      poolTokenMint,
      payer.publicKey
    );

  transaction.add(createTokenAccountPoolInstruction);
  transaction.add(initializeTokenAccountPoolInstruction);

  console.log("tokenAccountPool:", tokenAccountPool.publicKey.toBase58());

  // console.log("Init the pool's token account...");

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const feeOwner = new web3.PublicKey(
    "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
  );

  // console.log("Locating fee account...");
  // let feeAccount = await token.getAssociatedTokenAddress(
  //   poolTokenMint,
  //   feeOwner,
  //   true
  // );
  // const feeAccountIx = await token.createAssociatedTokenAccountInstruction(
  //   payer.publicKey,
  //   feeAccount,
  //   poolTokenMint,
  //   feeOwner
  // );
  // transaction.add(feeAccountIx);

  let feeAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    poolTokenMint,
    feeOwner,
    true
  );
  feeAccount = feeAccount.address;

  console.log("Token fee account:", feeAccount.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("Sending transaction...");

  // send a legacy 'transaction'
  txid = await web3.sendAndConfirmTransaction(connection, transaction, [
    payer,
    tokenAccountPool,
    // tokenSwapAccount,
  ]);

  console.log(
    `Pool transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  // console.log(`Minting some tokens to the pool...`);

  // const poolTokenMintTx = await token.mintTo(
  //   connection,
  //   payer,
  //   poolTokenMint,
  //   tokenAccountPool.publicKey,
  //   swapAuthority,
  //   1_000
  // );

  // console.log(
  //   `Transaction: https://explorer.solana.com/tx/${poolTokenMintTx}?cluster=devnet`
  // );

  // transaction = new web3.Transaction();

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Execute the full transaction to create the swap pool
  */

  // console.log("Create the fee account");

  // // send a legacy 'transaction'
  // txid = await web3.sendAndConfirmTransaction(connection, transaction, [
  //   payer,
  //   // feeAccount,
  // ]);

  // console.log(
  //   `Transfer transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  // );

  transaction = new web3.Transaction();

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
      Finally init the actual swap pool
  */

  console.log("Initialize the token swap...");

  const tokenSwap = await TokenSwap.createTokenSwap(
    connection,
    payer,
    tokenSwapAccount,
    swapAuthority,
    tokenAAccountAddress,
    tokenBAccountAddress,
    poolTokenMint,
    tokenA.tokenMint,
    tokenB.tokenMint,
    feeAccount,
    tokenAccountPool.publicKey,
    TOKEN_SWAP_PROGRAM_ID,
    token.TOKEN_PROGRAM_ID,

    0, // Trade fee numerator
    10_000, // Trade fee denominator
    5, // Owner trade fee numerator
    10_000, // Owner trade fee denominator
    0, // Owner withdraw fee numerator
    0, // Owner withdraw fee denominator
    20, // Host fee numerator
    100, // Host fee denominator
    CurveType.ConstantProduct // Curve type
  );

  // console.log(tokenSwap);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Execute the full transaction to create the swap pool
  */

  // // send a legacy 'transaction'
  // txid = await web3.sendAndConfirmTransaction(connection, transaction, [
  //   payer,
  //   // tokenSwapAccount,
  // ]);

  // console.log(
  //   `Transfer transaction: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  // );

  // return the things
  return tokenSwap;

  // return {
  //   tokenSwap,
  //   tokenSwapAccount,
  //   tokenAccountPool,
  //   swapAuthority,
  //   tokenAAccountAddress,
  //   tokenBAccountAddress,
  //   poolTokenMint,
  //   feeAccount,
  //   instructions: transaction.instructions,
  // };
}

// run our code, allowing use of Promises
// createSwapPool();

module.exports = {
  createSwapPool,
};
