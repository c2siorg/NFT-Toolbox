import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import nock from "nock";
import path from "path";
import { Storj } from "../src/classes/Storj";
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
const TEST_STORJ_USERNAME = test_specs.STORJ_USERNAME;
const TEST_STORJ_PASSWORD = test_specs.STORJ_PASSWORD;

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
const TEST_API_RESPONSES = [
    {
        Hash: "randomCID",
        Name: TEST_COL_PATH.toString().split("\\").join("/"),
    },
    {
        Hash: "randomCID",
        Name: path
            .join(TEST_COL_PATH, "metadata")
            .toString()
            .split("\\")
            .join("/"),
    },
    {
        Hash: "randomCID",
        Name: path
            .join(TEST_COL_PATH, "metadata", "1.json")
            .toString()
            .split("\\")
            .join("/"),
    },
];

const TEST_API_RESPONSE = {
    ndjsonRes: TEST_API_RESPONSES.map((obj) => JSON.stringify(obj)).join("\n"),
    jsonRes: TEST_API_RESPONSES[0],
    Hash: "randomCID",
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

const testStorjObj = new Storj(TEST_STORJ_USERNAME, TEST_STORJ_PASSWORD);

describe("Test suite for Upload To Storj API", () => {
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
        const scope = nock("https://www.storj-ipfs.com")
            .post("/api/v0/add")
            .reply(200, TEST_API_RESPONSE.ndjsonRes);

        await testStorjObj.uploadDirToService(
            path.join(TEST_COL_PATH, "metadata")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadFileToService", async function () {
        const scope = nock("https://www.storj-ipfs.com")
            .post("/api/v0/add")
            .reply(200, TEST_API_RESPONSE.jsonRes);

        await testStorjObj.uploadFileToService(
            path.join(TEST_COL_PATH, "assets", "1.png")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadJSONToService", async function () {
        const scope = nock("https://www.storj-ipfs.com")
            .post("/api/v0/add")
            .reply(200, TEST_API_RESPONSE.jsonRes);

        await testStorjObj.uploadJSONToService(
            JSON.stringify({ test: "data" })
        );

        expect(scope.isDone()).to.be.true;
    });
});

describe("Test suite for Upload Method", () => {
    let uploadDirStub: sinon.SinonStub;
    let uploadFileStub: sinon.SinonStub;
    let uploadJSONStub: sinon.SinonStub;

    beforeEach(() => {
        mock(TEST_FAKE_DIR_STRUCTURE, {
            createCwd: true,
            createTmp: true,
        });
        uploadDirStub = sinon.stub(testStorjObj, "uploadDirToService").resolves(TEST_API_RESPONSE.Hash);
        uploadFileStub = sinon.stub(testStorjObj, "uploadFileToService").resolves(TEST_API_RESPONSE.Hash);
        uploadJSONStub = sinon.stub(testStorjObj, "uploadJSONToService").resolves(TEST_API_RESPONSE.Hash);
    });

    afterEach(() => {
        mock.restore();
        uploadDirStub.restore();
        uploadFileStub.restore();
        uploadJSONStub.restore();
    });

    it("Checking Internal UploadDirToService Calls for Ethereum Collection", async function () {
        await testStorjObj.uploadEthereumCollection(testEthereumCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadDirToService Calls for Solana Collection", async function () {
        await testStorjObj.uploadSolanaCollection(testSolanaCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
        await testStorjObj.uploadSingle(
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