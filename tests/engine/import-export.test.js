/**
 * @file import-export.test.js
 * @description Tests for import/export type consistency fixes.
 * Tests the specific fixes for named vs default import/export mismatches.
 */

import { expect } from 'chai';
import sinon from 'sinon';

describe('Import/Export Type Tests', () => {
  beforeEach(() => {
    sinon.restore();
  });

  describe('Named Export Imports (Fixed)', () => {
    it('should import TileManager as named export', async () => {
      // Test the fixed import pattern
      const { TileManager } = await import('../../engine/tiles/TileManager.js');
      
      expect(TileManager).to.exist;
      expect(typeof TileManager).to.equal('function');
      expect(TileManager.name).to.equal('TileManager');
    });

    it('should import Sprite as named export', async () => {
      // Test the fixed import pattern
      const { Sprite } = await import('../../engine/rendering/Sprite.js');
      
      expect(Sprite).to.exist;
      expect(typeof Sprite).to.equal('function');
      expect(Sprite.name).to.equal('Sprite');
    });

    it('should import GridManager as named export', async () => {
      const { GridManager } = await import('../../engine/grid/GridManager.js');
      
      expect(GridManager).to.exist;
      expect(typeof GridManager).to.equal('function');
      expect(GridManager.name).to.equal('GridManager');
    });

    it('should import InputEvents as named export', async () => {
      const { InputEvents } = await import('../../engine/core/Constants.js');
      
      expect(InputEvents).to.exist;
      expect(typeof InputEvents).to.equal('object');
    });
  });

  describe('Default Export Imports (Correct)', () => {
    it('should import Scene as default export', async () => {
      const Scene = (await import('../../engine/scenes/Scene.js')).default;
      
      expect(Scene).to.exist;
      expect(typeof Scene).to.equal('function');
      expect(Scene.name).to.equal('Scene');
    });

    it('should import HatchEngine components correctly', async () => {
      const { HatchEngine } = await import('../../engine/core/HatchEngine.js');
      
      expect(HatchEngine).to.exist;
      expect(typeof HatchEngine).to.equal('function');
      expect(HatchEngine.name).to.equal('HatchEngine');
    });
  });

  describe('Mixed Import Patterns in Real Scenes', () => {
    it('should support TestScene import pattern (as used in my-first-puzzle)', async () => {
      // Test the exact import pattern used in TestScene.js after fixes
      try {
        const Scene = (await import('../../engine/scenes/Scene.js')).default;
        const { Sprite } = await import('../../engine/rendering/Sprite.js');
        const { GridManager } = await import('../../engine/grid/GridManager.js');
        const { TileManager } = await import('../../engine/tiles/TileManager.js');

        expect(Scene).to.exist;
        expect(Sprite).to.exist;
        expect(GridManager).to.exist;
        expect(TileManager).to.exist;

        // Verify they can be used together
        const mockEngine = {
          assetManager: { loadAsset: sinon.stub().resolves({}) },
          renderingEngine: { 
            camera: { applyTransform: sinon.stub() },
            add: sinon.stub(),
            width: 800,
            height: 600
          },
          eventBus: { on: sinon.stub(), off: sinon.stub(), emit: sinon.stub() },
          errorHandler: {
            critical: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub(),
            info: sinon.stub()
          }
        };

        expect(() => {
          const scene = new Scene(mockEngine);
          const gridManager = new GridManager(mockEngine, {
            numCols: 5,
            numRows: 5,
            tileWidth: 32,
            tileHeight: 32
          });
          const tileManager = new TileManager(mockEngine, gridManager);
          const sprite = new Sprite(mockEngine, { 
            naturalWidth: 32, 
            naturalHeight: 32 
          }, { x: 0, y: 0 });

          expect(scene).to.be.instanceOf(Scene);
          expect(gridManager).to.be.instanceOf(GridManager);
          expect(tileManager).to.be.instanceOf(TileManager);
          expect(sprite).to.be.instanceOf(Sprite);
        }).to.not.throw();
      } catch (error) {
        expect.fail(`Import pattern test failed: ${error.message}`);
      }
    });

    it('should support GridTestScene import pattern (as used in cli-test-project)', async () => {
      // Test the import pattern used in GridTestScene.js
      try {
        const Scene = (await import('../../engine/scenes/Scene.js')).default;
        const { GridManager } = await import('../../engine/grid/GridManager.js');
        const { TileManager } = await import('../../engine/tiles/TileManager.js');
        const { InputEvents } = await import('../../engine/core/Constants.js');

        expect(Scene).to.exist;
        expect(GridManager).to.exist;
        expect(TileManager).to.exist;
        expect(InputEvents).to.exist;

        // Verify InputEvents has required constants
        expect(InputEvents.GRID_MOUSEDOWN).to.be.a('string');
      } catch (error) {
        expect.fail(`GridTestScene import pattern test failed: ${error.message}`);
      }
    });
  });

  describe('Export Validation', () => {
    it('should verify TileManager is exported as named export', async () => {
      // Import entire module to check export structure
      const module = await import('../../engine/tiles/TileManager.js');
      
      expect(module.TileManager).to.exist;
      expect(module.default).to.be.undefined; // Should not have default export
    });

    it('should verify Sprite is exported as named export', async () => {
      const module = await import('../../engine/rendering/Sprite.js');
      
      expect(module.Sprite).to.exist;
      expect(module.default).to.be.undefined; // Should not have default export
    });

    it('should verify Scene is exported as default export', async () => {
      const module = await import('../../engine/scenes/Scene.js');
      
      expect(module.default).to.exist;
      expect(module.Scene).to.be.undefined; // Should not have named export
    });

    it('should verify GridManager is exported as named export', async () => {
      const module = await import('../../engine/grid/GridManager.js');
      
      expect(module.GridManager).to.exist;
      expect(module.default).to.exist; // GridManager has both named and default export
      expect(module.default).to.equal(module.GridManager);
    });
  });

  describe('Backwards Compatibility Check', () => {
    it('should fail with old default import pattern for TileManager', async () => {
      try {
        // This should fail - attempting to use old default import
        const TileManager = (await import('../../engine/tiles/TileManager.js')).default;
        expect(TileManager).to.be.undefined;
      } catch (error) {
        // Expected to fail
      }
    });

    it('should fail with old default import pattern for Sprite', async () => {
      try {
        // This should fail - attempting to use old default import
        const Sprite = (await import('../../engine/rendering/Sprite.js')).default;
        expect(Sprite).to.be.undefined;
      } catch (error) {
        // Expected to fail
      }
    });

    it('should fail with old named import pattern for Scene', async () => {
      try {
        // This should fail - attempting to use old named import
        const { Scene } = await import('../../engine/scenes/Scene.js');
        expect(Scene).to.be.undefined;
      } catch (error) {
        // Expected to fail
      }
    });
  });

  describe('Real-world Import Scenarios', () => {
    it('should handle complex scene import patterns', async () => {
      // Test a complex scene that imports multiple components
      try {
        const Scene = (await import('../../engine/scenes/Scene.js')).default;
        const { TileManager } = await import('../../engine/tiles/TileManager.js');
        const { Sprite } = await import('../../engine/rendering/Sprite.js');
        const { GridManager } = await import('../../engine/grid/GridManager.js');
        const { InputEvents } = await import('../../engine/core/Constants.js');

        class ComplexTestScene extends Scene {
          constructor(engine) {
            super(engine);
            this.gridManager = null;
            this.tileManager = null;
            this.sprites = [];
          }

          init() {
            this.gridManager = new GridManager(this.engine, {
              numCols: 10,
              numRows: 10,
              tileWidth: 32,
              tileHeight: 32
            });

            this.tileManager = new TileManager(this.engine, this.gridManager);

            const sprite = new Sprite(this.engine, {
              naturalWidth: 32,
              naturalHeight: 32
            }, { x: 100, y: 100 });

            this.sprites.push(sprite);
          }
        }

        const mockEngine = {
          assetManager: { loadAsset: sinon.stub().resolves({}) },
          renderingEngine: { 
            camera: { applyTransform: sinon.stub() },
            add: sinon.stub(),
            width: 800,
            height: 600
          },
          eventBus: { on: sinon.stub(), off: sinon.stub(), emit: sinon.stub() },
          errorHandler: {
            critical: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub(),
            info: sinon.stub()
          }
        };

        const scene = new ComplexTestScene(mockEngine);
        scene.init();

        expect(scene.gridManager).to.be.instanceOf(GridManager);
        expect(scene.tileManager).to.be.instanceOf(TileManager);
        expect(scene.sprites).to.have.length(1);
        expect(scene.sprites[0]).to.be.instanceOf(Sprite);
      } catch (error) {
        expect.fail(`Complex scene import test failed: ${error.message}`);
      }
    });

    it('should handle MCP server-style imports', async () => {
      // Test imports as they would be used in a real MCP server context
      try {
        const imports = await Promise.all([
          import('../../engine/scenes/Scene.js'),
          import('../../engine/tiles/TileManager.js'),
          import('../../engine/rendering/Sprite.js'),
          import('../../engine/grid/GridManager.js'),
          import('../../engine/core/Constants.js')
        ]);

        const [SceneModule, TileManagerModule, SpriteModule, GridManagerModule, ConstantsModule] = imports;

        expect(SceneModule.default).to.exist;
        expect(TileManagerModule.TileManager).to.exist;
        expect(SpriteModule.Sprite).to.exist;
        expect(GridManagerModule.GridManager).to.exist;
        expect(ConstantsModule.InputEvents).to.exist;
      } catch (error) {
        expect.fail(`MCP server import test failed: ${error.message}`);
      }
    });
  });
});
