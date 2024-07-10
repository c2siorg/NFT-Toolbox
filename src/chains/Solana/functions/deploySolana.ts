import path from "path";
import { nftToolbox } from "../../../index";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { Idl } from "@project-serum/anchor";
import { readFileSync } from "fs";

// Read the program ID from a file or environment variable
const PROGRAM_ID = new PublicKey("DuSu31wMA9kcdAg2d5idNoJWXkGFVR9CYxEoqkf1nqkq");

// Generate a new keypair for the payer
const payer = Keypair.generate();

// Initialize Solana connection (using devnet for this example)
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Read the IDL file
const idlFile = readFileSync(path.join(__dirname, "..", "..", "..", 'idl.json'), "utf-8");
const idl: Idl = JSON.parse(idlFile);

// Initialize Solana contract
nftToolbox.initSolanaContract({
    name: "DemoContract",
    symbol: "DEMO",
    dir: path.join(__dirname, "Contracts"),
    connection: {
        rpc: "https://api.devnet.solana.com",
        network: "devnet",
        connection: connection,
        payer: payer,
        idl: idl,
    },
});

async function deploySolanaContract() {
    try {        
        const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");  
        nftToolbox.draftSolanaContract({
            payer: payer,
            programId: PROGRAM_ID.toBase58(),
            programData: programData,
        });
                
        // deployment
        console.log(`Deploy program with ID: ${PROGRAM_ID.toBase58()}`);
        console.log(`Payer public key: ${payer.publicKey.toBase58()}`);
        console.log(`Program data length: ${programData.length} bytes`);
        console.log("Contract deployment completed.");
    } catch (error) {
        console.error("Error in contract deployment", error);
    }
}

deploySolanaContract();