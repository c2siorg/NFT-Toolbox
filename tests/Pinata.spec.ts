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
    Timestamp: "2023-07-03T12:00:00.000Z"
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

    it("Checking POST request in UploadDirToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinFileToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadDirToService(
            path.join(TEST_COL_PATH, "metadata")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in UploadFileToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinFileToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadFileToService(
            path.join(TEST_COL_PATH, "assets", "1.png")
        );

        expect(scope.isDone()).to.be.true;
    });

    it("Checking POST request in UploadJSONToService", async function () {
        const scope = nock("https://api.pinata.cloud")
            .post("/pinning/pinJSONToIPFS")
            .reply(200, TEST_API_RESPONSE);

        await testPinataObj.uploadJSONToService(
            readFileSync(
                path.join(TEST_COL_PATH, "metadata", "1.json")
            ).toString()
        );

        expect(scope.isDone()).to.be.true;
    });
});

describe("Test suite for Upload Methods", () => {
    let uploadDirStub: sinon.SinonStub;

    beforeEach(() => {
        mock(TEST_FAKE_DIR_STRUCTURE, {
            createCwd: true,
            createTmp: true,
        });
        uploadDirStub = sinon.stub(testPinataObj, "uploadDirToService").resolves(TEST_API_RESPONSE.IpfsHash);
    });

    afterEach(() => {
        mock.restore();
        sinon.restore();
    });

    it("Checking Internal UploadDirToService Calls for Ethereum", async function () {
        await testPinataObj.uploadEthereumCollection(testEthereumCol);
        expect(uploadDirStub.calledTwice).to.be.true;
        expect(uploadDirStub.firstCall.args[0]).to.include("assets");
        expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
    });

    it("Checking Internal UploadDirToService Calls for Solana", async function () {
        uploadDirStub.resetHistory();
        await testPinataObj.uploadEthereumCollection(testSolanaCol);
        expect(uploadDirStub.calledTwice).to.be.true;
        expect(uploadDirStub.firstCall.args[0]).to.include("assets");
        expect(uploadDirStub.secondCall.args[0]).to.include("metadata");
    });

    it("Checking Internal UploadFileToService and UploadJSONToService Calls", async function () {
        const fakeFile = sinon.fake.resolves(TEST_API_RESPONSE.IpfsHash);
        const fakeJSON = sinon.fake.resolves(TEST_API_RESPONSE.IpfsHash);
        sinon.replace(testPinataObj, "uploadFileToService", fakeFile);
        sinon.replace(testPinataObj, "uploadJSONToService", fakeJSON);

        await testPinataObj.uploadSingle(
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