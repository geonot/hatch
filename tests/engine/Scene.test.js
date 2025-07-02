import Scene from '../../engine/scenes/Scene.js'; // Default export
import { expect } from 'chai';
import sinon from 'sinon';

describe('Scene', () => {
  let mockEngine;
  let mockAssetManager;
  let mockInputManager;
  let mockRenderingEngine;
  let mockSceneManager;
  let mockEventBus;
  let mockCamera;
  let mockHatchConfig;

  beforeEach(() => {
    // Create mocks for all engine subsystems Scene might access
    // Use sinon for spies
    mockAssetManager = { 
      loadAsset: sinon.stub().resolves(undefined), 
      loadManifest: sinon.stub().resolves(undefined) 
    };
    mockInputManager = {};
    mockCamera = { applyTransform: sinon.stub() };
    mockRenderingEngine = { camera: mockCamera, add: sinon.stub() };
    mockSceneManager = {};
    mockEventBus = { on: sinon.stub(), off: sinon.stub(), emit: sinon.stub() };
    mockHatchConfig = { setting: 'testValue', instructions: [], instructionsKey: 'KeyH' }; // Added instructions for UIManager

    const mockCanvas = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getBoundingClientRect: sinon.stub().returns({ left: 0, top: 0, width: 800, height: 600 }), // Needed by UIManager event handlers
      style: {}, // Needed by UIManager updateCursor
      width: 800, // Needed by UIManager updateBreakpoint
      height: 600 // Needed by UIManager updateBreakpoint
    };

    mockEngine = {
      assetManager: mockAssetManager,
      inputManager: mockInputManager,
      canvas: mockCanvas, // Added mock canvas
      renderingEngine: mockRenderingEngine,
      sceneManager: mockSceneManager,
      eventBus: mockEventBus,
      hatchConfig: mockHatchConfig,
    };
  });

  // No afterEach needed for sinon.restore() if not using sinon globally

  describe('constructor', () => {
    it('should throw an error if no engine is provided', () => {
      expect(() => new Scene()).to.throw("Scene constructor: An 'engine' instance is required.");
    });

    it('should correctly assign engine and subsystem accessors', () => {
      const scene = new Scene(mockEngine);
      expect(scene.engine).to.equal(mockEngine);
      expect(scene.assetManager).to.equal(mockAssetManager);
      expect(scene.inputManager).to.equal(mockInputManager);
      expect(scene.renderingEngine).to.equal(mockRenderingEngine);
      expect(scene.sceneManager).to.equal(mockSceneManager);
      expect(scene.eventBus).to.equal(mockEventBus);
    });

    it('should provide a getter for camera from renderingEngine', () => {
      const scene = new Scene(mockEngine);
      expect(scene.camera).to.equal(mockCamera);
    });

    it('should provide a null camera if renderingEngine is missing', () => {
        const leanEngine = { ...mockEngine, renderingEngine: null };
        const scene = new Scene(leanEngine);
        expect(scene.camera).to.be.null;
    });

    it('should provide undefined camera if renderingEngine.camera is missing (as per previous fix)', () => {
        const leanEngine = { ...mockEngine, renderingEngine: {} }; // RE without camera
        const scene = new Scene(leanEngine);
        expect(scene.camera).to.be.undefined;
    });

    it('should provide a getter for hatchConfig from engine', () => {
      const scene = new Scene(mockEngine);
      expect(scene.hatchConfig).to.equal(mockHatchConfig);
    });

    it('should provide a null hatchConfig if engine is missing hatchConfig', () => {
        const leanEngine = { ...mockEngine, hatchConfig: null };
        const scene = new Scene(leanEngine);
        expect(scene.hatchConfig).to.be.null;
    });
  });

  describe('Lifecycle Methods', () => {
    let scene;
    beforeEach(() => {
      scene = new Scene(mockEngine);
    });

    it('load() should be an async function and callable, resolving to undefined', async () => {
      expect(typeof scene.load).to.equal('function');
      const result = await scene.load();
      expect(result).to.be.undefined;
    });

    it('init() should be a function and callable', () => {
      expect(typeof scene.init).to.equal('function');
      const arg1 = 'test';
      const arg2 = 123;
      expect(() => scene.init(arg1, arg2)).to.not.throw();
    });

    it('enter() should be a function and callable', () => {
      expect(typeof scene.enter).to.equal('function');
      expect(() => scene.enter()).to.not.throw();
    });

    it('exit() should be a function and callable', () => {
      expect(typeof scene.exit).to.equal('function');
      expect(() => scene.exit()).to.not.throw();
    });

    it('update() should be a function and callable', () => {
      expect(typeof scene.update).to.equal('function');
      const deltaTime = 0.016;
      expect(() => scene.update(deltaTime)).to.not.throw();
    });

    it('render() should be a function and callable', () => {
      expect(typeof scene.render).to.equal('function');
      expect(() => scene.render(mockRenderingEngine)).to.not.throw();
    });

    it('destroy() should be a function and callable', () => {
      expect(typeof scene.destroy).to.equal('function');
      expect(() => scene.destroy()).to.not.throw();
    });
  });
});
