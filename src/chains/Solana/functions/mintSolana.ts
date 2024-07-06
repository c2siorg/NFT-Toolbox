import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { PublicKey } from "@solana/web3.js";

nftToolbox.initSolanaContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
  deployed: {
    address: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
    programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
    programData: Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex"),
  },
});

nftToolbox.initSolanaCollection({
  name: "Demo Collection - Solana",
  dir: path.join(__dirname, "Demo Collection - Solana"),
  description: "This is a demo collection for NFT Toolbox",
  programId: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
  account: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
});

const demoMintNFT = async () => {
  const recipientPublicKey = new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");
  const amountToMint = 1;

  let bal = await nftToolbox.readSolanaContract("getTokenBalance", [recipientPublicKey]);
  console.log("Balance before minting: ", bal.toString());

  console.log("Minting New Token");
  try {
    const signature = await nftToolbox.writeSolanaContract("mintSPLToken", [recipientPublicKey, amountToMint]);
    console.log("Transaction signature:", signature);
    console.log("Waiting for transaction confirmation...");

    bal = await nftToolbox.readSolanaContract("getTokenBalance", [recipientPublicKey]);
    console.log("Balance after minting: ", bal.toString());
  } catch (error) {
    console.error("Error minting NFT:", error);
  }
};

demoMintNFT();