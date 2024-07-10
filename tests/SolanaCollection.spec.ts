import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import path from "path";
import fs from "fs";
import canvas from "canvas";
import { Collection } from "../src/chains/Solana/contracts/SolanaCollection";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";

const expect = chai.expect;

const TEST_COL_NAME = "Test Solana Collection";
const TEST_COL_PATH = path.join(process.cwd(), "fake_dir");
const TEST_SCHEMA_SIZE = 5;
const TEST_IMG = path.join(__dirname, "test.png");
const TEST_FAKE_DIR_STRUCTURE = {
  src: {
    layers: {
      layer1: {
        "l1e1.png": mock.load(TEST_IMG),
        "l1e2.png": mock.load(TEST_IMG),
      },
      layer2: {
        "l2e1#1.png": mock.load(TEST_IMG),
        "l2e2#2.png": mock.load(TEST_IMG),
      },
      layer3: {
        "l3e1.png": mock.load(TEST_IMG),
        "l3e2#5.png": mock.load(TEST_IMG),
      },
    },
  },
};

const testSchema = {
  dir: path.join(process.cwd(), "src", "layers"),
  size: TEST_SCHEMA_SIZE,
  layersOrder: [{ name: "layer1" }, { name: "layer2" }, { name: "layer3" }],
  format: {
    width: 512,
    height: 512,
    smoothing: false,
  },
  background: {
    generate: false,
  },
  dnaCollisionTolerance: TEST_SCHEMA_SIZE * 10,
  rarityDelimiter: "#",
  rarityDefault: "1",
  shuffleIndexes: true,
  connection: new Connection("http://localhost:8899", "confirmed"), 
  payer: Keypair.generate(), 
};

const programId = new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");
const account = new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");

const testColObj = new Collection({
  name: TEST_COL_NAME,
  dir: TEST_COL_PATH,
  description: "This is a Solana Test Collection",
  programId,
  account,
});

describe("Test suite for Solana Collection", () => {
  beforeEach(() => {
    mock(TEST_FAKE_DIR_STRUCTURE);
  });
  afterEach(() => {
    mock.restore();
    sinon.restore();
  });

  it("Checking Collection Initialization", () => {
    expect(testColObj.name).to.equal(TEST_COL_NAME);
    expect(testColObj.dir).to.equal(TEST_COL_PATH);
    expect(testColObj.programId).to.deep.equal(programId);
    expect(testColObj.account).to.deep.equal(account);
  });

  it("Checking Schema Setter", () => {
    const spyReadDirElements = sinon.spy(testColObj, "readDirElements");
    
    testColObj.setSchema(testSchema);
    
    testSchema.layersOrder.forEach((layerObj) => {
      const dir = path.join(__dirname, '..', 'src', 'layers', layerObj.name);
      expect(spyReadDirElements.calledWith(dir)).to.be.true;
    });

    expect(testColObj.schema).to.exist;
    expect(testColObj.layers)
      .to.be.an("array")
      .that.has.lengthOf(
        Object.keys(TEST_FAKE_DIR_STRUCTURE.src.layers).length
      );
  });
  
  it("Checking Generate Method", async function () {
    this.timeout(10000);
    testColObj.setSchema(testSchema);

    const mockCol = sinon.mock(testColObj);
    const expInitializeDir = mockCol.expects("initializeDir");
    const expSaveImage = mockCol.expects("saveImage");
    const expSaveMetadata = mockCol.expects("saveMetadata");
    expInitializeDir.exactly(1);
    expSaveImage.exactly(TEST_SCHEMA_SIZE);
    expSaveMetadata.exactly(TEST_SCHEMA_SIZE);

    const fakeLoadImage = sinon.fake.returns(
      new Promise<canvas.Image>(async (resolve) => {
        const image = await canvas.loadImage(TEST_IMG);
        resolve(image);
      })
    );
    sinon.replace(testColObj, "loadImage", fakeLoadImage);

    await testColObj.generate();

    mockCol.verify();
  });

  it("Checking updateMetadataWithCID Method", () => {
    const fakeMetadataDir = {
      "1.json": '{"name": "Test NFT 1", "image": "old_image_url"}',
      "2.json": '{"name": "Test NFT 2", "image": "old_image_url"}',
    };

    mock({
      [path.join(TEST_COL_PATH, "metadata")]: fakeMetadataDir,
    });

    testColObj.setBaseURL("https://example.com");
    testColObj.setAssetsDirCID("QmTest123");

    testColObj.updateMetadataWithCID();

    Object.keys(fakeMetadataDir).forEach((fileName) => {
      const filePath = path.join(TEST_COL_PATH, "metadata", fileName);
      const updatedContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(updatedContent.image).to.equal(`https://example.com/QmTest123/${path.parse(fileName).name}.png`);
    });
  });
});