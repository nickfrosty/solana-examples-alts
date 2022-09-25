// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const token = require("@solana/spl-token");

// load the local utility functions
const {
  loadOrGenerateKeypair,
  airdropOnLowBalance,
  loadSavedTokenProfile,
  saveToJSON,
  saveTokenProfile,
} = require("./utils");

// define base constants
const decimal = 0;
const amountMint = 100_000;
const amountTransfer = 1_000;

async function createFullTokenMint(
  connection,
  tokenName,
  payer,
  receiver,
  airdrop = false
) {
  // attempt to load a saved token mint
  const loadedMint = loadSavedTokenProfile(tokenName);
  if (loadedMint) {
    console.log(
      `Mint loaded for ${tokenName}:`,
      loadedMint.tokenMint.toBase58()
    );
    return loadedMint;
  }

  console.log(
    "\n\n---------------------------------------------------------------------------------------------------"
  );
  console.log("Generate a full token mint");
  console.log(
    "---------------------------------------------------------------------------------------------------\n"
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /*
    Generate a `payer` and `receiver` accounts
  */
  if (!payer) payer = loadOrGenerateKeypair("payer");
  else console.log("Provided `payer` address:", payer.publicKey.toBase58());

  if (!receiver) receiver = loadOrGenerateKeypair("receiver");
  else
    console.log("Provided `receiver` address:", receiver.publicKey.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  if (airdrop) await airdropOnLowBalance(connection, payer, true);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // generate a token mint
  console.log("\nCreating token mint...");

  const tokenMint = await token.createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    decimal,
    undefined,
    undefined,
    token.TOKEN_PROGRAM_ID
  );

  console.log("Token mint address:", tokenMint.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log("\nCreating token account...");

  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    payer.publicKey,
    undefined,
    undefined,
    undefined,
    token.TOKEN_PROGRAM_ID
  );

  console.log("Token Account address:", tokenAccount.address.toBase58());

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log(
    `\nMinting ${amountMint.toLocaleString()} tokens to 'tokenAccount'...`
  );

  const txMint = await token.mintTo(
    connection,
    payer,
    tokenMint,
    tokenAccount.address,
    payer,
    amountMint,
    undefined,
    undefined,
    token.TOKEN_PROGRAM_ID
  );

  console.log(
    `Mint token transaction: https://explorer.solana.com/tx/${txMint}?cluster=devnet`
  );

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // create a token account for the given `receiver`, funded by the payer
  console.log("\nCreating associated token account for `receiver`...");

  const receiverTokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    receiver.publicKey,
    undefined,
    undefined,
    undefined,
    token.TOKEN_PROGRAM_ID
  );

  console.log(
    "Token account address:",
    receiverTokenAccount.address.toBase58()
  );

  console.log(
    `Transferring ${amountTransfer} tokens to receiver's token account...`
  );

  const txTransfer = await token.transfer(
    connection,
    payer,
    tokenAccount.address,
    receiverTokenAccount.address,
    payer,
    amountTransfer,
    undefined,
    undefined,
    token.TOKEN_PROGRAM_ID
  );

  console.log(
    `Transfer transaction: https://explorer.solana.com/tx/${txTransfer}?cluster=devnet`
  );

  // return all the things
  const fullTokenMint = {
    tokenMint,
    tokenAccount: tokenAccount.address,
    receiverTokenAccount: receiverTokenAccount.address,
    amountMint,
    amountTransfer,
    tokenProgram: token.TOKEN_PROGRAM_ID,
  };

  // locally cache the token addresses
  saveTokenProfile(tokenName, fullTokenMint);

  return fullTokenMint;
}

// run our code, allowing use of Promises
// createFullTokenMint();

module.exports = {
  createFullTokenMint,
};
