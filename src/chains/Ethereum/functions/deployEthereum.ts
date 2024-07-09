import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";

nftToolbox.initEthereumContract({
	name: "DemoContract",
	symbol: "DEMO",
	dir: path.join(__dirname, "Contracts"),
	standard: "ERC721",
	connection: JSON.parse(
		readFileSync(path.join(__dirname, "..", "..", "..", "connection.json")).toString()
	),
});

nftToolbox.draftEthereumContract({
	baseUri: "ipfs://exampleCID/",
	mintable: true,
	incremental: true,
});

nftToolbox.deployEthereumContract();
