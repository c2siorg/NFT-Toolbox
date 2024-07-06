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
} from "@solana/web3.js";

import { Idl } from '@project-serum/anchor';

let spl_token: any;

// Path to the WASM file containing the program bytecode
const wasmFilePath = '../../../../native/target/wasm32-unknown-unknown/debug/native.wasm';

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

  splTokenMint: PublicKey | undefined;

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

  // Static method to initialize the SPL token module
  private static async initSplToken() {
    if (!spl_token) {
      spl_token = await import('@solana/spl-token');
    }
  }

  print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    fs.writeFileSync(
      path.join(this.dir.toString(), `${this.name}.rs`),
      contractCode,
      { flag: "w" }
    );
  }

  draft(options: DraftOptions): void {
    const contractCode = `
      // Simple Solana smart contract with SPL token support
      use anchor_lang::prelude::*;
      use anchor_spl::token::{self, Token};

      declare_id!("${options.programId}");

      #[program]
      pub mod ${this.name.toLowerCase()} {
        use super::*;

        pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
          let counter = &mut ctx.accounts.counter;
          counter.count = 0;
          Ok(())
        }

        pub fn increment(ctx: Context<Increment>) -> ProgramResult {
          let counter = &mut ctx.accounts.counter;
          counter.count += 1;
          Ok(())
        }

        pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> ProgramResult {
          token::mint_to(
            CpiContext::new(
              ctx.accounts.token_program.to_account_info(),
              token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
              },
            ),
            amount,
          )?;
          Ok(())
        }
      }

      #[derive(Accounts)]
      pub struct Initialize<'info> {
        #[account(init, payer = payer, space = 8 + 8)]
        pub counter: Account<'info, Counter>,
        #[account(mut)]
        pub payer: Signer<'info>,
        pub system_program: Program<'info, System>,
      }

      #[derive(Accounts)]
      pub struct Increment<'info> {
        #[account(mut)]
        pub counter: Account<'info, Counter>,
      }

      #[derive(Accounts)]
      pub struct MintToken<'info> {
        #[account(mut)]
        pub mint: Account<'info, token::Mint>,
        #[account(mut)]
        pub token_account: Account<'info, token::TokenAccount>,
        #[account(mut)]
        pub payer: Signer<'info>,
        pub token_program: Program<'info, Token>,
      }

      #[account]
      pub struct Counter {
        pub count: u64,
      }
    `;
    this.print(contractCode);
    console.log(`Contract created : ${this.dir}`);
  }

  // Method to deploy a Solana smart contract
  async deployContract(connection: Connection, payer: Keypair): Promise<PublicKey> {
    // Load the payer's account information
    const payerAccountInfo = await connection.getAccountInfo(payer.publicKey);
    if (!payerAccountInfo) {
      throw new Error('Payer account not found');
    }

    // Read the WASM file from disk
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

    // Create SPL token mint after deployment
    await this.createSPLTokenMint(connection, payer);

    return programId;
  }

  // Method to create an SPL token mint
  async createSPLTokenMint(connection: Connection, payer: Keypair): Promise<void> {
    // Initialize the SPL token module
    await Contract.initSplToken();

    // Generate a new keypair for the token mint account
    const mintKeypair = Keypair.generate();
    this.splTokenMint = mintKeypair.publicKey;

    // Calculate the minimum balance required for rent exemption
    const lamports = await connection.getMinimumBalanceForRentExemption(spl_token.MINT_SIZE);

    // Create a new transaction
    const transaction = new Transaction().add(
      // Instruction to create a new account for the token mint
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: spl_token.MINT_SIZE,
        lamports,
        programId: spl_token.TOKEN_PROGRAM_ID,
      }),
      // Instruction to initialize the mint account
      spl_token.createInitializeMintInstruction(
        mintKeypair.publicKey,
        0,
        payer.publicKey,
        payer.publicKey
      )
    );

    // Send and confirm the transaction
    await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    console.log(`SPL Token mint created: ${this.splTokenMint.toBase58()}`);
  }

  // Method to mint SPL tokens
  async mintSPLToken(connection: Connection, payer: Keypair, recipient: PublicKey, amount: number): Promise<void> {
    // Initialize the SPL token module
    await Contract.initSplToken();

    if (!this.splTokenMint) {
      throw new Error('SPL Token mint not created yet');
    }

    // Get the associated token account for the recipient
    const associatedTokenAccount = await spl_token.getAssociatedTokenAddress(
      this.splTokenMint,
      recipient
    );

    // Create a transaction to mint tokens
    const transaction = new Transaction().add(
      // Instruction to create the associated token account if it doesn't exist
      spl_token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAccount,
        recipient,
        this.splTokenMint
      ),
      // Instruction to mint tokens to the associated token account
      spl_token.createMintToInstruction(
        this.splTokenMint,
        associatedTokenAccount,
        payer.publicKey,
        amount
      )
    );

    // Send and confirm the transaction
    await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log(`Minted ${amount} tokens to ${recipient.toBase58()}`);
  }

  // Method to write to the smart contract
  async write(method: string, args: any[]): Promise<string> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    // Create an instruction to call the contract method
    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: true }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    // Create and send the transaction
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

  // Method to read from the smart contract
  async read(method: string, args: any[]): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    // Create an instruction to call the contract method
    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: false }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    // Simulate the transaction to read data
    const transaction = new Transaction().add(instruction);
    const simulationResult = await this.connection.simulateTransaction(transaction);

    console.log(`Result of ${method} call: ${JSON.stringify(simulationResult.value)}`);
    return simulationResult.value;
  }
}