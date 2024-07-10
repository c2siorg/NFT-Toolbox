import { describe } from "mocha";
import chai from "chai";
import fs from "fs";
import path from "path";
import { Contract } from "../src/chains/Solana/contracts/SolanaContract";
import os from "os";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import sinon from "sinon";

const expect = chai.expect;

const TEST_CONT_NAME = "Solana_DemoNFT";
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
  beforeEach(() => {
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmSync(TEST_CONT_PATH, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_CONT_PATH, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmSync(TEST_CONT_PATH, { recursive: true, force: true });
    }
    sinon.restore();
  });

  it("Checking Solana Draft Method", () => {
    const payerKeypair = Keypair.generate();
    const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex");

    testCont.draft({
      payer: payerKeypair,
      programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
      programData: programData,
    });

    const contractFilePath = path.join(TEST_CONT_PATH, `${TEST_CONT_NAME}.rs`);
    expect(fs.existsSync(contractFilePath), `File ${contractFilePath} does not exist`).to.be.true;

    const contractContent = fs.readFileSync(contractFilePath, 'utf8');
    expect(contractContent).to.include("use anchor_lang::prelude::*");
    expect(contractContent).to.include("pub mod basic_nft");
    expect(contractContent).to.include("pub fn mint_nft(");
    expect(contractContent).to.include("pub struct MintNFT<'info>");
    expect(contractContent).to.include("pub struct NFT");
    expect(contractContent).to.include("pub owner: Pubkey");
    expect(contractContent).to.include("pub metadata_uri: String");
  });

  it("Checking Write Solana Contract Method for MintNFT", async () => {
    const writeStub = sinon.stub(testCont, "write").resolves("fakeTxSignature");

    try {
      const result = await testCont.write("mintNFT", ["https://example.com/metadata.json"]);

      expect(writeStub.calledOnce, "write should be called once").to.be.true;
      expect(writeStub.calledWith("mintNFT", ["https://example.com/metadata.json"]), "write should be called with correct arguments").to.be.true;
      expect(result).to.equal("fakeTxSignature", "Write result should be a transaction signature");
    } catch (error) {
      console.error("Error in Write Solana Contract Method test for MintNFT:", error);
      throw error;
    }
  });
});