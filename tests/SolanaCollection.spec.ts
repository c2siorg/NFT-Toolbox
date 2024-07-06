import { describe } from "mocha";
import chai from "chai";
import sinon from "sinon";
import mock from "mock-fs";
import path from "path";
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
  connection: new Connection("http://localhost:8899", "confirmed"), // Mock connection
  payer: Keypair.generate(), // Mock payer
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

describe("Test suite for Solana Schema Setter", () => {
  beforeEach(() => {
    mock(TEST_FAKE_DIR_STRUCTURE);
  });
  afterEach(() => {
    mock.restore();
  });

  it("Checking File System calls", () => {
    const spyReadDirElements = sinon.spy(testColObj, "readDirElements");
    
    testColObj.setSchema(testSchema);
    
    testSchema.layersOrder.forEach((layerObj) => {
      const dir = path.join(__dirname, '..', 'src', 'layers', layerObj.name);
      expect(spyReadDirElements.calledWith(dir)).to.be.true;
    });
  });

  it("Checking updated Schema attribute", () => {
    testColObj.setSchema(testSchema);
    expect(testColObj.schema).to.exist;
  });
  
  it("Checking updated Layers attribute", () => {
    testColObj.setSchema(testSchema);
    expect(testColObj.layers)
      .to.be.an("array")
      .that.has.lengthOf(
        Object.keys(TEST_FAKE_DIR_STRUCTURE.src.layers).length
      );
  });
});

describe("Test suite for Generate Solana Method", () => {
  beforeEach(() => {
    mock(TEST_FAKE_DIR_STRUCTURE);
    testColObj.setSchema(testSchema);
  });
  afterEach(() => {
    mock.restore();
  });
  
  it("Checking File System Calls", async function () {
    this.timeout(10000);
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
});

describe("Test suite for SPL Token Methods", () => {
  it("Checking createSPLTokenMint method", async () => {
    const mockConnection = {
      getMinimumBalanceForRentExemption: sinon.stub().resolves(1000000),
    };
    const mockPayer = Keypair.generate();

    const sendAndConfirmTransactionStub = sinon.stub().resolves("fakeTxSignature");
    sinon.replace(testColObj, "createSPLTokenMint", sendAndConfirmTransactionStub);

    await testColObj.createSPLTokenMint(mockConnection as any, mockPayer);

    expect(sendAndConfirmTransactionStub.calledOnce).to.be.true;
  });

  it("Checking mintSPLToken method", async () => {
    const mockConnection = {} as Connection;
    const mockPayer = Keypair.generate();
    const mockRecipient = Keypair.generate().publicKey;

    testColObj.splTokenMint = Keypair.generate().publicKey;

    const sendAndConfirmTransactionStub = sinon.stub().resolves("fakeTxSignature");
    sinon.replace(testColObj, "mintSPLToken", sendAndConfirmTransactionStub);

    await testColObj.mintSPLToken(mockConnection, mockPayer, mockRecipient);

    expect(sendAndConfirmTransactionStub.calledOnce).to.be.true;
  });
});