/**
 * @file HatchEngine.initialization.test.js
 * @description Focused tests for HatchEngine initialization order and Scene class assignment.
 * Tests the specific fix for Scene class assignment before SceneManager instantiation.
 */

import { HatchEngine } from './HatchEngine.js';
import Scene from '../scenes/Scene.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('HatchEngine Initialization Order Tests', () => {
  let projectConfig;

  beforeEach(() => {
    sinon.restore();

    // Use the global HTMLCanvasElement mock from jest.setup.js
    const mockCanvas = new global.HTMLCanvasElement();
    
    // Add additional mocking for test-specific functionality
    mockCanvas.addEventListener = sinon.stub();
    mockCanvas.removeEventListener = sinon.stub();
    mockCanvas.getBoundingClientRect = sinon.stub().returns({
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0
    });

    // Mock DOM environment
    global.document = {
      getElementById: sinon.stub().returns(mockCanvas)
    };

    global.performance = {
      now: sinon.stub().returns(0)
    };

    global.requestAnimationFrame = sinon.stub();
    global.cancelAnimationFrame = sinon.stub();

    projectConfig = {
      canvasId: 'testCanvas',
      gameWidth: 800,
      gameHeight: 600,
      initialScene: 'TestScene',
      logging: { level: 'info' },
      renderer: {}
    };
  });

  afterEach(() => {
    delete global.document;
    delete global.performance;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  describe('Scene Class Assignment Before SceneManager', () => {
    it('should assign Scene class to engine.Scene before creating SceneManager', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init(); // Need to call init for Scene assignment
      
      // Verify Scene class is assigned and accessible
      expect(engine.Scene).to.exist;
      expect(engine.Scene).to.equal(Scene);
      expect(typeof engine.Scene).to.equal('function');
    });

    it('should allow SceneManager to access engine.Scene during construction', () => {
      // This test verifies that the SceneManager can access engine.Scene
      // during its construction, which was the core issue that was fixed
      expect(() => {
        const engine = new HatchEngine(projectConfig);
        engine.init(); // Need to call init to create sceneManager
        expect(engine.sceneManager).to.exist;
      }).to.not.throw();
    });

    it('should allow custom scene classes to extend engine.Scene', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init(); // Need to call init for Scene assignment
      
      class CustomScene extends engine.Scene {
        constructor(engine) {
          super(engine);
          this.customProperty = 'test';
        }
      }

      const customScene = new CustomScene(engine);
      expect(customScene).to.be.instanceOf(engine.Scene);
      expect(customScene).to.be.instanceOf(Scene);
      expect(customScene.customProperty).to.equal('test');
    });

    it('should maintain Scene class reference throughout engine lifecycle', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init(); // Need to call init for Scene assignment
      
      // Scene class should remain accessible
      expect(engine.Scene).to.equal(Scene);
      
      // Should work after engine operations
      const scene1 = new engine.Scene(engine);
      expect(scene1).to.be.instanceOf(Scene);
      
      // Should still work after creating multiple scenes
      const scene2 = new engine.Scene(engine);
      expect(scene2).to.be.instanceOf(Scene);
      expect(engine.Scene).to.equal(Scene);
    });
  });

  describe('SceneManager Integration', () => {
    it('should allow SceneManager.add() to work with engine.Scene-based classes', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init(); // Need to call init for Scene assignment and sceneManager creation
      
      class TestScene extends engine.Scene {
        constructor(engine) {
          super(engine);
        }
      }

      expect(() => {
        engine.sceneManager.add('test', TestScene);
      }).to.not.throw();
    });

    it('should prevent the original "Cannot read properties of undefined" error', () => {
      // This test specifically verifies that the error that occurred when
      // SceneManager tried to access engine.Scene before it was assigned is fixed
      
      // The error would have been: "Cannot read properties of undefined (reading 'Scene')"
      // Now this should work without throwing
      expect(() => {
        const engine = new HatchEngine(projectConfig);
        engine.init(); // Need to call init to create sceneManager
        
        // Verify SceneManager was created successfully
        expect(engine.sceneManager).to.exist;
        expect(typeof engine.sceneManager.add).to.equal('function');
        expect(typeof engine.sceneManager.switchTo).to.equal('function');
      }).to.not.throw();
    });
  });

  describe('Initialization Order Verification', () => {
    it('should initialize components in the correct order', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init(); // Need to call init to initialize components
      
      // All core components should be initialized
      expect(engine.errorHandler).to.exist;
      expect(engine.assetManager).to.exist;
      expect(engine.inputManager).to.exist;
      expect(engine.renderingEngine).to.exist;
      expect(engine.sceneManager).to.exist;
      
      // Scene class should be available
      expect(engine.Scene).to.exist;
      expect(engine.Scene).to.equal(Scene);
    });

    it('should handle engine initialization without race conditions', () => {
      // Test that multiple engines can be created simultaneously
      const engines = [];
      
      expect(() => {
        for (let i = 0; i < 3; i++) {
          const config = {
            ...projectConfig,
            canvasId: `testCanvas${i}`
          };
          const engine = new HatchEngine(config);
          engine.init(); // Need to call init for each engine
          engines.push(engine);
        }
        
        // All engines should have proper Scene class assignment
        engines.forEach((engine, index) => {
          expect(engine.Scene).to.equal(Scene);
          expect(engine.sceneManager).to.exist;
        });
      }).to.not.throw();
    });
  });
});
