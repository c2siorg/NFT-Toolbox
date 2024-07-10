---
sidebar_position: 4
---

# Interact with Smart Contract

# Interact with Ethereum Contract

NFT Toolbox provides the functionality to interact with a deployed Smart Contract on a Blockchain Network.
This is done with `readEthereumContract` and `writeEthereumContract` functions.

Both the functions accept two parameters.

-   **(string)** The name of the Contract method to be called
-   **(array)** The parameters to be passed to the Contract method in order

`readEthereumContract` is used to call the _view_ methods on the Smart Contract which do not manipulate it's state.
It returns the response from the Smart Contract.

`writeEthereumContract` is used to call the methods on the Smart Contract which manipulate it's state.
It returns the [ethers.js](https://ethers.org/) transaction object created on the Contract.

## Example

**After [Deploying a Contract](/docs/Contracts/deploy) or [Initializing a Deployed Contract](/docs/Contracts/initializeContract#initialization-for-deployed-contract)**

```javascript
const exampleMintNFT = async () => {
	const address = "0xADDRESS";

	const tx = await nftToolbox.writeEthereumContract("safeMint", [address]);
	await tx.wait();

	const bal = await nftToolbox.readEthereumContract("balanceOf", [address]);
	console.log(bal.toString());
};

exampleMintNFT();
```

# Interact with Solana Contract

NFT Toolbox provides the functionality to interact with a deployed Smart Contract on a Blockchain Network.
Once your Solana contract is deployed, using the `readSolanaContract` and `writeSolanaContract` functions.


Both the functions accept two parameters.

-   **(string)** The name of the Contract method to be called
-   **(array)** The parameters to be passed to the Contract method in order

`readSolanaContract` is used to call view methods that don't modify the contract state.
It returns the response from the Smart Contract.

`writeSolanaContract`  is used to call methods that modify the contract state.
It returns a `Promise` that resolves to the transaction signature.

## Example

**After [Deploying a Contract](/docs/Contracts/deploy) or [Initializing a Deployed Contract](/docs/Contracts/initializeContract#initialization-for-deployed-contract)**


```javascript
import { PublicKey } from "@solana/web3.js";

const exampleMintNFT = async () => {
	const recipient = new PublicKey("RECIPIENT_ADDRESS");

	const tx = await nftToolbox.writeSolanaContract("mintSPLToken", [recipient, 1]);
	console.log("Transaction signature:", tx);

	const bal = await nftToolbox.readSolanaContract("getTokenBalance", [recipient]);
	console.log("Balance:", bal.toString());
};

exampleMintNFT();
```

:::note
The difference in parameters (`[address]` for `Ethereum` vs `[recipient, 1]` for `Solana`) is Ethereum's safeMint typically only requires an address, while Solana's mintSPLToken requires both a recipient address and an amount.
:::

