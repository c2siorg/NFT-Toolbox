import fs from 'fs';
import path from 'path';

// Define an interface for ERC998 options
export interface ERC998Options {
    name: string; // Name of the token
    symbol: string; // Symbol of the token
    composable?: boolean; // Flag indicating if the token is composable
    rootOwner?: string; // Address of the root owner
    rootId?: number; // ID of the root token
    extension?: string; // Extension name
    extensionId?: number; // Extension ID
}

// Function to print the ERC998 contract code with the provided options
export function printERC998(opts: ERC998Options): string {
    const solFilePath = path.join(__dirname, '..', 'solFiles', 'ERC998.sol');
    let contractCode = fs.readFileSync(solFilePath, 'utf-8');
    
    contractCode = contractCode.replace('${name}', opts.name);
    contractCode = contractCode.replace('${symbol}', opts.symbol);
    
    if (opts.composable !== undefined) {
        contractCode = contractCode.replace('${composable}', opts.composable.toString());
    }
    
    if (opts.rootOwner !== undefined) {
        contractCode = contractCode.replace('${rootOwner}', opts.rootOwner);
    }
    
    if (opts.rootId !== undefined) {
        contractCode = contractCode.replace('${rootId}', opts.rootId.toString());
    }
    
    if (opts.extension !== undefined) {
        contractCode = contractCode.replace('${extension}', opts.extension);
    }
    
    if (opts.extensionId !== undefined) {
        contractCode = contractCode.replace('${extensionId}', opts.extensionId.toString());
    }
    
    return contractCode;
}

// Define the default values for ERC998 options
export const defaults: Required<ERC998Options> = {
    name: 'ERC998',
    symbol: 'Eth',
    composable: true,
    rootOwner: '0x0000000000000000000000000000000000000000',
    rootId: 0,
    extension: '',
    extensionId: 0,
};

// Function to check if access control is required based on the provided options
export function isAccessControlRequired(opts: Partial<ERC998Options>): boolean {
    // Check if any of the options require access control
    if (opts.composable === true || opts.rootOwner || opts.extension) {
        return true;
    }
    
    // If none of the options require access control, return false
    return false;
}

export const erc998 = {
    print: printERC998,
    defaults,
    isAccessControlRequired,
};