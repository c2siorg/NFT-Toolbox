import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import nock from "nock";
import path from "path";
import { NFTstorage } from "../src/classes/NFTstorage";
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
const TEST_NFT_STORAGE_KEY = test_specs.NFT_STORAGE_KEY;

const TEST_BUFFER_FOR_IMAGE = Buffer.from([8, 6, 7, 5, 3, 0, 9]);

const TEST_FAKE_DIR_STRUCTURE = {
    fake_dir: {
        "Demo Collection": {
            assets: {
                "1.png": TEST_BUFFER_FOR_IMAGE,
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
    value: {
        cid: "randomCID",
    },
    ok: true,
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

const testNFTstorageObj = new NFTstorage(TEST_NFT_STORAGE_KEY);

describe("Test suite for Upload To NFTstorage API", () => {
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
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadDirToService(
            path.join(TEST_COL_PATH, "metadata")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadFileToService", async function () {
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadFileToService(
            path.join(TEST_COL_PATH, "assets", "1.png")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in uploadJSONToService", async function () {
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadJSONToService(
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
        uploadDirStub = sinon.stub(testNFTstorageObj, "uploadDirToService").resolves(TEST_API_RESPONSE.value.cid);
        uploadFileStub = sinon.stub(testNFTstorageObj, "uploadFileToService").resolves(TEST_API_RESPONSE.value.cid);
        uploadJSONStub = sinon.stub(testNFTstorageObj, "uploadJSONToService").resolves(TEST_API_RESPONSE.value.cid);
    });

    afterEach(() => {
        mock.restore();
        uploadDirStub.restore();
        uploadFileStub.restore();
        uploadJSONStub.restore();
    });

    it("Checking Internal UploadDirToService Calls for Ethereum Collection", async function () {
        await testNFTstorageObj.uploadEthereumCollection(testEthereumCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadDirToService Calls for Solana Collection", async function () {
        await testNFTstorageObj.uploadSolanaCollection(testSolanaCol);
        expect(uploadDirStub.calledTwice).to.be.true;
    });

    it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
        await testNFTstorageObj.uploadSingle(
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