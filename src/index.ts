
import { Collection, LayerSchema } from "./classes/Collection";
import { Contract, ContractAttributes, DraftOptions } from "./classes/Contract";
import { FileStorage } from "./classes/FileStorage";
import { execSync } from "child_process";
import { Storj } from "./classes/Storj";

class Toolbox {

	private collection: Collection | undefined = undefined;
	private fileStorageService: FileStorage | undefined = undefined;
	private contract: Contract | undefined = undefined;

	initCollection(attr: { name: string; dir: string; description?: string }) {
		this.collection = new Collection({
			name: attr.name,
			dir: attr.dir,
			description: attr.description ? attr.description : "",
		});
	}

	generateNFTs(schema: LayerSchema) {
		if (!this.collection) {
			throw new Error("No Collection is initialized");
		}
		this.collection.setSchema(schema);
		this.collection.generate();
	}

	initFileStorageService(attr: {
		service: string;
		key?: string;
		secret?: string;
		username?: string;
		password?: string;
		currency?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
				this.fileStorageService = new FileStorage("ARWEAVE",{ arweavePrivateKey:attr.key }, "ar:/");
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
				this.fileStorageService = new FileStorage( "INFURA", {apiKey: attr.key, apiSecret: attr.secret}, "ipfs:/");
				break;
			case "pinata":
				if (!attr.key || !attr.secret) {
					throw new Error("Pinata API Key and Security required");
				}
				execSync("npm install @pinata/sdk", { stdio: [0, 1, 2] });
				this.fileStorageService = new FileStorage("PINATA", { apiKey: attr.key, apiSecret: attr.secret }, "ipfs:/");
				break;

			case "nft.storage":
				if (!attr.key) {
					throw new Error("NFT Storage API Key required");
				}
				execSync("npm install nft.storage files-from-path", {
					stdio: [0, 1, 2],
				});
				this.fileStorageService = new FileStorage("NFT.STORAGE", { token: attr.key }, "ipfs:/");
				break;

			default:
				throw new Error("Unknown File Storage Service");
		}
	}

	async uploadCollectionNFT() {
		if (!this.collection) {
			throw new Error("No Collection is initialized");
		}
		if (!this.fileStorageService) {
			throw new Error("No File Storage Service is initialized");
		}
		const response = await this.fileStorageService.uploadCollection(
			this.collection
		);
		return response;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async uploadSingleNFT(asset: string, metadata: any) {
		if (!this.fileStorageService) {
			throw new Error("No File Storage Service is initialized");
		}
		const response = await this.fileStorageService.uploadSingle(
			asset,
			metadata
		);
		return response;
	}

	initContract(attr: ContractAttributes) {
		this.contract = new Contract(attr);
	}

	draftContract(options: DraftOptions) {
		if (!this.contract) {
			throw new Error("No Contract is initialized");
		}
		this.contract.draft(options);
	}

	deployContract() {
		if (!this.contract) {
			throw new Error("No Contract is initialized");
		}
		this.contract.deploy();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async readContract(method: string, args: any[]) {
		if (!this.contract) {
			throw new Error("No Contract is initialized");
		}
		const res = await this.contract.read(method, args);
		return res;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async writeContract(method: string, args: any[]) {
		if (!this.contract) {
			throw new Error("No Contract is initialized");
		}
		const tx = await this.contract.write(method, args);
		return tx;
	}
}

export const nftToolbox = new Toolbox();
