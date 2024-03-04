import fs from "fs";
import Irys from "@irys/sdk";
import { FileStorage } from "./FileStorage";
import path from "path";
import BigNumber from "bignumber.js";
import mime from "mime";

export class Arweave extends FileStorage {
	serviceBaseURL = "ar:/";

	IRYS_URL = "https://arweave.devnet.irys.xyz";
	CONNECTION: Irys;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(currency: string, wallet: any) {
		super();
		this.CONNECTION = new Irys({
			network: "devnet",
			token: currency,
			key: wallet,
			config: { providerUrl: "https://rpc-mumbai.matic.today/" }
		});
	}

	async fundIrys(dataSize: number): Promise<void> {
		const price = this.CONNECTION.utils.toAtomic(dataSize);
		const balance = await this.CONNECTION.getLoadedBalance();
		// Multiply by 1.1 to make sure we don't run out of funds
		const adjustedPrice = price.multipliedBy(1.1);

		if (adjustedPrice.isGreaterThan(balance)) {
			console.log("Funding Irys Node");
			// console.log(adjustedPrice.toString(), balance.toString());

			await this.CONNECTION.fund(
				adjustedPrice.minus(balance).integerValue(BigNumber.ROUND_CEIL).toString()
			);
		}
	}

	async uploadDirToService(dir: fs.PathLike): Promise<string> {
		const dirSize = (directory: string) => {
			const files = fs.readdirSync(directory);
			const stats = files.map((file) =>
				fs.statSync(path.join(directory.toString(), file))
			);
			return stats.reduce((total, { size }) => total + size, 0);
		};
	
		await this.fundIrys(dirSize(dir.toString()));
	
		const response = await this.CONNECTION.uploadFolder(
			dir.toString()
		);
		//returns the manifest ID if successful.
	
		if (response && response.id) {
			return response.id;
		} else {
			console.error("Failed to upload directory:", response);
			throw new Error("Failed to upload directory");
		}
	}

	async uploadFileToService(file: fs.PathLike): Promise<string> {
		const data = await fs.promises.readFile(file);
		await this.fundIrys(data.byteLength);

		const contentType: string | null = mime.getType(file.toString());
		const transactionOptions = contentType
			? {
					tags: [{ name: "Content-Type", value: contentType }],
			  }
			: {};
		const response =
			await this.CONNECTION.uploadFile(
				data.toString(),
				transactionOptions
			);

		if (response && response.id) {
			return response.id;
		} else {
			console.error("Failed to upload file:", response);
			throw new Error("Failed to upload file");
		}
	}

	async uploadJSONToService(json: string): Promise<string> {
		const data = Buffer.from(json);
		await this.fundIrys(data.byteLength);

		const transactionOptions = {
			tags: [{ name: "Content-Type", value: "application/json" }],
		};
		const response =
			await this.CONNECTION.uploadFile(
				data.toString(),
				transactionOptions
			);

		if (response && response.id) {
			return response.id;
		} else {
			console.error("Failed to upload JSON:", response);
			throw new Error("Failed to upload JSON");
		}
	}
}