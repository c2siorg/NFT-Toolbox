import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import nock from "nock";
import path from "path";
import { Pinata } from "../src/classes/Pinata";
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
const TEST_PINATA_KEY = test_specs.PINATA_KEY;
const TEST_PINATA_SECURITY = test_specs.PINATA_SECURITY;

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
    IpfsHash: "randomCID",
    PinSize: 1234,
    Timestamp: "2023-05-20T12:00:00Z"
};

const testEthereumCol = new EthereumCollection({
    name: TEST_COL_NAME,
    dir: TEST_COL_PATH,
    description: "This is a demo collection for NFT Toolbox",
});

const testSolanaCol = new SolanaCollection({
    name: TEST_COL_NAME,
    dir: TEST_COL_PATH,
    description: "This is a demo collection for NFT Toolbox",
    programId: new PublicKey("11111111111111111111111111111111"),
    account: new PublicKey("11111111111111111111111111111111"),
});

const testPinataObj = new Pinata(TEST_PINATA_KEY, TEST_PINATA_SECURITY);

describe("Test suite for Upload To Pinata API", () => {
    beforeEach(() => {
        mock(TEST_FAKE_DIR_STRUCTURE, {
            createCwd: true,
            createTmp: true,
        });
    });
    afterEach(() => {
        mock.restore();
        nock.cleanAll();
    });

    it("Checking POST request in uploadDirToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinFileToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadDirToService(
            path.join(TEST_COL_PATH, "metadata")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadFileToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinFileToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadFileToService(
            path.join(TEST_COL_PATH, "assets", "1.png")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadJSONToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinJSONToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadJSONToService(
            JSON.stringify({ test: "data" })
        );

        expect(scope.isDone()).to.be.true;
    });
});

describe("Test suite for Upload Methods", () => {
    let uploadDirStub: sinon.SinonStub;
    let uploadFileStub: sinon.SinonStub;
    let uploadJSONStub: sinon.SinonStub;

    beforeEach(() => {
        mock(TEST_FAKE_DIR_STRUCTURE, {
            createCwd: true,
            createTmp: true,
        });
        uploadDirStub = sinon.stub(testPinataObj, "uploadDirToService").resolves(TEST_API_RESPONSE.IpfsHash);
        uploadFileStub = sinon.stub(testPinataObj, "uploadFileToService").resolves(TEST_API_RESPONSE.IpfsHash);
        uploadJSONStub = sinon.stub(testPinataObj, "uploadJSONToService").resolves(TEST_API_RESPONSE.IpfsHash);
    });

    afterEach(() => {
        mock.restore();
        uploadDirStub.restore();
        uploadFileStub.restore();
        uploadJSONStub.restore();
    });

    it("Checking Internal UploadDirToService Calls for Ethereum Collection", async function () {
        await testPinataObj.uploadEthereumCollection(testEthereumCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadDirToService Calls for Solana Collection", async function () {
        await testPinataObj.uploadSolanaCollection(testSolanaCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
        await testPinataObj.uploadSingle(
            path.join(TEST_COL_PATH, "assets", "1.png"),
            JSON.parse(
                readFileSync(
                    path.join(TEST_COL_PATH, "metadata", "1.json")
                ).toString()
            )
        );

        expect(uploadFileStub.calledOnce).to.be.true;
        expect(uploadJSONStub.calledOnce).to.be.true;
    });
});