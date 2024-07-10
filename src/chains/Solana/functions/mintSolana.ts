import fs from 'fs';
import path from 'path';
import { nftToolbox } from '../../../index';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// Read the connection configuration
let connectionConfig: any;
try {
  connectionConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', '..', 'connection.json')).toString()
  );
} catch (error) {
  console.error('Failed to read connection.json:', error);
  process.exit(1);
}

// Set default RPC endpoint if not provided
if (!connectionConfig.solana || !connectionConfig.solana.rpc) {
  console.warn('Solana RPC endpoint not found in connection.json. Using default devnet endpoint.');
  connectionConfig.solana = { rpc: 'https://api.devnet.solana.com' };
}

// Ensure the RPC endpoint starts with http:// or https://
if (!connectionConfig.solana.rpc.startsWith('http://') && !connectionConfig.solana.rpc.startsWith('https://')) {
  connectionConfig.solana.rpc = `https://${connectionConfig.solana.rpc}`;
}

// Create a connection to the Solana cluster
let connection: Connection;
try {
  connection = new Connection(connectionConfig.solana.rpc, 'confirmed');
  console.log('Connected to Solana cluster:', connectionConfig.solana.rpc);
} catch (error) {
  console.error('Failed to connect to Solana cluster:', error);
  process.exit(1);
}

// Create a keypair for the payer (you might want to load this from a file in a real-world scenario)
const payerKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'keypair.json')).toString()))
);
console.log('Payer public key:', payerKeypair.publicKey.toBase58());

// Initialize the Solana contract
try {
  nftToolbox.initSolanaContract({
    name: 'DemoContract',
    symbol: 'DEMO',
    dir: path.join(__dirname, 'Contracts'),
    connection: {
      ...connectionConfig.solana,
      connection: connection,
    },
    deployed: {
      address: connectionConfig.solana.deployedAddress || '',
      programId: connectionConfig.solana.programId || '',
      programData: connectionConfig.solana.programData ? Buffer.from(connectionConfig.solana.programData, 'hex') : Buffer.alloc(0),
    },
  });
  console.log('Solana contract initialized successfully');
} catch (error) {
  console.error('Failed to initialize Solana contract:', error);
  process.exit(1);
}

const mintSolanaNFT = async () => {
  // Generate a new keypair for the recipient (in a real scenario, you'd probably use an existing address)
  const recipientKeypair = Keypair.generate();
  const recipientAddress = recipientKeypair.publicKey;

  console.log('Recipient address:', recipientAddress.toBase58());

  try {
    console.log('Minting NFT...');
    await nftToolbox.mintSolanaNFT(recipientAddress);
    console.log('NFT minted successfully!');

    // You can add additional logic here, such as reading the token balance of the recipient
    // This would depend on the specific implementation of your Solana contract

  } catch (error) {
    console.error('Error minting NFT:', error);
  }
};

mintSolanaNFT().then(() => {
  console.log('Minting process completed');
}).catch((error) => {
  console.error('Unhandled error during minting process:', error);
});