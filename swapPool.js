// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const token = require("@solana/spl-token");
const {
  TokenSwap,
  TOKEN_SWAP_PROGRAM_ID,
  CurveType,
} = require("@solana/spl-token-swap");

const { loadSavedSwapPool, saveSwapPoolProfile } = require("./utils");

const mintAmount = 10_000;

async function createSwapPool(
  connection,
  payer,
  receiver,
  tokenA,
  tokenB,
  airdrop = false
) {
  // attempt to load a saved token mint
  const loadedPool = loadSavedSwapPool();
  if (loadedPool) {
    // ensure the loaded pool matches the current tokens
    if (
      loadedPool.mintA.toBase58() === tokenA.tokenMint.toBase58() &&
      loadedPool.mintB.toBase58() === tokenB.tokenMint.toBase58()
    ) {
      console.log(`Swap pool loaded:`, loadedPool.tokenSwap.toBase58());
      return loadedPool;
    }
  }

  console.log(
    "\n---------------------------------------------------------------------------------------------------"
  );
  console.log("Create a full token swap pool");
  console.log(
    "---------------------------------------------------------------------------------------------------\n"
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // fund the "payer" account via an airdrop (since it will pay for everything)
  if (airdrop) {
    console.log(`\nRequesting airdrop to ${payer.publicKey.toBase58()}...`);

    let airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      web3.LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction({ signature: airdropSignature });
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // generate a random, throw away wallet to be the owner of the swap pool
  const tokenSwapAccount = web3.Keypair.generate();

  /*
    Derive the swap authority PDA account
  */

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

  console.log("Locating TokenA ATA owned by the swap...");

  let tokenAAccountAddress = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA.tokenMint,
    swapAuthority,
    true
  );

  // store only the PublicKey of the address
  tokenAAccountAddress = tokenAAccountAddress.address;

  console.log("Swap PDA owned TokenA ATA:", tokenAAccountAddress.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("Minting TokenA tokens to the swap's TokenA ATA...");

  const txMintA = await token.mintTo(
    connection,
    payer,
    tokenA.tokenMint,
    tokenAAccountAddress,
    payer,
    mintAmount // amount of tokens to mint
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${txMintA}?cluster=devnet`
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create the Token B minter
  */

  console.log("Locating TokenB ATA owned by the swap...");

  let tokenBAccountAddress = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB.tokenMint,
    swapAuthority,
    true
  );

  // store only the PublicKey address
  tokenBAccountAddress = tokenBAccountAddress.address;

  console.log("Swap PDA owned TokenB ATA:", tokenBAccountAddress.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("Minting TokenB tokens to the swap's TokenB ATA...");

  const txMintB = await token.mintTo(
    connection,
    payer,
    tokenB.tokenMint,
    tokenBAccountAddress,
    payer,
    mintAmount // amount of tokens to mint
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${txMintB}?cluster=devnet`
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
      Create the LP tokens mint
  */

  console.log("\nCreating the liquidity pool token's mint...");

  const poolTokenMint = await token.createMint(
    connection,
    payer,
    swapAuthority,
    null, // no freeze authority
    0 // decimals
  );

  console.log("Swap pool's mint address:", poolTokenMint.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Create the LP mint
  */

  console.log("Locating swap owned, pool token's ATA...");

  let tokenAccountPool = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    poolTokenMint,
    payer.publicKey,
    true
  );
  tokenAccountPool = tokenAccountPool.address;

  console.log("Swap owned pool token ATA:", tokenAccountPool.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // define the `feeOwner` address (this is set by the creators of the Swap program)

  const feeOwner = new web3.PublicKey(
    "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
  );

  console.log("Locating fee owner's pool token ATA...");

  let feeAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    poolTokenMint,
    feeOwner,
    true
  );

  // store only the PublicKey
  feeAccount = feeAccount.address;

  console.log("Fee owner's ATA:", feeAccount.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
      Finally init the actual swap pool between TokenA and TokenB
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
    tokenAccountPool,
    TOKEN_SWAP_PROGRAM_ID,
    token.TOKEN_PROGRAM_ID,

    0, // Trade fee numerator
    1000, // Trade fee denominator
    5, // Owner trade fee numerator
    1000, // Owner trade fee denominator
    0, // Owner withdraw fee numerator
    0, // Owner withdraw fee denominator
    20, // Host fee numerator
    100, // Host fee denominator
    CurveType.ConstantProduct // Curve type
  );

  // locally cache the pool info
  saveSwapPoolProfile(tokenSwap);

  return tokenSwap;
}

module.exports = {
  createSwapPool,
};
