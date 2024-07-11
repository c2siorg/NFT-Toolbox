import { describe, before } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import nock from "nock";
import path from "path";
import { Infura } from "../src/classes/Infura";
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
const TEST_INFURA_USERNAME = test_specs.INFURA_USERNAME;
const TEST_INFURA_PASSWORD = test_specs.INFURA_PASSWORD;

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

const testInfuraObj = new Infura(TEST_INFURA_USERNAME, TEST_INFURA_PASSWORD);

describe("Infura Tests", () => {
    describe("Test suite for Upload To Infura API", () => {
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
            const scope = nock("https://ipfs.infura.io:5001")
                .post("/api/v0/add")
                .reply(200, TEST_API_RESPONSE.ndjsonRes);

            await testInfuraObj.uploadDirToService(
                path.join(TEST_COL_PATH, "metadata")
            );

            expect(scope.isDone()).to.be.true;
        });

        it("Checking POST request in uploadFileToService", async function () {
            const scope = nock("https://ipfs.infura.io:5001")
                .post("/api/v0/add")
                .reply(200, TEST_API_RESPONSE.jsonRes);

            await testInfuraObj.uploadFileToService(
                path.join(TEST_COL_PATH, "assets", "1.png")
            );

            expect(scope.isDone()).to.be.true;
        });

        it("Checking POST request in uploadJSONToService", async function () {
            const scope = nock("https://ipfs.infura.io:5001")
                .post("/api/v0/add")
                .reply(200, TEST_API_RESPONSE.jsonRes);

            await testInfuraObj.uploadJSONToService(
                readFileSync(
                    path.join(TEST_COL_PATH, "metadata", "1.json")
                ).toString()
            );

            expect(scope.isDone()).to.be.true;
        });
    });

    describe("Test suite for Ethereum Upload Method", () => {
        let uploadDirStub: sinon.SinonStub;
        let uploadFileStub: sinon.SinonStub;
        let uploadJSONStub: sinon.SinonStub;

        beforeEach(() => {
            mock(TEST_FAKE_DIR_STRUCTURE, {
                createCwd: true,
                createTmp: true,
            });
            uploadDirStub = sinon.stub(testInfuraObj, "uploadDirToService").resolves(TEST_API_RESPONSE.Hash);
            uploadFileStub = sinon.stub(testInfuraObj, "uploadFileToService").resolves(TEST_API_RESPONSE.Hash);
            uploadJSONStub = sinon.stub(testInfuraObj, "uploadJSONToService").resolves(TEST_API_RESPONSE.Hash);
        });

        afterEach(() => {
            mock.restore();
            uploadDirStub.restore();
            uploadFileStub.restore();
            uploadJSONStub.restore();
        });

        it("Checking Internal UploadDirToService Calls for Ethereum Collection", async function () {
            await testInfuraObj.uploadEthereumCollection(testEthereumCol);
            expect(uploadDirStub.calledTwice).to.be.true;
        });

        it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
            await testInfuraObj.uploadSingle(
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

    describe("Solana Infura Tests", () => {
        before(function(done) {
            setTimeout(done, 0);
        });

        const testSolanaCol = new SolanaCollection({
            name: TEST_COL_NAME,
            dir: TEST_COL_PATH,
            description: "This is a demo collection for NFT Toolbox",
            programId: new PublicKey("11111111111111111111111111111111"),
            account: new PublicKey("11111111111111111111111111111111"),
        });

        let uploadDirStub: sinon.SinonStub;

        beforeEach(() => {
            mock(TEST_FAKE_DIR_STRUCTURE, {
                createCwd: true,
                createTmp: true,
            });
            uploadDirStub = sinon.stub(testInfuraObj, "uploadDirToService").resolves(TEST_API_RESPONSE.Hash);
        });

        afterEach(() => {
            mock.restore();
            uploadDirStub.restore();
        });

        it("Checking Internal UploadDirToService Calls for Solana Collection", async function () {
            await testInfuraObj.uploadSolanaCollection(testSolanaCol);
            expect(uploadDirStub.calledTwice).to.be.true;
        });
    });
});