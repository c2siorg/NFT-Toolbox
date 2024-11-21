import fs from 'fs';
import path from 'path';

// Define an interface for ERC1151 options
export interface ERC1151Options {
    name: string; // Name of the token
    symbol: string; // Symbol of the token
    baseUri?: string; // Base URI for token metadata
    burnable?: boolean; // Flag indicating if the token is burnable
    pausable?: boolean; // Flag indicating if the token is pausable
    mintable?: boolean; // Flag indicating if new tokens can be minted
    nftOwners?: Record<string, string>; // Mapping of token IDs to owner addresses
    ownerToNFTCount?: Record<string, number>; // Mapping of owner addresses to token count
    nftApprovals?: Record<string, string>; // Mapping of token IDs to approved addresses
    nftBalances?: Record<string, number>; // Mapping of token IDs to token balances
    nftData?: Record<string, string>; // Mapping of token IDs to token data
    operatorApprovals?: Record<string, Record<string, boolean>>; // Mapping of owner addresses to operator approvals
}

// Function to print the ERC1151 contract code with the provided options
export function printERC1151(opts: ERC1151Options): string {
    const solFilePath = path.join(__dirname, '..', 'solFiles', 'ERC1151.sol');
    let contractCode = fs.readFileSync(solFilePath, 'utf-8');

    contractCode = contractCode.replace('${name}', opts.name);
    contractCode = contractCode.replace('${symbol}', opts.symbol);

    if (opts.baseUri !== undefined) {
        contractCode = contractCode.replace('${baseUri}', opts.baseUri);
    }

    if (opts.burnable !== undefined) {
        contractCode = contractCode.replace('${burnable}', opts.burnable.toString());
    }

    if (opts.pausable !== undefined) {
        contractCode = contractCode.replace('${pausable}', opts.pausable.toString());
    }

    if (opts.mintable !== undefined) {
        contractCode = contractCode.replace('${mintable}', opts.mintable.toString());
    }

    return contractCode;
}

// Define the default values for ERC1151 options
export const defaults: Required<ERC1151Options> = {
    name: 'MyERC1151',
    symbol: 'ERC1151',
    baseUri: '',
    burnable: false,
    pausable: false,
    mintable: false,
    nftOwners: {},
    ownerToNFTCount: {},
    nftApprovals: {},
    nftBalances: {},
    nftData: {},
    operatorApprovals: {},
};

// Function to check if access control is required based on the provided options
export function isAccessControlRequired(opts: Partial<ERC1151Options>): boolean {
    // Check if any of the options require access control
    if (opts.burnable === true || opts.pausable === true || opts.mintable === true) {
        return true;
    }

    // If none of the options require access control, return false
    return false;
}

export const erc1151 = {
    print: printERC1151,
    defaults,
    isAccessControlRequired,
};