import fs from 'fs';
import path from 'path';
import { nftToolbox } from '../../../index';
import { Keypair, PublicKey } from '@solana/web3.js';

// Read the payer keypair from a file or generate a new one
const payerKeypair = Keypair.generate();

// Read the program data from a file or provide it directly
const programData = Buffer.from('3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf', 'hex');

nftToolbox.initSolanaContract({
  name: 'DemoContract',
  symbol: 'DEMO',
  dir: path.join(__dirname, 'Contracts'),
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "..", "..",'connection.json')).toString()
  ),
});

nftToolbox.draftSolanaContract({
  payer: payerKeypair,
  programId: '3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf',
  programData: programData,
});