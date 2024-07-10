import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import MyNFT from "./sequential.json";

// Initializing Web3 connection to the Sepolia testnet using Infura
const web3 = new Web3('https://sepolia.infura.io/v3/....');

// Initializing the NFT contract instance
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[], // ABI of the contract
  '0xd9145CCE52D386f254917e481eB44e9943F39138' // Contract address
);

// Pinata API credentials f
const PINATA_API_KEY = '';
const PINATA_SECRET_API_KEY = '';

// Function to upload an image file to IPFS using Pinata
async function uploadToIPFS(tokenId: number, imagePath: string) {
  try {
    // Prepare the form data for the file upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath), path.basename(imagePath));
    formData.append('pinataMetadata', JSON.stringify({ name: `${tokenId}.png` }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    // Make the API request to upload the file
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY
      }
    });

    // Return the IPFS URL of the uploaded file
    return `ipfs://${res.data.IpfsHash}`;
  } catch (error) {
    // Log any errors that occur during the upload
    console.error(`Failed to upload to IPFS for token ${tokenId}:`, error);
    return null;
  }
}

// Function to save the current state of the minting process
function saveState(lastMintedTokenId: number) {
  const stateFile = path.join(__dirname, 'minting_state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ lastMintedTokenId }));
}

// Function to get the optimized gas price for transactions
async function getOptimizedGasPrice() {
  const gasPrice = await web3.eth.getGasPrice();
  return Math.floor(Number(gasPrice) * 1.1); // 10% higher than current gas price
}

// Main function for off-chain sequential batch minting
async function offChainSequential(recipients: string[], tokenIds: number[], privateKey: string) {
  console.log(`Starting off-chain sequential batch minting for ${tokenIds.length} NFTs...`);

  // Define the directories for data and assets
  const dataDir = path.join(__dirname, '..', 'Data');
  const assetsDir = path.join(dataDir, 'assets');
  const stateFile = path.join(__dirname, 'minting_state.json');

  // Load the last minted token ID from the state file
  let lastMintedTokenId = fs.existsSync(stateFile) 
    ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastMintedTokenId 
    : 0;

  console.log(`Resuming from token ID ${lastMintedTokenId + 1}`);

  // Retrieve the account address from the private key
  const account = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`).address;
  const balance = await web3.eth.getBalance(account);
  console.log(`Account balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

  // Define the batch size and concurrent uploads
  const batchSize = 20;
  const concurrentUploads = 5;
  let totalGasUsed = 0;

  // Loop through the token IDs in batches
  for (let i = lastMintedTokenId; i < tokenIds.length;) {
    const batchEnd = Math.min(i + batchSize, tokenIds.length);
    const batchTokenIds = tokenIds.slice(i, batchEnd);
    const batchRecipients = recipients.slice(i, batchEnd);

    console.log(`Preparing batch for tokens ${i + 1} to ${batchEnd}`);

    // Parallel IPFS uploads
    const uploadPromises = [];
    for (let j = 0; j < batchTokenIds.length; j += concurrentUploads) {
      const uploadBatch = batchTokenIds.slice(j, j + concurrentUploads).map(async (tokenId) => {
        const imagePath = path.join(assetsDir, `${tokenId}.png`);
        if (!fs.existsSync(imagePath)) {
          console.error(`Image file not found: ${imagePath}`);
          return null;
        }
        return uploadToIPFS(tokenId, imagePath);
      });
      uploadPromises.push(...uploadBatch);
    }

    // Wait for all uploads to complete
    const batchUris = await Promise.all(uploadPromises);
    const validBatch = batchUris.every(uri => uri !== null);

    // If any upload failed, retry the entire batch
    if (!validBatch) {
      console.error('Failed to upload all tokens in batch. Retrying failed uploads.');
      continue;
    }

    try {
      // Get the optimized gas price
      const gasPrice = await getOptimizedGasPrice();

      // Encode the batch mint transaction data
      const data = myNFTContract.methods.batchMint(batchRecipients, batchTokenIds, batchUris).encodeABI();
      const nonce = await web3.eth.getTransactionCount(account);
      const gasLimit = await myNFTContract.methods.batchMint(batchRecipients, batchTokenIds, batchUris).estimateGas({from: account});

      // Prepare the transaction object
      const txObject = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(Math.floor(Number(gasLimit) * 1.2)), // 20% buffer
        to: myNFTContract.options.address,
        data: data,
      };

      // Sign and send the transaction
      const signedTx = await web3.eth.accounts.signTransaction(txObject, `0x${privateKey}`);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction as string);
      
      // Log the gas used and transaction details
      const batchGasUsed = Number(receipt.gasUsed);
      totalGasUsed += batchGasUsed;
      
      console.log(`Batch minted. Tokens ${i + 1} to ${batchEnd}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      console.log(`Gas used for this batch: ${batchGasUsed}`);

      // Save the state and move to the next batch
      lastMintedTokenId = batchTokenIds[batchTokenIds.length - 1];
      saveState(lastMintedTokenId);
      i = batchEnd; // Move to the next batch
    } catch (error) {
      console.error(`Failed to mint batch. Last successful mint: Token ${lastMintedTokenId}`);
      console.error('Error:', error);
    }
  }

  console.log('Minting process completed.');
  console.log(`Total gas used for all batches: ${totalGasUsed}`);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile); // Removes state file after completion
}

// Define the recipients and token IDs for minting
const recipients = Array(100).fill('0x087a9d913769E8355f6d25747012995Bc03b80aD');
const tokenIds = Array.from({ length: 100 }, (_, i) => i + 1);
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

// Start the batch minting process
offChainSequential(recipients, tokenIds, privateKey).catch(console.error);

export { offChainSequential };