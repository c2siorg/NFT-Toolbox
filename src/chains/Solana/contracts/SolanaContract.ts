import fs from "fs";
import path from "path";
import { 
  SystemProgram, 
  Keypair, 
  Connection, 
  Transaction, 
  TransactionInstruction,
  PublicKey, 
  sendAndConfirmTransaction, 
  VersionedTransaction,
  TransactionMessage,
  SimulateTransactionConfig,
} from "@solana/web3.js";
import { Idl } from '@project-serum/anchor';

type networks = "devnet" | "testnet" | "mainnet";

export interface DraftOptions {
  // Solana-specific options
  payer: Keypair;
  programId: string;
  programData: Buffer;
}

export interface DeployConfigs {
  rpc: string;
  network: networks;
  connection: Connection;
  payer: Keypair;
  idl: Idl;
}

export interface ContractAttributes {
  dir: fs.PathLike;
  name: string;
  symbol: string;
  connection: DeployConfigs;
  deployed?: {
    address: string;
    programId: string;
    programData?: Buffer;
  };
}

export class Contract {
  dir: fs.PathLike;
  name: string;
  symbol: string;
  payer: Keypair;
  programId: string;
  programData: Buffer;
  connection: Connection;
  idl: Idl;
  deployedInstance: string | undefined = undefined;
  rpc: string;

  constructor(attr: ContractAttributes) {
    this.dir = attr.dir;
    this.name = attr.name;
    this.symbol = attr.symbol;
    this.connection = attr.connection.connection;
    this.payer = attr.connection.payer;
    this.programId = attr.deployed?.programId || "";
    this.programData = attr.deployed?.programData || Buffer.alloc(0);
    this.deployedInstance = attr.deployed?.address;
    this.rpc = attr.connection.rpc;
    this.idl = attr.connection.idl;
  }

  print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
    const filePath = path.join(this.dir.toString(), `${this.name}.rs`);
    fs.writeFileSync(filePath, contractCode, { flag: "w" });
    console.log(`Contract created : ${filePath}`);
  }

  draft(options: DraftOptions): void {
    const contractCode = `
   use anchor_lang::prelude::*;
   declare_id!("${options.programId}");

   #[program]
   pub mod basic_nft {
       use super::*;

      pub fn mint_nft(
          ctx: Context<MintNFT>, 
          metadata_uri: String,
      ) -> Result<()> {
          let nft = &mut ctx.accounts.nft;
          nft.owner = *ctx.accounts.user.key;
           nft.metadata_uri = metadata_uri;
           Ok(())
      }
  }

  #[derive(Accounts)]
  pub struct MintNFT<'info> {
      #[account(init, payer = user, space = 8 + 32 + 200)]
      pub nft: Account<'info, NFT>,
      #[account(mut)]
      pub user: Signer<'info>,
      pub system_program: Program<'info, System>,
  }

  #[account]
  pub struct NFT {
      pub owner: Pubkey,
      pub metadata_uri: String,
  } `;

  
    this.print(contractCode);
  }
// Function to deploy a Solana smart contract
  async deploySolanaContract(connection: Connection, payer: Keypair): Promise<PublicKey> {
    // Load the payer's account information
    const payerAccountInfo = await connection.getAccountInfo(payer.publicKey);
    if (!payerAccountInfo) {
      throw new Error('Payer account not found');
    }
   // Read the WASM file from disk
    const wasmFilePath = path.join(__dirname, '..', '..', '..', '..', 'solana_contract.wasm');
    const programBytes = fs.readFileSync(wasmFilePath);

    // Create a new account for the program
    const programAccount = new Keypair();
    const programId = programAccount.publicKey;

   // Build the transaction to deploy the program
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: programId,
        lamports: await connection.getMinimumBalanceForRentExemption(programBytes.length),
        space: programBytes.length,
        programId: new PublicKey('3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf'),
      })
    );

    // Convert the Uint8Array to a Buffer for data parameter
    const programBytesBuffer = Buffer.from(programBytes);

    // Add an instruction to load the program bytes into the program account
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: programId, isWritable: true, isSigner: false }],
        programId: new PublicKey('3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf'),
        data: programBytesBuffer,
      })
    );

   // Sign and send the transaction
    await sendAndConfirmTransaction(connection, transaction, [payer, programAccount]);

    console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
    this.deployedInstance = programId.toBase58();

    return programId;
  }

  async write(method: string, args: any[]): Promise<string> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: true }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.payer],
      { commitment: "confirmed", preflightCommitment: "confirmed" }
    );

    console.log(`Transaction ${signature} sent to ${this.deployedInstance}`);
    return signature;
  }

//   async read(method: string, args: any[]): Promise<any> {
//     if (!this.deployedInstance) {
//       throw new Error("Contract has not been deployed");
//     }

//     const programId = new PublicKey(this.programId);
//     const programAccount = new PublicKey(this.deployedInstance);
//     const instruction = new TransactionInstruction({
//       keys: [{ pubkey: programAccount, isSigner: false, isWritable: false }],
//       programId,
//       data: Buffer.from(JSON.stringify({ method, args })),
//     });

//     const transaction = new Transaction().add(instruction);
//     const simulationResult = await this.connection.simulateTransaction(transaction);

//     console.log(`Result of ${method} call: ${JSON.stringify(simulationResult.value)}`);
//     return simulationResult.value;
//   }
// }

  async read(method: string, args: any[]): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: false }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    const transaction = new Transaction().add(instruction);

    // Convert the Transaction to a VersionedTransaction
    const latestBlockhash = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = this.payer.publicKey;
    const message = new TransactionMessage({
      payerKey: this.payer.publicKey,
      recentBlockhash: transaction.recentBlockhash,
      instructions: transaction.instructions,
    }).compileToLegacyMessage();
    const versionedTransaction = new VersionedTransaction(message);

    // Using the updated simulateTransaction method with VersionedTransaction and config
    const simulateConfig: SimulateTransactionConfig = { sigVerify: true };
    const { value: simulationResult } = await this.connection.simulateTransaction(versionedTransaction, simulateConfig);

    console.log(`Result of ${method} call: ${JSON.stringify(simulationResult)}`);
    return simulationResult;
  }
}


