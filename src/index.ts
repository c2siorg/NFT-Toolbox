import { Collection as EthereumCollection, LayerSchema as EthereumLayerSchema } from "../src/chains/Ethereum/contracts/EthereumCollection";
import { Collection as SolanaCollection, LayerSchema as SolanaLayerSchema } from "../src/chains/Solana/contracts/SolanaCollection";
import { Contract as SolanaContract, ContractAttributes as SolanaContractAttributes, DraftOptions as SolanaDraftOptions } from "../src/chains/Solana/contracts/SolanaContract";
import { Keypair, PublicKey } from '@solana/web3.js';

import { PathLike } from "fs";
import { Contract as EthereumContract, ContractAttributes as EthereumContractAttributes, DraftOptions as EthereumDraftOptions } from "../src/chains/Ethereum/contracts/EthereumContract";
import { FileStorage } from "../src/classes/FileStorage";
import { execSync } from "child_process";
import { Arweave } from "../src/classes/Arweave";
import { Infura } from "../src/classes/Infura";
import { Storj } from "../src/classes/Storj";
import { NFTstorage } from "../src/classes/NFTstorage";
import { Pinata } from "../src/classes/Pinata";

class Toolbox {
    private solanaCollection: SolanaCollection | undefined = undefined;
    private ethereumCollection: EthereumCollection | undefined = undefined;
    private fileStorageService: FileStorage | undefined = undefined;
    private ethereumContract: EthereumContract | undefined = undefined;
    private solanaContract: SolanaContract | undefined = undefined;


    initEthereumContract(attr: EthereumContractAttributes) {
        this.ethereumContract = new EthereumContract(attr);
    }

    draftEthereumContract(options: EthereumDraftOptions) {
        if (!this.ethereumContract) {
            throw new Error("No Ethereum Contract is initialized");
        }
        this.ethereumContract.draft(options);
    }

    initSolanaContract(attr: SolanaContractAttributes) {
        this.solanaContract = new SolanaContract(attr);
    }

    draftSolanaContract(options: SolanaDraftOptions) {
        if (!this.solanaContract) {
            throw new Error("No Solana Contract is initialized");
        }
        this.solanaContract.draft(options);
    }

    initEthereumCollection(attr: { name: string; dir: string; description?: string }) {
        this.ethereumCollection = new EthereumCollection({
            name: attr.name,
            dir: attr.dir,
            description: attr.description || "",
        });
    }

    initSolanaCollection(attr: { name: string; dir: string; description?: string; programId: PublicKey; account: PublicKey }) {
        this.solanaCollection = new SolanaCollection({
            name: attr.name,
            dir: attr.dir,
            description: attr.description ? attr.description : "",
            programId: attr.programId,
            account: attr.account,
        });
    }

    generateEthereumNFTs(schema: EthereumLayerSchema) {
        if (!this.ethereumCollection) {
            throw new Error("No Ethereum Collection is initialized");
        }
        this.ethereumCollection.setSchema(schema);
        this.ethereumCollection.generate();
    }

    generateSolanaNFTs(schema: SolanaLayerSchema) {
        if (!this.solanaCollection) {
            throw new Error("No Solana Collection is initialized");
        }
        this.solanaCollection.setSchema(schema);
        this.solanaCollection.generate();
    }

    initFileStorageService(attr: {
        service: string;
        key?: string;
        secret?: string;
        username?: string;
        password?: string;
        currency?: string;
        wallet?: any;
    }) {
        switch (attr.service) {
            case "arweave":
                if (!attr.wallet || !attr.currency) {
                    throw new Error("Arweave Currency and Wallet required");
                }
                execSync(
                    "npm install @bundlr-network/client bignumber.js mime @types/mime",
                    { stdio: [0, 1, 2] }
                );
                this.fileStorageService = new Arweave(attr.currency, attr.wallet);
                break;
            case "storj":
                if (!attr.username || !attr.password) {
                    throw new Error("STORJ Username and Password required");
                }
                execSync("npm install ndjson-parse", { stdio: [0, 1, 2] });
                this.fileStorageService = new Storj(attr.username, attr.password);
                break;
            case "infura":
                if (!attr.username || !attr.password) {
                    throw new Error("INFURA Username and Password required");
                }
                execSync("npm install ndjson-parse", { stdio: [0, 1, 2] });
                this.fileStorageService = new Infura(attr.username, attr.password);
                break;
            case "pinata":
                if (!attr.key || !attr.secret) {
                    throw new Error("Pinata API Key and Security required");
                }
                execSync("npm install @pinata/sdk", { stdio: [0, 1, 2] });
                this.fileStorageService = new Pinata(attr.key, attr.secret);
                break;
            case "nft.storage":
                if (!attr.key) {
                    throw new Error("NFT Storage API Key required");
                }
                execSync("npm install nft.storage files-from-path", { stdio: [0, 1, 2] });
                this.fileStorageService = new NFTstorage(attr.key);
                break;
            default:
                throw new Error("Unknown File Storage Service");
        }
    }

    async uploadEthereumCollectionNFT() {
        if (!this.ethereumCollection) {
            throw new Error("No Ethereum Collection is initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("No File Storage Service is initialized");
        }
        return await this.fileStorageService.uploadEthereumCollection(this.ethereumCollection);
    }

    async uploadSolanaCollectionNFT() {
        if (!this.solanaCollection) {
            throw new Error("No Solana Collection is initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("No File Storage Service is initialized");
        }
        return await this.fileStorageService.uploadSolanaCollection(this.solanaCollection);
    }

    async uploadSingleNFT(asset: PathLike, metadata: any) {
        if (!this.fileStorageService) {
            throw new Error("No File Storage Service is initialized");
        }
        const response = await this.fileStorageService.uploadSingle(
            asset,
            metadata
        );
        return response;
    }

    deployEthereumContract() {
        if (!this.ethereumContract) {
            throw new Error("No Ethereum Contract is initialized");
        }
        this.ethereumContract.deploy();
    }

    async deploySolanaContract(options: { payer: Keypair; programId: string; programData: Buffer }) {
        if (!this.solanaContract) {
            throw new Error("No Solana Contract is initialized");
        }
        const programId = await this.solanaContract.deploySolanaContract(this.solanaContract.connection, options.payer);
        console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
        return programId;
    }

    async readEthereumContract(method: string, args: any[]) {
        if (!this.ethereumContract) {
            throw new Error("No Ethereum Contract is initialized");
        }
        return await this.ethereumContract.read(method, args);
    }

    async writeEthereumContract(method: string, args: any[]) {
        if (!this.ethereumContract) {
            throw new Error("No Ethereum Contract is initialized");
        }
        return await this.ethereumContract.write(method, args);
    }

    async readSolanaContract(method: string, args: any[]) {
        if (!this.solanaContract) {
            throw new Error("No Solana Contract is initialized");
        }
        return await this.solanaContract.read(method, args);
    }

    async writeSolanaContract(method: string, args: any[]) {
        if (!this.solanaContract) {
            throw new Error("No Solana Contract is initialized");
        }
        return await this.solanaContract.write(method, args);
    }
}

export const nftToolbox = new Toolbox();