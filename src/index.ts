import { Collection as EthereumCollection, LayerSchema as EthereumLayerSchema } from "../src/chains/Ethereum/contracts/EthereumCollection";
import { LayerSchema as SolanaLayerSchema } from "../src/chains/Solana/contracts/SolanaCollection";
import { Collection as SolanaCollection } from "../src/chains/Solana/contracts/SolanaCollection";
import { Contract as SolanaContract, ContractAttributes as solanaContractAttributes, DraftOptions as solanaDraftOptions } from "../src/chains/Solana/contracts/SolanaContract";
import { Keypair, PublicKey } from '@solana/web3.js';

import { PathLike } from "fs";
import { Contract as EthereumContract, ContractAttributes as ethereumContractAttributes, DraftOptions as ethereumDraftOptions } from "../src/chains/Ethereum/contracts/EthereumContract";
import { FileStorage } from "../src/classes/FileStorage";
import { execSync } from "child_process";
import { Arweave } from "../src/classes/Arweave";
import { Infura } from "../src/classes/Infura";
import { Storj } from "../src/classes/Storj";
import { NFTstorage } from "../src/classes/NFTstorage";
import { Pinata } from "../src/classes/Pinata";

class Toolbox {
    private solanaCollection: SolanaCollection | undefined = undefined;
    private ethereumcollection: EthereumCollection | undefined = undefined;
    private fileStorageService: FileStorage | undefined = undefined;
    private ethereumcontract: EthereumContract | undefined = undefined;
    private solanacontract: SolanaContract | undefined = undefined;

    initEthereumContract(attr: ethereumContractAttributes) {
        this.ethereumcontract = new EthereumContract(attr);
    }

    draftEthereumContract(options: ethereumDraftOptions) {
        if (!this.ethereumcontract) {
            throw new Error("No Ethereum Contract is initialized");
        }
        this.ethereumcontract.draft(options);
    }

    initSolanaContract(attr: solanaContractAttributes) {
        this.solanacontract = new SolanaContract(attr);
    }

    draftSolanaContract(options: solanaDraftOptions) {
        if (!this.solanacontract) {
            throw new Error("No Solana Contract is initialized");
        }
        this.solanacontract.draft(options);
    }

    initEthereumCollection(attr: { name: string; dir: string; description?: string }) {
        this.ethereumcollection = new EthereumCollection({
            name: attr.name,
            dir: attr.dir,
            description: attr.description ? attr.description : "",
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
        if (!this.ethereumcollection) {
            throw new Error("No Ethereum Collection is initialized");
        }
        this.ethereumcollection.setSchema(schema);
        this.ethereumcollection.generate();
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
                    "npm install @irys-sdk/client bignumber.js mime @types/mime",
                    { stdio: [0, 1, 2] }
                );
                this.fileStorageService = new Arweave(
                    attr.currency,
                    attr.wallet
                );
                break;

            case "storj":
                if (!attr.username) {
                    throw new Error("STORJ Username required");
                }
                if (!attr.password) {
                    throw new Error("STORJ Password required");
                }
                execSync("npm install ndjson-parse", {
                    stdio: [0, 1, 2],
                });
                this.fileStorageService = new Storj(
                    attr.username,
                    attr.password
                );
                break;

            case "infura":
                if (!attr.username) {
                    throw new Error("INFURA Username required");
                }
                if (!attr.password) {
                    throw new Error("INFURA Password required");
                }
                execSync("npm install ndjson-parse", {
                    stdio: [0, 1, 2],
                });
                this.fileStorageService = new Infura(
                    attr.username,
                    attr.password
                );
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
                execSync("npm install nft.storage files-from-path", {
                    stdio: [0, 1, 2],
                });
                this.fileStorageService = new NFTstorage(attr.key);
                break;

            default:
                throw new Error("Unknown File Storage Service");
        }
    }

    async uploadEthereumCollectionNFT() {
        if (!this.ethereumcollection) {
            throw new Error("No Collection is initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("No File Storage Service is initialized");
        }
        const response = await this.fileStorageService.uploadEthereumCollection(
            this.ethereumcollection
        );
        return response;
    }

    async uploadSolanaCollectionNFT() {
        if (!this.solanaCollection) {
            throw new Error("No Collection is initialized");
        }
        if (!this.fileStorageService) {
            throw new Error("No File Storage Service is initialized");
        }
        const response = await this.fileStorageService.uploadSolanaCollection(
            this.solanaCollection
        );
        return response;
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
        if (!this.ethereumcontract) {
            throw new Error("No Contract is initialized");
        }
        this.ethereumcontract.deploy();
    }

    async deploySolanaContract(options: {
        payer: Keypair;
        programId: string;
        programData: Buffer;
    }) {
        if (!this.solanacontract) {
            throw new Error("No Solana Contract is initialized");
        }
        const programId = await this.solanacontract.deployContract(this.solanacontract.connection, options.payer);
        console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
        
        // Create SPL token mint after deploying the contract
        await this.solanacontract.createSPLTokenMint(
            this.solanacontract.connection,
            options.payer
        );
        return programId;
    }

    async readEthereumContract(method: string, args: any[]) {
        if (!this.ethereumcontract) {
            throw new Error("No Contract is initialized");
        }
        const res = await this.ethereumcontract.read(method, args);
        return res;
    }

    async writeEthereumContract(method: string, args: any[]) {
        if (!this.ethereumcontract) {
            throw new Error("No Contract is initialized");
        }
        const tx = await this.ethereumcontract.write(method, args);
        return tx;
    }

    async readSolanaContract(method: string, args: any[]) {
        if (!this.solanacontract) {
            throw new Error("No Solana Contract is initialized");
        }
        const res = await this.solanacontract.read(method, args);
        return res;
    }

    async writeSolanaContract(method: string, args: any[]) {
        if (!this.solanacontract) {
            throw new Error("No Solana Contract is initialized");
        }
        const tx = await this.solanacontract.write(method, args);
        return tx;
    }

    async mintSolanaNFT(recipient: PublicKey, amount: number = 1) {
        if (!this.solanacontract) {
            throw new Error("No Solana Contract is initialized");
        }
        if (!this.solanacontract.splTokenMint) {
            throw new Error("SPL Token mint not created yet");
        }
        await this.solanacontract.mintSPLToken(
            this.solanacontract.connection,
            this.solanacontract.payer,
            recipient,
            amount
        );
    }
}

export const nftToolbox = new Toolbox();