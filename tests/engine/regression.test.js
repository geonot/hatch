/**
 * @file regression.test.js
 * @description Comprehensive regression tests for all issues fixed during Minesweeper implementation.
 * These tests ensure that the framework fixes don't regress in the future.
 */

import { HatchEngine } from './core/HatchEngine.js';
import { TileManager } from './tiles/TileManager.js';
import { Sprite } from './rendering/Sprite.js';
import { GridManager } from './grid/GridManager.js';
import Scene from './scenes/Scene.js';
import { InputEvents } from './core/Constants.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Regression Tests for Framework Fixes', () => {
  let mockEngine;
  let mockCanvas;
  let projectConfig;

  beforeEach(() => {
    sinon.restore();

    // Use the global HTMLCanvasElement mock from jest.setup.js
    mockCanvas = new global.HTMLCanvasElement();
    
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

    global.document = {
      getElementById: (id) => {
        if (id === 'testCanvas' || id === 'gameCanvas') {
          return mockCanvas;
        }
        return null;
      }
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
      logging: { level: 'info' }, // Test lowercase
      renderer: {}
    };

    // Basic mock engine for component tests
    mockEngine = {
      assetManager: {
        loadAsset: sinon.stub().resolves({}),
        get: sinon.stub().returns(null)
      },
      inputManager: {},
      renderingEngine: {
        camera: { applyTransform: sinon.stub() },
        add: sinon.stub(),
        width: 800,
        height: 600
      },
      sceneManager: {},
      eventBus: {
        on: sinon.stub(),
        off: sinon.stub(),
        emit: sinon.stub()
      },
      hatchConfig: projectConfig,
      errorHandler: {
        critical: sinon.stub(),
        error: sinon.stub(),
        warn: sinon.stub(),
        info: sinon.stub(),
        debug: sinon.stub()
      }
    };
  });

  afterEach(() => {
    delete global.document;
    delete global.performance;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  describe('Issue #1: HatchEngine Scene Class Assignment Order', () => {
    it('should have Scene class available before SceneManager initialization', () => {
      // This test verifies that the Scene class is assigned to engine.Scene
      // before the SceneManager is created, preventing the "Cannot read properties of undefined" error
      const engine = new HatchEngine(projectConfig);
      
      // Initialize the engine to properly set up Scene class assignment
      engine.init();
      
      // Verify Scene class is properly assigned
      expect(engine.Scene).to.exist;
      expect(typeof engine.Scene).to.equal('function');
      expect(engine.Scene.name).to.equal('Scene');
      
      // Verify SceneManager can access engine.Scene
      expect(engine.sceneManager).to.exist;
      
      // Test that a scene can be created using engine.Scene
      const testScene = new engine.Scene(engine);
      expect(testScene).to.be.instanceOf(Scene);
    });

    it('should allow SceneManager to create scenes using engine.Scene', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init();
      
      // Mock scene class
      class TestScene extends engine.Scene {
        constructor(engine) {
          super(engine);
        }
      }
      
      // This should work without throwing errors
      expect(() => {
        engine.sceneManager.add('test', TestScene);
      }).to.not.throw();
    });
  });

  describe('Issue #2: InputEvents Import in MouseInput', () => {
    it('should be able to import InputEvents from Constants', () => {
      // This test verifies that InputEvents can be imported properly
      // (the JSDoc comment fix allows the import statement to execute)
      expect(InputEvents).to.exist;
      expect(typeof InputEvents).to.equal('object');
      
      // Verify key InputEvents constants exist
      expect(InputEvents.GRID_MOUSEDOWN).to.be.a('string');
      expect(InputEvents.GRID_MOUSEUP).to.be.a('string');
      expect(InputEvents.GRID_MOUSEMOVE).to.be.a('string');
      expect(InputEvents.GRID_MOUSEENTER).to.be.a('string');
      expect(InputEvents.GRID_MOUSELEAVE).to.be.a('string');
    });

    it('should have consistent InputEvents naming convention', () => {
      // Verify all InputEvents follow the 'input:grid:' prefix pattern
      const gridEvents = [
        InputEvents.GRID_MOUSEDOWN,
        InputEvents.GRID_MOUSEUP,
        InputEvents.GRID_MOUSEMOVE,
        InputEvents.GRID_MOUSEENTER,
        InputEvents.GRID_MOUSELEAVE
      ];

      gridEvents.forEach(eventName => {
        expect(eventName).to.match(/^input:grid:/, `Event ${eventName} should follow input:grid: naming convention`);
      });
    });
  });

  describe('Issue #3: Import/Export Type Mismatches', () => {
    it('should import TileManager as named export', () => {
      // Verify TileManager is properly exported as named export
      expect(TileManager).to.exist;
      expect(typeof TileManager).to.equal('function');
      expect(TileManager.name).to.equal('TileManager');
    });

    it('should import Sprite as named export', () => {
      // Verify Sprite is properly exported as named export
      expect(Sprite).to.exist;
      expect(typeof Sprite).to.equal('function');
      expect(Sprite.name).to.equal('Sprite');
    });

    it('should import Scene as default export', () => {
      // Verify Scene is properly exported as default export
      expect(Scene).to.exist;
      expect(typeof Scene).to.equal('function');
      expect(Scene.name).to.equal('Scene');
    });
  });

  describe('Issue #4: TileManager Constructor Parameters', () => {
    it('should accept engine and gridManager as separate parameters', () => {
      const gridManager = new GridManager(mockEngine, {
        numCols: 10,
        numRows: 10,
        tileWidth: 32,
        tileHeight: 32
      });

      // This should work with separate parameters (not an options object)
      expect(() => {
        const tileManager = new TileManager(mockEngine, gridManager);
        expect(tileManager).to.be.instanceOf(TileManager);
        expect(tileManager.engine).to.equal(mockEngine);
        expect(tileManager.gridManager).to.equal(gridManager);
      }).to.not.throw();
    });

    it('should reject old options object style constructor', () => {
      const gridManager = new GridManager(mockEngine, {
        numCols: 10,
        numRows: 10,
        tileWidth: 32,
        tileHeight: 32
      });

      // This old style should fail (passing options object instead of separate params)
      expect(() => {
        new TileManager({ engine: mockEngine, gridManager: gridManager });
      }).to.throw();
    });
  });

  describe('Issue #5: Sprite Constructor Parameters', () => {
    it('should accept engine, source, and options as separate parameters', () => {
      const mockImage = {
        naturalWidth: 32,
        naturalHeight: 32,
        width: 32,
        height: 32
      };

      // This should work with separate parameters
      expect(() => {
        const sprite = new Sprite(mockEngine, mockImage, {
          x: 100,
          y: 100,
          width: 32,
          height: 32
        });
        expect(sprite).to.be.instanceOf(Sprite);
        expect(sprite.engine).to.equal(mockEngine);
        expect(sprite.source).to.equal(mockImage);
      }).to.not.throw();
    });

    it('should reject old options object style constructor', () => {
      const mockImage = {
        naturalWidth: 32,
        naturalHeight: 32,
        width: 32,
        height: 32
      };

      // This old style should fail (passing single options object)
      expect(() => {
        new Sprite({ 
          engine: mockEngine,
          image: mockImage, 
          x: 100, 
          y: 100 
        });
      }).to.throw();
    });
  });

  describe('Issue #6: Logging Level Case Sensitivity', () => {
    it('should accept lowercase logging levels in config', () => {
      const configWithLowercase = {
        canvasId: 'testCanvas',
        gameWidth: 800,
        gameHeight: 600,
        initialScene: 'TestScene',
        logging: { level: 'info' }, // lowercase
        renderer: {}
      };

      expect(() => {
        const engine = new HatchEngine(configWithLowercase);
        expect(engine.hatchConfig.logging.level).to.equal('info');
      }).to.not.throw();
    });

    it('should handle various case formats for logging levels', () => {
      const testCases = ['info', 'INFO', 'warn', 'WARN', 'error', 'ERROR', 'debug', 'DEBUG'];
      
      testCases.forEach(level => {
        const config = {
          canvasId: 'testCanvas',
          gameWidth: 800,
          gameHeight: 600,
          initialScene: 'TestScene',
          logging: { level: level },
          renderer: {}
        };

        expect(() => {
          const engine = new HatchEngine(config);
          expect(engine.hatchConfig.logging.level).to.equal(level);
        }).to.not.throw(`Failed for logging level: ${level}`);
      });
    });
  });

  describe('Integration Test: Full Scene Creation Flow', () => {
    it('should create a complete scene with TileManager and Sprites without errors', () => {
      // This integration test verifies that all the fixes work together
      const engine = new HatchEngine(projectConfig);
      engine.init();
      
      class TestScene extends engine.Scene {
        constructor(engine) {
          super(engine);
          this.gridManager = null;
          this.tileManager = null;
          this.sprites = [];
        }

        init() {
          // Create GridManager
          this.gridManager = new GridManager(this.engine, {
            numCols: 5,
            numRows: 5,
            tileWidth: 32,
            tileHeight: 32
          });

          // Create TileManager with correct constructor parameters
          this.tileManager = new TileManager(this.engine, this.gridManager);

          // Create a Sprite with correct constructor parameters
          const mockImage = {
            naturalWidth: 32,
            naturalHeight: 32,
            width: 32,
            height: 32
          };

          const sprite = new Sprite(this.engine, mockImage, {
            x: 100,
            y: 100,
            width: 32,
            height: 32
          });

          this.sprites.push(sprite);
        }
      }

      // Test the complete flow
      expect(() => {
        engine.sceneManager.add('test', TestScene);
        const scene = new TestScene(engine);
        scene.init();
        
        expect(scene.gridManager).to.be.instanceOf(GridManager);
        expect(scene.tileManager).to.be.instanceOf(TileManager);
        expect(scene.sprites).to.have.length(1);
        expect(scene.sprites[0]).to.be.instanceOf(Sprite);
      }).to.not.throw();
    });
  });

  describe('Minesweeper Specific Tests', () => {
    it('should handle Minesweeper config structure without errors', () => {
      const minesweeperConfig = {
        canvasId: 'gameCanvas',
        gameWidth: 800,
        gameHeight: 600,
        initialScene: 'MinesweeperScene',
        logging: { level: 'info' }, // lowercase as fixed
        renderer: {
          backgroundColor: '#f0f0f0'
        }
      };

      expect(() => {
        const engine = new HatchEngine(minesweeperConfig);
        expect(engine).to.be.instanceOf(HatchEngine);
        expect(engine.hatchConfig.logging.level).to.equal('info');
      }).to.not.throw();
    });

    it('should support Minesweeper scene creation pattern', () => {
      const engine = new HatchEngine(projectConfig);
      engine.init();

      class MinesweeperScene extends engine.Scene {
        constructor(engine) {
          super(engine);
          this.gridManager = null;
          this.tileManager = null;
          this.gameState = 'ready';
        }

        init() {
          // Minesweeper grid setup
          this.gridManager = new GridManager(this.engine, {
            numCols: 10,
            numRows: 10,
            tileWidth: 30,
            tileHeight: 30
          });

          this.tileManager = new TileManager(this.engine, this.gridManager);

          // Define Minesweeper tile types
          this.tileManager.defineTileType('hidden', { color: '#c0c0c0' });
          this.tileManager.defineTileType('revealed', { color: '#e0e0e0' });
          this.tileManager.defineTileType('mine', { color: '#ff0000' });
          this.tileManager.defineTileType('flagged', { color: '#ffff00' });
        }
      }

      expect(() => {
        engine.sceneManager.add('minesweeper', MinesweeperScene);
        const scene = new MinesweeperScene(engine);
        scene.init();
        
        expect(scene.gridManager.numCols).to.equal(10);
        expect(scene.gridManager.numRows).to.equal(10);
        expect(scene.tileManager).to.be.instanceOf(TileManager);
        expect(scene.gameState).to.equal('ready');
      }).to.not.throw();
    });
  });
});
