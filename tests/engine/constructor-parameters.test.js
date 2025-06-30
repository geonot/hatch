/**
 * @file constructor-parameters.test.js
 * @description Tests for constructor parameter fixes in TileManager and Sprite classes.
 * Tests the specific fixes for constructor parameter patterns (separate params vs options object).
 */

import { TileManager } from '../../engine/tiles/TileManager.js';
import { Sprite } from '../../engine/rendering/Sprite.js';
import { GridManager } from '../../engine/grid/GridManager.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Constructor Parameter Tests', () => {
  let mockEngine;
  let mockGridManager;
  let mockImage;

  beforeEach(() => {
    sinon.restore();

    // Mock engine
    mockEngine = {
      assetManager: {
        loadAsset: sinon.stub().resolves({}),
        get: sinon.stub().returns(null)
      },
      renderingEngine: {
        camera: { applyTransform: sinon.stub() },
        add: sinon.stub(),
        width: 800,
        height: 600
      },
      eventBus: {
        on: sinon.stub(),
        off: sinon.stub(),
        emit: sinon.stub()
      },
      errorHandler: {
        critical: sinon.stub(),
        error: sinon.stub(),
        warn: sinon.stub(),
        info: sinon.stub(),
        debug: sinon.stub()
      }
    };

    // Mock GridManager
    mockGridManager = new GridManager(mockEngine, {
      numCols: 10,
      numRows: 10,
      tileWidth: 32,
      tileHeight: 32
    });

    // Mock Image
    mockImage = {
      naturalWidth: 32,
      naturalHeight: 32,
      width: 32,
      height: 32,
      src: 'test-image.png'
    };
  });

  describe('TileManager Constructor Parameter Fix', () => {
    it('should accept engine and gridManager as separate parameters (FIXED)', () => {
      // This is the CORRECT way after the fix
      expect(() => {
        const tileManager = new TileManager(mockEngine, mockGridManager);
        expect(tileManager).to.be.instanceOf(TileManager);
        expect(tileManager.engine).to.equal(mockEngine);
        expect(tileManager.gridManager).to.equal(mockGridManager);
      }).to.not.throw();
    });

    it('should reject options object style constructor (DEPRECATED)', () => {
      // This is the OLD way that should no longer work
      expect(() => {
        new TileManager({ 
          engine: mockEngine, 
          gridManager: mockGridManager 
        });
      }).to.throw();
    });

    it('should require both engine and gridManager parameters', () => {
      // Should throw if missing parameters
      expect(() => {
        new TileManager(mockEngine); // Missing gridManager
      }).to.throw();

      expect(() => {
        new TileManager(); // Missing both
      }).to.throw();

      expect(() => {
        new TileManager(null, mockGridManager); // Invalid engine
      }).to.throw();

      expect(() => {
        new TileManager(mockEngine, null); // Invalid gridManager
      }).to.throw();
    });

    it('should initialize correctly with separate parameters', () => {
      const tileManager = new TileManager(mockEngine, mockGridManager);
      
      expect(tileManager.engine).to.equal(mockEngine);
      expect(tileManager.gridManager).to.equal(mockGridManager);
      expect(tileManager.tiles).to.exist;
      expect(tileManager.tileTypes).to.exist;
    });

    it('should maintain backwards compatibility detection', () => {
      // Test that old-style calls are properly detected and rejected
      const oldStyleOptions = { engine: mockEngine, gridManager: mockGridManager };
      
      expect(() => {
        new TileManager(oldStyleOptions);
      }).to.throw(/engine.*instance.*required/i);
    });
  });

  describe('Sprite Constructor Parameter Fix', () => {
    it('should accept engine, source, and options as separate parameters (FIXED)', () => {
      // This is the CORRECT way after the fix
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
        expect(sprite.x).to.equal(100);
        expect(sprite.y).to.equal(100);
      }).to.not.throw();
    });

    it('should reject options object style constructor (DEPRECATED)', () => {
      // This is the OLD way that should no longer work
      expect(() => {
        new Sprite({ 
          engine: mockEngine,
          image: mockImage, 
          x: 100, 
          y: 100 
        });
      }).to.throw();
    });

    it('should require engine and source parameters', () => {
      // Should throw if missing required parameters
      expect(() => {
        new Sprite(mockEngine); // Missing source
      }).to.throw();

      expect(() => {
        new Sprite(); // Missing all
      }).to.throw();

      expect(() => {
        new Sprite(null, mockImage, {}); // Invalid engine
      }).to.throw();

      expect(() => {
        new Sprite(mockEngine, null, {}); // Invalid source
      }).to.throw();
    });

    it('should work with minimal options', () => {
      // Should work with just engine and source
      expect(() => {
        const sprite = new Sprite(mockEngine, mockImage);
        expect(sprite).to.be.instanceOf(Sprite);
        expect(sprite.engine).to.equal(mockEngine);
        expect(sprite.source).to.equal(mockImage);
      }).to.not.throw();
    });

    it('should work with empty options object', () => {
      expect(() => {
        const sprite = new Sprite(mockEngine, mockImage, {});
        expect(sprite).to.be.instanceOf(Sprite);
      }).to.not.throw();
    });

    it('should apply options correctly', () => {
      const options = {
        x: 150,
        y: 200,
        width: 64,
        height: 64,
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: Math.PI / 4,
        scaleX: 2,
        scaleY: 2,
        alpha: 0.8
      };

      const sprite = new Sprite(mockEngine, mockImage, options);
      
      expect(sprite.x).to.equal(150);
      expect(sprite.y).to.equal(200);
      expect(sprite.width).to.equal(64);
      expect(sprite.height).to.equal(64);
      expect(sprite.anchorX).to.equal(0.5);
      expect(sprite.anchorY).to.equal(0.5);
      expect(sprite.rotation).to.equal(Math.PI / 4);
      expect(sprite.scaleX).to.equal(2);
      expect(sprite.scaleY).to.equal(2);
      expect(sprite.alpha).to.equal(0.8);
    });

    it('should maintain backwards compatibility detection', () => {
      // Test that old-style calls are properly detected and rejected
      const oldStyleOptions = { 
        engine: mockEngine,
        image: mockImage, 
        x: 100, 
        y: 100 
      };
      
      expect(() => {
        new Sprite(oldStyleOptions);
      }).to.throw(/source.*required/i);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support typical scene initialization pattern', () => {
      // Test the pattern used in actual scene implementations
      expect(() => {
        // Create grid and tile manager
        const gridManager = new GridManager(mockEngine, {
          numCols: 8,
          numRows: 8,
          tileWidth: 40,
          tileHeight: 40
        });

        const tileManager = new TileManager(mockEngine, gridManager);

        // Create sprites for game objects
        const playerSprite = new Sprite(mockEngine, mockImage, {
          x: 100,
          y: 100,
          width: 32,
          height: 32
        });

        const uiSprite = new Sprite(mockEngine, mockImage, {
          x: 10,
          y: 10,
          width: 16,
          height: 16
        });

        expect(tileManager).to.be.instanceOf(TileManager);
        expect(playerSprite).to.be.instanceOf(Sprite);
        expect(uiSprite).to.be.instanceOf(Sprite);
      }).to.not.throw();
    });

    it('should support Minesweeper-style initialization', () => {
      // Test the exact pattern used in Minesweeper implementation
      expect(() => {
        const gridManager = new GridManager(mockEngine, {
          numCols: 10,
          numRows: 10,
          tileWidth: 30,
          tileHeight: 30
        });

        const tileManager = new TileManager(mockEngine, gridManager);

        // Create UI sprites
        const timerSprite = new Sprite(mockEngine, mockImage, {
          x: 50,
          y: 10,
          width: 100,
          height: 30
        });

        const mineCountSprite = new Sprite(mockEngine, mockImage, {
          x: 200,
          y: 10,
          width: 100,
          height: 30
        });

        expect(gridManager.numCols).to.equal(10);
        expect(tileManager.gridManager).to.equal(gridManager);
        expect(timerSprite.x).to.equal(50);
        expect(mineCountSprite.x).to.equal(200);
      }).to.not.throw();
    });
  });

  describe('Error Messages Quality', () => {
    it('should provide helpful error messages for TileManager wrong usage', () => {
      try {
        new TileManager({ engine: mockEngine, gridManager: mockGridManager });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('engine');
        expect(error.message).to.include('required');
      }
    });

    it('should provide helpful error messages for Sprite wrong usage', () => {
      try {
        new Sprite({ engine: mockEngine, image: mockImage, x: 100, y: 100 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('source');
        expect(error.message).to.include('required');
      }
    });
  });
});
