import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { Keypair } from "@solana/web3.js";

const payer = Keypair.fromSecretKey(Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex"));
const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex");

nftToolbox.initSolanaContract({
    name: "DemoContract",
    symbol: "DEMO",
    dir: path.join(__dirname, "Contracts"),
    connection: JSON.parse(
        readFileSync(path.join(__dirname, "connection.json")).toString()
    ),
});

async function deploySolanaContract() {
    try {
        const programId = await nftToolbox.deploySolanaContract({
            payer: payer,
            programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
            programData: programData,
        });
        console.log(`Contract deployed successfully. Program ID: ${programId.toBase58()}`);
        console.log("SPL Token mint created.");
    } catch (error) {
        console.error("Error deploying contract:", error);
    }
}

deploySolanaContract();