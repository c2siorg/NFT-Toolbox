---
sidebar_position: 2
---

# Draft Contract File

The **ERC721** and **ERC1155** standards created by [Open Zeppelin](https://www.openzeppelin.com/contracts)
are the most popular NFT Contracts used by the community.
The [Open Zeppelin Wizard](https://wizard.openzeppelin.com/) is a tool that programatically generates
Smart Contracts based on provided configurations.

In addition to this, NFT-Toolbox also supports the **ERC998** and **ERC1151** standards. However, these standards are not currently supported by Open Zeppelin. 

To accommodate this, we have custom implementations of ERC998 and ERC1151. The custom implementation of ERC998 is based on the reference implementation provided by [Matt Lockyer's](https://github.com/mattlockyer/composables-998) GitHub repository.

NFT Toolbox provides the `draftContract` function that acts as an interface to Open Zeppelin Wizard.
Thus enabling users to generate Solidity Smart Contracts specifically to be used in their NFT projects.


## Parameters

:::info
The configurations listed below are directly passed to [Open Zeppelin Wizard](https://wizard.openzeppelin.com/).
See the platform to test the generated contract before using them in NFT Toolbox.
:::

The parameters of `initContract` function are described as follows.

| Name               | Type    | Standard Supported                         | Description                                |
| --------------     | ------- | -------------------------------------------| ------------------------------------------ |
| `baseUri`          | string  | `ERC721`,`ERC1155`,`ERC998`and `ERC1151`   | Base URI used in deployment                |
| `burnable`         | boolean | `ERC721`,`ERC1155`,`ERC998`and `ERC1151`   | Allow Tokens to be Burned                  |
| `pausable`         | boolean | `ERC721`,`ERC1155`,`ERC998`and `ERC1151`   | Allow Transactions to be Paused            |
| `mintable`         | boolean | `ERC721`,`ERC1155`,`ERC998`and `ERC1151`   | Allow minting of new tokens                |
| `enumerable`       | boolean | `ERC721`                                   | Allow enumerating the tokens on chain      |
| `uriStorage`       | boolean | `ERC721`                                   | Include Storage based URI management       |
| `incremental`      | boolean | `ERC721`                                   | Assign incremental id to new Tokens        |
| `votes`            | boolean | `ERC721`                                   | Include support for voting and delegation  |
| `composable`       | boolean | `ERC998`                                   | Enable composability of tokens             |
| `rootOwner`        | address | `ERC998`                                   | Address of the root owner                  |
| `rootId`           | uint256 | `ERC998`                                   | Root ID for the composable tokens          |
| `extension`        | address | `ERC998`                                   | Address of the ERC998 extension contract   |
| `extensionId`      | uint256 | `ERC998`                                   | Extension ID for the composable tokens     |
| `nftOwners`        | mapping | `ERC1151`                                  | Mapping for NFT owners                     |
| `ownerToNFTCount`  | mapping | `ERC1151`                                  | Mapping for owner NFT count                |
| `nftApprovals`     | mapping | `ERC1151`                                  | Mapping for NFT approvals                  |
| `nftBalances`      | mapping | `ERC1151`                                  | Mapping for NFT balances                   |
| `nftData`          | mapping | `ERC1151`                                  | Mapping for NFT data                       |
| `operatorApprovals`| mapping | `ERC1151`                                  | Mapping for operator approvals             |
| `supply`           | boolean | `ERC1155`                                  | Track Total Supply                         |
| `updatableUri`     | boolean | `ERC1155`                                  | Allow Privileged accounts to set a new URI |


## Examples

**After [Initializing the Contract Object](/docs/Contracts/initializeContract),**

Pass the required configurations to `draftContract` function to create a Solidity File.

-   **Standard: ERC721**

```javascript
nftToolbox.draftContract({
	baseUri: "ipfs://exampleCID/"
	// Common options
	burnable: false
	pausable: false
	mintable: false
	// ERC721 options
	enumerable: false
	uriStorage: false
	incremental: false
	votes: false
});
```



-   **Standard: ERC998**

```javascript
nftToolbox.draftContract({
    baseUri: "ipfs://exampleCID/",
    // Common options
    burnable: false,
    pausable: false,
    mintable: false,
    // ERC998 options
    composable: true,
    rootOwner: "0x0000000000000000000000000000000000000000", // Address of the root owner
    rootId: 1, // Root ID for the composable tokens
    extension: "0x0000000000000000000000000000000000000000", // Address of the ERC998 extension contract
    extensionId: 1, // Extension ID for the composable tokens
});
```

-   **Standard: ERC1151**


```javascript
nftToolbox.draftContract({
    baseUri: "ipfs://exampleCID/",
    // Common options
    burnable: false,
    pausable: false,
    mintable: false,
    // ERC1151 options
    nftOwners: {}, // Mapping for NFT owners
    ownerToNFTCount: {}, // Mapping for owner NFT count
    nftApprovals: {}, // Mapping for NFT approvals
    nftBalances: {}, // Mapping for NFT balances
    nftData: {}, // Mapping for NFT data
    operatorApprovals: {}, // Mapping for operator approvals
});
```
-   **Standard: ERC1155**

```javascript
nftToolbox.draftContract({
	baseUri: "ipfs://exampleCID/"
	// Common options
	burnable: false
	pausable: false
	mintable: false
	// ERC1155 options
	supply: false;
	updatableUri: false;
});
```