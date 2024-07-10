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
import { 
    TOKEN_PROGRAM_ID, 
    MINT_SIZE, 
    createInitializeMintInstruction, 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, 
    createMintToInstruction
} from "@solana/spl-token";
import { Idl } from '@project-serum/anchor';

type Network = "devnet" | "testnet" | "mainnet-beta";

export interface DraftOptions {
  payer: Keypair;
  programId: string;
  programData: Buffer;
}

export interface DeployConfigs {
  rpc: string;
  network: Network;
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
  private dir: fs.PathLike;
  private name: string;
  private symbol: string;
  private connection: Connection;
  private payer: Keypair;
  private programId: string;
  private programData: Buffer;
  private idl: Idl;
  private rpc: string;
  private deployedInstance?: string;
  public splTokenMint?: PublicKey;


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

  private print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
    const filePath = path.join(this.dir.toString(), `${this.name}.rs`);
    fs.writeFileSync(filePath, contractCode, { flag: "w" });
    console.log(`Contract created: ${filePath}`);
  }

  public draft(options: DraftOptions): void {
    const contractCode = `
    use anchor_lang::prelude::*;
    use anchor_spl::token;
    use anchor_spl::token::{Token, MintTo, Transfer};

    declare_id!("${options.programId}");

    #[program]
    pub mod token_contract {
        use super::*;

        pub fn mint_token(ctx: Context<MintToken>) -> Result<()> {
            let cpi_accounts = MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token::mint_to(cpi_ctx, 10)?;
            
            Ok(())
        }

        pub fn transfer_token(ctx: Context<TransferToken>) -> Result<()> {
            let transfer_instruction = Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.from_authority.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, transfer_instruction);

            anchor_spl::token::transfer(cpi_ctx, 5)?;
    
            Ok(())
        }
    }

    #[derive(Accounts)]
    pub struct MintToken<'info> {
        #[account(mut)]
        pub mint: Account<'info, token::Mint>,
        pub token_program: Program<'info, Token>,
        #[account(mut)]
        pub token_account: Account<'info, token::TokenAccount>,
        #[account(mut)]
        pub authority: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct TransferToken<'info> {
        pub token_program: Program<'info, Token>,
        #[account(mut)]
        pub from: Account<'info, token::TokenAccount>,
        #[account(mut)]
        pub to: Account<'info, token::TokenAccount>,
        pub from_authority: Signer<'info>,
    }
    `;
    this.print(contractCode);
  }

  async deployContract(): Promise<PublicKey> {
    try {
      const payerInfo = await this.connection.getAccountInfo(this.payer.publicKey);
      if (!payerInfo) throw new Error('Payer account not found');

      const wasmPath = path.join(__dirname, '..', '..', '..', '..', 'solana_contract.wasm');
      const programBytes = fs.readFileSync(wasmPath);

      const programAccount = Keypair.generate();
      const programId = programAccount.publicKey;

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: this.payer.publicKey,
          newAccountPubkey: programId,
          lamports: await this.connection.getMinimumBalanceForRentExemption(programBytes.length),
          space: programBytes.length,
          programId: new PublicKey(this.programId),
        })
      );

      transaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: programId, isWritable: true, isSigner: false }],
          programId: new PublicKey(this.programId),
          data: Buffer.from(programBytes),
        })
      );

      await sendAndConfirmTransaction(this.connection, transaction, [this.payer, programAccount]);

      this.deployedInstance = programId.toBase58();
      console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
      return programId;
    } catch (error) {
      console.error('Error deploying contract:', error);
      throw error;
    }
  }

  async createSPLTokenMint(): Promise<void> {
    try {
      const mintKeypair = Keypair.generate();
      this.splTokenMint = mintKeypair.publicKey;

      const lamports = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

      const transaction = new Transaction().add(
          SystemProgram.createAccount({
              fromPubkey: this.payer.publicKey,
              newAccountPubkey: mintKeypair.publicKey,
              space: MINT_SIZE,
              lamports,
              programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
              mintKeypair.publicKey,
              0,
              this.payer.publicKey,
              this.payer.publicKey
          )
      );

      await sendAndConfirmTransaction(this.connection, transaction, [this.payer, mintKeypair]);
      console.log(`SPL Token mint created: ${this.splTokenMint.toBase58()}`);
  } catch (error) {
      console.error('Error creating SPL token mint:', error);
      throw error;
  }
}

async mintSPLToken(recipient: PublicKey, amount: number): Promise<void> {
  try {
      if (!this.splTokenMint) throw new Error('SPL Token mint not created yet');

      const associatedTokenAccount = await getAssociatedTokenAddress(
          this.splTokenMint,
          recipient
      );

      const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
              this.payer.publicKey,
              associatedTokenAccount,
              recipient,
              this.splTokenMint
          ),
          createMintToInstruction(
              this.splTokenMint,
              associatedTokenAccount,
              this.payer.publicKey,
              amount
          )
      );

      await sendAndConfirmTransaction(this.connection, transaction, [this.payer]);
      console.log(`Minted ${amount} tokens to ${recipient.toBase58()}`);
  } catch (error) {
      console.error('Error minting SPL token:', error);
      throw error;
  }
}

  async write(method: string, args: any[]): Promise<string> {
    try {
      if (!this.deployedInstance) throw new Error("Contract has not been deployed");

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
    } catch (error) {
      console.error('Error writing to contract:', error);
      throw error;
    }
  }

  async read(method: string, args: any[]): Promise<any> {
    try {
      if (!this.deployedInstance) throw new Error("Contract has not been deployed");
      if (!this.connection) throw new Error("Connection not available");

      const programId = new PublicKey(this.programId);
      const programAccount = new PublicKey(this.deployedInstance);
      const instruction = new TransactionInstruction({
        keys: [{ pubkey: programAccount, isSigner: false, isWritable: false }],
        programId,
        data: Buffer.from(JSON.stringify({ method, args })),
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = this.payer.publicKey;

      const simulationResult = await this.connection.simulateTransaction(transaction);

      console.log(`Result of ${method} call: ${JSON.stringify(simulationResult.value)}`);
      return simulationResult.value;
    } catch (error) {
      console.error('Error reading from contract:', error);
      throw error;
    }
  }
}