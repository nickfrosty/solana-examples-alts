// import the Solana web3.js library
const web3 = require("@solana/web3.js");
const fs = require("fs");

//
const DEFAULT_DIR_NAME = "keys";

async function getTransactionV0(connection, txid) {
  console.log("get the transaction from the cluster:\n");
  const getTx = await connection.getTransaction(txid, {
    maxSupportedTransactionVersion: 0,
  });
  console.log(getTx);
  return getTx;
}

function loadSavedTokenProfile(tokenName, dirName = DEFAULT_DIR_NAME) {
  // create the `${dirName}` directory exists
  if (!fs.existsSync(`./${dirName}/`)) fs.mkdirSync(`./${dirName}/`);

  const fileName = `./${dirName}/${tokenName}.json`;

  if (fs.existsSync(fileName)) {
    let profile = JSON.parse(fs.readFileSync(fileName));

    // convert all the string keys to PublicKeys
    profile = {
      tokenMint: new web3.PublicKey(profile.tokenMint),
      tokenAccount: new web3.PublicKey(profile.tokenAccount),
      receiverTokenAccount: new web3.PublicKey(profile.receiverTokenAccount),
      amountMint: profile.amountMint,
      amountTransfer: profile.amountTransfer,
    };

    return profile;
  } else return false;
}

function loadSavedSwapPool(dirName = DEFAULT_DIR_NAME) {
  // create the `${dirName}` directory exists
  if (!fs.existsSync(`./${dirName}/`)) fs.mkdirSync(`./${dirName}/`);

  const fileName = `./${dirName}/swapPool.json`;

  if (fs.existsSync(fileName)) {
    let swapPool = JSON.parse(fs.readFileSync(fileName));

    // convert all the string keys to PublicKeys
    swapPool = {
      tokenSwap: new web3.PublicKey(swapPool?.tokenSwap || ""),
      swapProgramId: new web3.PublicKey(swapPool?.swapProgramId || ""),
      tokenProgramId: new web3.PublicKey(swapPool?.tokenProgramId || ""),
      poolToken: new web3.PublicKey(swapPool?.poolToken || ""),
      feeAccount: new web3.PublicKey(swapPool?.feeAccount || ""),
      authority: new web3.PublicKey(swapPool?.authority || ""),
      tokenAccountA: new web3.PublicKey(swapPool?.tokenAccountA || ""),
      tokenAccountB: new web3.PublicKey(swapPool?.tokenAccountB || ""),
      mintA: new web3.PublicKey(swapPool?.mintA || ""),
      mintB: new web3.PublicKey(swapPool?.mintB || ""),
    };

    return swapPool;
  } else return false;
}

function saveSwapPoolProfile(swapPool) {
  // convert the needed token profile values to their string values
  const profile = {
    tokenSwap: swapPool?.tokenSwap?.toBase58(),
    swapProgramId: swapPool?.swapProgramId?.toBase58(),
    tokenProgramId: swapPool?.tokenProgramId?.toBase58(),
    poolToken: swapPool?.poolToken?.toBase58(),
    feeAccount: swapPool?.feeAccount?.toBase58(),
    authority: swapPool?.authority?.toBase58(),
    tokenAccountA: swapPool?.tokenAccountA?.toBase58(),
    tokenAccountB: swapPool?.tokenAccountB?.toBase58(),
    mintA: swapPool?.mintA?.toBase58(),
    mintB: swapPool?.mintB?.toBase58(),

    // tokenMint: profile.tokenMint.toBase58(),
    // tokenAccount: profile.tokenAccount.toBase58(),
    // receiverTokenAccount: profile.receiverTokenAccount.toBase58(),
    // amountMint: profile.amountMint,
    // amountTransfer: profile.amountTransfer,
    // tokenProgram: profile.tokenProgram,
  };

  saveToJSON(profile, "swapPool");
}

function saveTokenProfile(name, profile) {
  // convert the needed token profile values to their string values
  profile = {
    tokenMint: profile.tokenMint.toBase58(),
    tokenAccount: profile.tokenAccount.toBase58(),
    receiverTokenAccount: profile.receiverTokenAccount.toBase58(),
    amountMint: profile.amountMint,
    amountTransfer: profile.amountTransfer,
    tokenProgram: profile.tokenProgram,
  };

  saveToJSON(profile, name);
}

function saveToJSON(content, fileName, dirName = DEFAULT_DIR_NAME) {
  fileName = `./${dirName}/${fileName}.json`;

  // create the `${dirName}` directory exists
  if (!fs.existsSync(`./${dirName}/`)) fs.mkdirSync(`./${dirName}/`);

  // remove the current JSON, if it already exists
  if (fs.existsSync(fileName)) fs.unlinkSync(fileName);

  // JSON-ify and save the `content`
  fs.writeFileSync(fileName, JSON.stringify(content));

  return;
}

function loadOrGenerateKeypair(keyName, dirName = DEFAULT_DIR_NAME) {
  // create the `${dirName}` directory exists
  if (!fs.existsSync(`./${dirName}/`)) fs.mkdirSync(`./${dirName}/`);

  const keyFile = `./${dirName}/${keyName}.json`;

  let key;

  // load in the saved keys from the file system
  if (fs.existsSync(keyFile)) {
    key = JSON.parse(fs.readFileSync(keyFile));

    // parse the JSON stored key file
    key = web3.Keypair.fromSecretKey(
      new Uint8Array(Object.values(key["_keypair"].secretKey))
    );

    console.log(`Loaded ${keyName} address:`, key.publicKey.toBase58());
  } else {
    key = web3.Keypair.generate();
    console.log(`Generated '${keyName}' address:`, key.publicKey.toBase58());

    // save the key file to the local file system
    saveToJSON(key, keyName);
  }

  return key;
}

/**
 * Auto airdrop of a balance of < 0.5 SOL
 */
async function airdropOnLowBalance(connection, key, foceAirdrop = false) {
  const balance = await connection.getBalance(key.publicKey);

  // check the balance of the two accounts, airdrop when low
  if (foceAirdrop === true || balance < web3.LAMPORTS_PER_SOL / 2) {
    console.log(`Requesting airdrop to ${key.publicKey.toBase58()}...`);
    let airdropSignature = await connection.requestAirdrop(
      key.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction({ signature: airdropSignature });
  } else console.log(`Balance of:`, balance / web3.LAMPORTS_PER_SOL);

  return balance;
}

module.exports = {
  getTransactionV0,
  saveTokenProfile,
  loadSavedTokenProfile,
  loadSavedSwapPool,
  saveSwapPoolProfile,
  loadOrGenerateKeypair,
  airdropOnLowBalance,
  saveToJSON,
};
