import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { Keypair, Connection } from "@solana/web3.js";
import { Idl } from "@project-serum/anchor";

const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "..", "..", "connection.json")).toString()
);
const connectionConfig = config.solana;

const payer = Keypair.fromSecretKey(Uint8Array.from(connectionConfig.wallet.secretKey));
const connection = new Connection(connectionConfig.rpc, 'confirmed');

const idl: Idl = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "..", "idl.json"), "utf-8"));

nftToolbox.initSolanaContract({
    name: "DemoContract",
    symbol: "DEMO",
    dir: path.join(__dirname, "Contracts"),
    connection: {
        rpc: connectionConfig.rpc,
        network: connectionConfig.network,
        connection: connection,
        payer: payer,
        idl: idl
    },
    deployed: {
        address: connectionConfig.deployedAddress,
        programId: connectionConfig.programId,
    },
});

const demoMintSolanaNFT = async () => {
    try {
        const address = payer.publicKey;
        console.log("Minting New Token to:", address.toBase58());
        const tx = await nftToolbox.writeSolanaContract("mint_nft", [address.toBase58()]);
        console.log("Transaction signature:", tx);
    } catch (error) {
        console.error("Error in minting process:", error);
    }
};

demoMintSolanaNFT();