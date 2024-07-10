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
    description: "This is a demo Ethereum collection for NFT Toolbox",
});

const testSolanaCol = new SolanaCollection({
    name: TEST_COL_NAME,
    dir: TEST_COL_PATH,
    description: "This is a demo Solana collection for NFT Toolbox",
    programId: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
    account: new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf"),
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
    it("Checking POST request in UploadDirToService", async function () {
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadDirToService(
            path.join(TEST_COL_PATH, "metadata")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in UploadFileToService", async function () {
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadFileToService(
            path.join(TEST_COL_PATH, "assets", "1.png")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in UploadJSONToService", async function () {
        const scope = nock("https://api.nft.storage")
            .filteringPath(() => "/")
            .post("/")
            .reply(200, TEST_API_RESPONSE);

        await testNFTstorageObj.uploadJSONToService(
            path.join(TEST_COL_PATH, "metadata", "1.json")
        );

        expect(scope.isDone()).to.be.true;
    });
});

describe("Test suite for Upload Method", () => {
    let uploadDirStub: sinon.SinonStub;

    beforeEach(() => {
        mock(TEST_FAKE_DIR_STRUCTURE, {
            createCwd: true,
            createTmp: true,
        });
        uploadDirStub = sinon.stub(testNFTstorageObj, "uploadDirToService").resolves(TEST_API_RESPONSE.value.cid);
    });

    afterEach(() => {
        mock.restore();
        sinon.restore();
    });

    it("Checking Internal UploadDirToService Calls for Ethereum", async function () {
        await testNFTstorageObj.uploadEthereumCollection(testEthereumCol);
        expect(uploadDirStub.calledTwice).to.be.true;
        expect(uploadDirStub.firstCall.args[0]).to.include("assets");
        expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
    });

    it("Checking Internal UploadDirToService Calls for Solana", async function () {
        uploadDirStub.resetHistory();
        await testNFTstorageObj.uploadEthereumCollection(testSolanaCol);
        expect(uploadDirStub.calledTwice).to.be.true;
        expect(uploadDirStub.firstCall.args[0]).to.include("assets");
        expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
    });

    it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
        const fakeFile = sinon.fake.resolves(TEST_API_RESPONSE.value.cid);
        const fakeJSON = sinon.fake.resolves(TEST_API_RESPONSE.value.cid);
        sinon.replace(testNFTstorageObj, "uploadFileToService", fakeFile);
        sinon.replace(testNFTstorageObj, "uploadJSONToService", fakeJSON);

        await testNFTstorageObj.uploadSingle(
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