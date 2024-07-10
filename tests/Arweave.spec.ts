import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import path from "path";
import { Arweave } from "../src/classes/Arweave";
import { Collection as EthereumCollection } from "../src/chains/Ethereum/contracts/EthereumCollection";
import { Collection as SolanaCollection } from "../src/chains/Solana/contracts/SolanaCollection";
import { readFileSync } from "fs";
import { PublicKey } from "@solana/web3.js";

const expect = chai.expect;

const TEST_COL_NAME = "Demo Collection";
const TEST_COL_PATH = path.join(process.cwd(), "fake_dir", "Demo Collection");

const test_specs = JSON.parse(
   readFileSync(path.join(__dirname, "test_specs.json")).toString()
);
const TEST_ARWEAVE_CURRENCY = test_specs.ARWEAVE_CURRENCY;
const TEST_ARWEAVE_WALLET = test_specs.ARWEAVE_WALLET;

const TEST_FAKE_DIR_STRUCTURE = {
   fake_dir: {
   	"Demo Collection": {
   		assets: {
   			"1.png": "",
   			"2.png": "",
   		},
   		metadata: {
   			"1.json": "{}",
   			"2.json": "{}",
   		},
   	},
   },
};
const TEST_API_RESPONSE = {
   id: "randomCID",
};

const testEthereumCol = new EthereumCollection({
   name: TEST_COL_NAME,
   dir: TEST_COL_PATH,
   description: "This is a demo Ethereum collection for NFT Toolbox",
});

const testSolanaCol = new SolanaCollection({
   name: TEST_COL_NAME,
   dir: TEST_COL_PATH,
   description: "This is a demo Solana collection for NFT Toolbox",
   programId: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
   account: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
});

const testArweaveObj = new Arweave(TEST_ARWEAVE_CURRENCY, TEST_ARWEAVE_WALLET);

describe("Test suite for Upload with Irys SDK", () => {
   beforeEach(() => {
   	mock(TEST_FAKE_DIR_STRUCTURE, {
   		createCwd: true,
   		createTmp: true,
   	});
   	const fakeFund = sinon.fake.resolves(null);
   	sinon.replace(testArweaveObj, "fundIrys", fakeFund);
   });
   afterEach(() => {
   	mock.restore();
   	sinon.restore();
   });
   it("Checking SDK function call in uploadDirToService", async function () {
   	const fake = sinon.fake.resolves(TEST_API_RESPONSE);
   	sinon.replace(testArweaveObj.CONNECTION, "uploadFolder", fake);

   	const result = await testArweaveObj.uploadDirToService(
   		path.join(TEST_COL_PATH, "metadata")
   	);

   	expect(
   		fake.calledOnceWith(path.join(TEST_COL_PATH, "metadata").toString())
   	).to.be.true;
   	expect(result).to.equal(TEST_API_RESPONSE.id);
   });
   it("Checking SDK function call in uploadFileToService", async function () {
   	const fake = sinon.fake.resolves(TEST_API_RESPONSE);
   	sinon.replace(
   		testArweaveObj.CONNECTION,
   		"uploadFile",
   		fake
   	);

   	const result = await testArweaveObj.uploadFileToService(
   		path.join(TEST_COL_PATH, "assets", "1.png")
   	);

   	expect(
   		fake.calledOnceWith(
   			sinon.match.string,
   			sinon.match.object
   		)
   	).to.be.true;
   	expect(result).to.equal(TEST_API_RESPONSE.id);
   });
   it("Checking SDK function call in uploadJSONToService", async function () {
   	const fake = sinon.fake.resolves(TEST_API_RESPONSE);
   	sinon.replace(
   		testArweaveObj.CONNECTION,
   		"uploadFile",
   		fake
   	);

   	const result = await testArweaveObj.uploadJSONToService(
   		readFileSync(
   			path.join(TEST_COL_PATH, "metadata", "1.json")
   		).toString()
   	);

   	expect(
   		fake.calledOnceWith(
   			sinon.match.string,
   			sinon.match.object
   		)
   	).to.be.true;
   	expect(result).to.equal(TEST_API_RESPONSE.id);
   });
});

describe("Test suite for Upload Method", () => {
   let uploadDirStub: sinon.SinonStub;

   beforeEach(() => {
   	mock(TEST_FAKE_DIR_STRUCTURE, {
   		createCwd: true,
   		createTmp: true,
   	});
      uploadDirStub = sinon.stub(testArweaveObj, "uploadDirToService").resolves(TEST_API_RESPONSE.id);
   });
   afterEach(() => {
   	mock.restore();
      sinon.restore();
   });
   it("Checking Internal UploadDirToService Calls for Ethereum", async function () {
   	await testArweaveObj.uploadEthereumCollection(testEthereumCol);

   	expect(uploadDirStub.calledTwice).to.be.true;
      expect(uploadDirStub.firstCall.args[0]).to.include("assets");
      expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
   });
   it("Checking Internal UploadDirToService Calls for Solana", async function () {
      uploadDirStub.resetHistory();
      await testArweaveObj.uploadSolanaCollection(testSolanaCol);

      expect(uploadDirStub.calledTwice).to.be.true;
      expect(uploadDirStub.firstCall.args[0]).to.include("assets");
      expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
   });
   it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
   	const fakeFile = sinon.fake.resolves(TEST_API_RESPONSE.id);
   	const fakeJSON = sinon.fake.resolves(TEST_API_RESPONSE.id);
   	sinon.replace(testArweaveObj, "uploadFileToService", fakeFile);
   	sinon.replace(testArweaveObj, "uploadJSONToService", fakeJSON);

   	await testArweaveObj.uploadSingle(
   		path.join(TEST_COL_PATH, "assets", "1.png"),
   		JSON.parse(
   			readFileSync(
   				path.join(TEST_COL_PATH, "metadata", "1.json")
   			).toString()
   		)
   	);

   	expect(fakeFile.calledOnce).to.be.true;
   	expect(fakeJSON.calledOnce).to.be.true;
   });
});