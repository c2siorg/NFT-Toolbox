import { Collection as EthereumCollection, LayerSchema as EthereumLayerSchema } from "./chains/Ethereum/contracts/EthereumCollection";
import { Collection as SolanaCollection, LayerSchema as SolanaLayerSchema } from "./chains/Solana/contracts/SolanaCollection";
import { Contract as EthereumContract, ContractAttributes as EthereumContractAttributes, DraftOptions as EthereumDraftOptions } from "./chains/Ethereum/contracts/EthereumContract";
import { Contract as SolanaContract, ContractAttributes as SolanaContractAttributes, DraftOptions as SolanaDraftOptions } from "./chains/Solana/contracts/SolanaContract";
import { FileStorage } from "./classes/FileStorage";
import { Arweave } from "./classes/Arweave";
import { Infura } from "./classes/Infura";
import { Storj } from "./classes/Storj";
import { NFTstorage } from "./classes/NFTstorage";
import { Pinata } from "./classes/Pinata";
import { Keypair, PublicKey } from '@solana/web3.js';
import { PathLike } from "fs";
import { execSync } from "child_process";

class NFTToolbox {
    private ethereumCollection?: EthereumCollection;
    private solanaCollection?: SolanaCollection;
    private ethereumContract?: EthereumContract;
    private solanaContract?: SolanaContract;
    private fileStorageService?: FileStorage;

    // Ethereum methods
    initEthereumContract(attr: EthereumContractAttributes): void {
        this.ethereumContract = new EthereumContract(attr);
    }

    draftEthereumContract(options: EthereumDraftOptions): void {
        if (!this.ethereumContract) {
            throw new Error("Ethereum Contract is not initialized");
        }
        this.ethereumContract.draft(options);
    }

    initEthereumCollection(attr: { name: string; dir: string; description?: string }): void {
        this.ethereumCollection = new EthereumCollection({
            name: attr.name,
            dir: attr.dir,
            description: attr.description || "",
        });
    }

    generateEthereumNFTs(schema: EthereumLayerSchema): void {
        if (!this.ethereumCollection) {
            throw new Error("Ethereum Collection is not initialized");
        }
        this.ethereumCollection.setSchema(schema);
        this.ethereumCollection.generate();
    }

    async deployEthereumContract(): Promise<void> {
        if (!this.ethereumContract) {
            throw new Error("Ethereum Contract is not initialized");
        }
        await this.ethereumContract.deploy();
    }

    async readEthereumContract(method: string, args: any[]): Promise<any> {
        if (!this.ethereumContract) {
            throw new Error("Ethereum Contract is not initialized");
        }
        return await this.ethereumContract.read(method, args);
    }

    async writeEthereumContract(method: string, args: any[]): Promise<any> {
        if (!this.ethereumContract) {
            throw new Error("Ethereum Contract is not initialized");
        }
        return await this.ethereumContract.write(method, args);
    }

    // Solana methods
    initSolanaContract(attr: SolanaContractAttributes): void {
        this.solanaContract = new SolanaContract(attr);
    }

    draftSolanaContract(options: SolanaDraftOptions): void {
        if (!this.solanaContract) {
            throw new Error("Solana Contract is not initialized");
        }
        this.solanaContract.draft(options);
    }

    initSolanaCollection(attr: { name: string; dir: string; description?: string; programId: PublicKey; account: PublicKey }): void {
        this.solanaCollection = new SolanaCollection({
            name: attr.name,
            dir: attr.dir,
            description: attr.description || "",
            programId: attr.programId,
            account: attr.account,
        });
    }

    generateSolanaNFTs(schema: SolanaLayerSchema): void {
        if (!this.solanaCollection) {
            throw new Error("Solana Collection is not initialized");
        }
        this.solanaCollection.setSchema(schema);
        this.solanaCollection.generate();
    }

    async deploySolanaContract(options: { payer: Keypair; programId: string; programData: Buffer }): Promise<PublicKey> {
        if (!this.solanaContract) {
            throw new Error("Solana Contract is not initialized");
        }
        const programId = await this.solanaContract.deployContract();
        console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
        
        await this.solanaContract.createSPLTokenMint();
        return programId;
    }
    async readSolanaContract(method: string, args: any[]): Promise<any> {
        if (!this.solanaContract) {
            throw new Error("Solana Contract is not initialized");
        }
        return await this.solanaContract.read(method, args);
    }

    async writeSolanaContract(method: string, args: any[]): Promise<any> {
        if (!this.solanaContract) {
            throw new Error("Solana Contract is not initialized");
        }
        return await this.solanaContract.write(method, args);
    }

    async mintSolanaNFT(recipient: PublicKey, amount: number = 1): Promise<void> {
        if (!this.solanaContract) {
            throw new Error("Solana Contract is not initialized");
        }
        await this.solanaContract.mintSPLToken(recipient, amount);
    }

    // File Storage methods
    public initFileStorageService(attr: {
        service: string;
        key?: string;
        secret?: string;
        username?: string;
        password?: string;
        currency?: string;
        wallet?: any;
    }): void {
        switch (attr.service.toLowerCase()) {
            case "arweave":
                if (!attr.wallet || !attr.currency) {
                    throw new Error("Arweave Currency and Wallet are required");
                }
                execSync("npm install @irys-sdk/client bignumber.js mime @types/mime", { stdio: [0, 1, 2] });
                this.fileStorageService = new Arweave(attr.currency, attr.wallet);
                break;
            case "storj":
                if (!attr.username || !attr.password) {
                    throw new Error("STORJ Username and Password are required");
                }
                execSync("npm install ndjson-parse", { stdio: [0, 1, 2] });
                this.fileStorageService = new Storj(attr.username, attr.password);
                break;
            case "infura":
                if (!attr.username || !attr.password) {
                    throw new Error("INFURA Username and Password are required");
                }
                execSync("npm install ndjson-parse", { stdio: [0, 1, 2] });
                this.fileStorageService = new Infura(attr.username, attr.password);
                break;
            case "pinata":
                if (!attr.key || !attr.secret) {
                    throw new Error("Pinata API Key and Secret are required");
                }
                execSync("npm install @pinata/sdk", { stdio: [0, 1, 2] });
                this.fileStorageService = new Pinata(attr.key, attr.secret);
                break;
            case "nft.storage":
                if (!attr.key) {
                    throw new Error("NFT Storage API Key is required");
                }
                execSync("npm install nft.storage files-from-path", { stdio: [0, 1, 2] });
                this.fileStorageService = new NFTstorage(attr.key);
                break;
            default:
                throw new Error("Unknown File Storage Service");
        }
    }

    async uploadEthereumCollectionNFT(): Promise<any> {
        if (!this.ethereumCollection) {
            throw new Error("Ethereum Collection is not initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("File Storage Service is not initialized");
        }
        return await this.fileStorageService.uploadEthereumCollection(this.ethereumCollection);
    }

    async uploadSolanaCollectionNFT(): Promise<any> {
        if (!this.solanaCollection) {
            throw new Error("Solana Collection is not initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("File Storage Service is not initialized");
        }
        return await this.fileStorageService.uploadSolanaCollection(this.solanaCollection);
    }

    async uploadSingleNFT(asset: PathLike, metadata: any): Promise<any> {
        if (!this.fileStorageService) {
            throw new Error("File Storage Service is not initialized");
        }
        return await this.fileStorageService.uploadSingle(asset, metadata);
    }
}

export const nftToolbox = new NFTToolbox();