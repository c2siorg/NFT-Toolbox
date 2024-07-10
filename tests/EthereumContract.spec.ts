import { describe } from "mocha";
import chai from "chai";
import fs from "fs";
import path from "path";
import { Contract } from "../src/chains/Ethereum/contracts/EthereumContract";
import os from "os";

const expect = chai.expect;

const TEST_CONT_NAME = "Ethereum DemoNFT";
const TEST_CONT_PATH = path.join(os.tmpdir(), "Contracts");

const test_specs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "test_specs.json")).toString()
);

const testCont = new Contract({
  name: TEST_CONT_NAME,
  symbol: TEST_CONT_NAME,
  dir: TEST_CONT_PATH,
  standard: "ERC721",
  connection: test_specs.connection,
  deployed: {
    address: test_specs.connection,
    abi: JSON.stringify(test_specs.abi),
  },
});

describe("Test suite for Ethereum Contract Class", () => {
  afterEach(() => {
    // Remove the TEST_CONT_PATH directory and its contents
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmdirSync(TEST_CONT_PATH, { recursive: true });
    }
  });

  it("Checking Ethereum Draft Method", () => {
    console.log(`TEST_CONT_PATH: ${TEST_CONT_PATH}`);
    console.log(`TEST_CONT_NAME: ${TEST_CONT_NAME}`);

    testCont.draft({
      baseUri: "ipfs://",
    });

    const contractFilePath = path.join(TEST_CONT_PATH, `${TEST_CONT_NAME}.sol`);
    console.log(`Contract file path: ${contractFilePath}`);

    // Log the current working directory
    console.log(`Current working directory: ${process.cwd()}`);

    // Log the contents of the TEST_CONT_PATH directory
    console.log(`Contents of TEST_CONT_PATH directory: ${fs.readdirSync(TEST_CONT_PATH)}`);

    expect(fs.existsSync(contractFilePath)).to.be.true;
  });
});