// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Import the ERC721 standard from OpenZeppelin
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    // Mapping to store custom URIs for each token ID
    mapping(uint256 => string) private _tokenIdToURI;

    // Constructor to initialize the NFT contract with a name and symbol
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    // Function to set the URI for a specific token ID
    function setTokenURI(uint256 tokenId, string memory uri) external {
        // Ensure that the token exists
        require(_ownerOf(tokenId) != address(0), "MyNFT: Token does not exist");
        // Set the URI for the given token ID
        _tokenIdToURI[tokenId] = uri;
    }

    // Function to batch mint multiple tokens
    function batchMint(address[] calldata recipients, uint256[] calldata tokenIds, string[] calldata uris) external {
        // Ensure that the input arrays have the same length
        require(recipients.length == tokenIds.length && recipients.length == uris.length, "MyNFT: Input arrays length mismatch");

        // Iterate through each recipient, token ID, and URI
        for (uint256 i = 0; i < recipients.length; i++) {
            // Ensure that the recipient address is not the zero address
            require(recipients[i] != address(0), "MyNFT: Recipient cannot be zero address");
            
            // Mint the token to the recipient address
            _safeMint(recipients[i], tokenIds[i]);
            // Set the custom URI for the minted token
            _tokenIdToURI[tokenIds[i]] = uris[i];
        }
    }

    // Function to get the URI of a specific token ID
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // Ensure that the token exists
        require(_ownerOf(tokenId) != address(0), "MyNFT: Token does not exist");
        // Return the URI associated with the token ID
        return _tokenIdToURI[tokenId];
    }
}