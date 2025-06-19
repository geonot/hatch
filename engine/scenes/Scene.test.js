import Scene from './Scene.js'; // Default export
// Removed: import { expect } from 'chai';
// No sinon needed if we use jest.fn() for all spies/stubs checked by expect
// import sinon from 'sinon';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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
    // Use jest.fn() for spies
    mockAssetManager = { loadAsset: jest.fn().mockResolvedValue(undefined), loadManifest: jest.fn().mockResolvedValue(undefined) };
    mockInputManager = {};
    mockCamera = { applyTransform: jest.fn() };
    mockRenderingEngine = { camera: mockCamera, add: jest.fn() };
    mockSceneManager = {};
    mockEventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
    mockHatchConfig = { setting: 'testValue' };

    mockEngine = {
      assetManager: mockAssetManager,
      inputManager: mockInputManager,
      renderingEngine: mockRenderingEngine,
      sceneManager: mockSceneManager,
      eventBus: mockEventBus,
      hatchConfig: mockHatchConfig,
    };
  });

  // No afterEach needed for sinon.restore() if not using sinon globally

  describe('constructor', () => {
    it('should throw an error if no engine is provided', () => {
      expect(() => new Scene()).toThrow("Scene constructor: An 'engine' instance is required.");
    });

    it('should correctly assign engine and subsystem accessors', () => {
      const scene = new Scene(mockEngine);
      expect(scene.engine).toBe(mockEngine);
      expect(scene.assetManager).toBe(mockAssetManager);
      expect(scene.inputManager).toBe(mockInputManager);
      expect(scene.renderingEngine).toBe(mockRenderingEngine);
      expect(scene.sceneManager).toBe(mockSceneManager);
      expect(scene.eventBus).toBe(mockEventBus);
    });

    it('should provide a getter for camera from renderingEngine', () => {
      const scene = new Scene(mockEngine);
      expect(scene.camera).toBe(mockCamera);
    });

    it('should provide a null camera if renderingEngine is missing', () => {
        const leanEngine = { ...mockEngine, renderingEngine: null };
        const scene = new Scene(leanEngine);
        expect(scene.camera).toBeNull();
    });

    it('should provide undefined camera if renderingEngine.camera is missing (as per previous fix)', () => {
        const leanEngine = { ...mockEngine, renderingEngine: {} }; // RE without camera
        const scene = new Scene(leanEngine);
        expect(scene.camera).toBeUndefined();
    });

    it('should provide a getter for hatchConfig from engine', () => {
      const scene = new Scene(mockEngine);
      expect(scene.hatchConfig).toBe(mockHatchConfig);
    });

    it('should provide a null hatchConfig if engine is missing hatchConfig', () => {
        const leanEngine = { ...mockEngine, hatchConfig: null };
        const scene = new Scene(leanEngine);
        expect(scene.hatchConfig).toBeNull();
    });
  });

  describe('Lifecycle Methods', () => {
    let scene;
    beforeEach(() => {
      scene = new Scene(mockEngine);
    });

    it('load() should be an async function and callable, resolving to undefined', async () => {
      expect(typeof scene.load).toBe('function');
      await expect(scene.load()).resolves.toBeUndefined();
    });

    it('init() should be a function and callable', () => {
      expect(typeof scene.init).toBe('function');
      const arg1 = 'test';
      const arg2 = 123;
      expect(() => scene.init(arg1, arg2)).not.toThrow();
    });

    it('enter() should be a function and callable', () => {
      expect(typeof scene.enter).toBe('function');
      expect(() => scene.enter()).not.toThrow();
    });

    it('exit() should be a function and callable', () => {
      expect(typeof scene.exit).toBe('function');
      expect(() => scene.exit()).not.toThrow();
    });

    it('update() should be a function and callable', () => {
      expect(typeof scene.update).toBe('function');
      const deltaTime = 0.016;
      expect(() => scene.update(deltaTime)).not.toThrow();
    });

    it('render() should be a function and callable', () => {
      expect(typeof scene.render).toBe('function');
      expect(() => scene.render(mockRenderingEngine)).not.toThrow();
    });

    it('destroy() should be a function and callable', () => {
      expect(typeof scene.destroy).toBe('function');
      expect(() => scene.destroy()).not.toThrow();
    });
  });
});
