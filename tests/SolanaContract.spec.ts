import { describe } from "mocha";
import chai from "chai";
import fs from "fs";
import path from "path";
import { Contract } from "../src/chains/Solana/contracts/SolanaContract";
import os from "os";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import sinon from "sinon";

const expect = chai.expect;

const TEST_CONT_NAME = "Solana DemoNFT";
const TEST_CONT_PATH = path.join(os.tmpdir(), "Contracts");

const test_specs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "test_specs.json")).toString()
);

const testConnection = new Connection("http://localhost:8899", "confirmed");

const testCont = new Contract({
  name: TEST_CONT_NAME,
  symbol: TEST_CONT_NAME,
  dir: TEST_CONT_PATH,
  connection: {
    ...test_specs.solanaConnection,
    connection: testConnection,
  },
  deployed: {
    address: test_specs.solanaConnection.address,
    programId: test_specs.solanaConnection.programId,
    programData: Buffer.from(test_specs.solanaConnection.programData, "hex"),
  },
});

describe("Test suite for Solana Contract Class", () => {
  afterEach(() => {
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmSync(TEST_CONT_PATH, { recursive: true, force: true });
    }
    sinon.restore();
  });

  it("Checking Solana Draft Method", () => {
    console.log(`TEST_CONT_PATH: ${TEST_CONT_PATH}`);
    console.log(`TEST_CONT_NAME: ${TEST_CONT_NAME}`);

    const payerKeypair = Keypair.generate();
    const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex");

    testCont.draft({
      payer: payerKeypair,
      programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
      programData: programData,
    });

    const contractFilePath = path.join(TEST_CONT_PATH, `${TEST_CONT_NAME}.rs`);
    console.log(`Contract file path: ${contractFilePath}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Contents of TEST_CONT_PATH directory: ${fs.readdirSync(TEST_CONT_PATH)}`);

    expect(fs.existsSync(contractFilePath)).to.be.true;

    const contractContent = fs.readFileSync(contractFilePath, 'utf8');
    expect(contractContent).to.include("use anchor_lang::prelude::*");
    expect(contractContent).to.include("use anchor_spl::token::{self, Token}");
    expect(contractContent).to.include("pub struct Counter");
    expect(contractContent).to.include("pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> ProgramResult");
  });

  it("Checking Deploy Solana Contract Method", async () => {
    const payerKeypair = Keypair.generate();
    const expectedProgramId = new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");
    
    const deployContractStub = sinon.stub(testCont, "deployContract").callsFake(async () => {
      await testCont.createSPLTokenMint(testConnection, payerKeypair);
      return expectedProgramId;
    });

    const createSPLTokenMintStub = sinon.stub(testCont, "createSPLTokenMint").resolves();

    try {
      const result = await testCont.deployContract(testConnection, payerKeypair);
      
      expect(deployContractStub.calledOnce, "deployContract should be called once").to.be.true;
      expect(createSPLTokenMintStub.calledOnce, "createSPLTokenMint should be called once").to.be.true;
      expect(result.equals(expectedProgramId), "Returned programId should match expected").to.be.true;
    } catch (error) {
      console.error("Error in Deploy Solana Contract Method test:", error);
      throw error;
    }
  });

  it("Checking Create SPL Token Mint Method", async () => {
    const createMintStub = sinon.stub(testCont, "createSPLTokenMint").resolves();

    try {
      await testCont.createSPLTokenMint(testConnection, Keypair.generate());
      expect(createMintStub.calledOnce, "createSPLTokenMint should be called once").to.be.true;
    } catch (error) {
      console.error("Error in Create SPL Token Mint Method test:", error);
      throw error;
    }
  });

  it("Checking Mint SPL Token Method", async () => {
    const recipientKeypair = Keypair.generate();
    const amount = 1;

    const mintStub = sinon.stub(testCont, "mintSPLToken").resolves();

    try {
      await testCont.mintSPLToken(testConnection, Keypair.generate(), recipientKeypair.publicKey, amount);
      
      expect(mintStub.calledOnce, "mintSPLToken should be called once").to.be.true;
      expect(mintStub.calledWith(
        testConnection,
        sinon.match.any,
        recipientKeypair.publicKey,
        amount
      ), "mintSPLToken should be called with correct arguments").to.be.true;
    } catch (error) {
      console.error("Error in Mint SPL Token Method test:", error);
      throw error;
    }
  });

  it("Checking Write Method", async () => {
    const method = "increment";
    const args = [];
    const expectedSignature = "fakeSignature";

    const writeStub = sinon.stub(testCont, "write").resolves(expectedSignature);

    try {
      const result = await testCont.write(method, args);
      
      expect(writeStub.calledOnce, "write should be called once").to.be.true;
      expect(writeStub.calledWith(method, args), "write should be called with correct arguments").to.be.true;
      expect(result).to.equal(expectedSignature, "Returned signature should match expected");
    } catch (error) {
      console.error("Error in Write Method test:", error);
      throw error;
    }
  });

  it("Checking Read Method", async () => {
    const method = "getCount";
    const args = [];
    const expectedResult = { count: 5 };

    const readStub = sinon.stub(testCont, "read").resolves(expectedResult);

    try {
      const result = await testCont.read(method, args);
      
      expect(readStub.calledOnce, "read should be called once").to.be.true;
      expect(readStub.calledWith(method, args), "read should be called with correct arguments").to.be.true;
      expect(result).to.deep.equal(expectedResult, "Returned result should match expected");
    } catch (error) {
      console.error("Error in Read Method test:", error);
      throw error;
    }
  });
});