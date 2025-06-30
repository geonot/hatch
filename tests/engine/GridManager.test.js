import GridManager from '../../engine/grid/GridManager.js'; // Default export
import { expect } from 'chai';
import sinon from 'sinon';

describe('GridManager', () => {
  let gridManager;
  let mockEngine;
  let mockRenderingEngine;

  const defaultOptions = {
    numCols: 10,
    numRows: 8,
    tileWidth: 32,
    tileHeight: 32,
  };

  beforeEach(() => {
    // A mock engine with required errorHandler and renderingEngine properties
    mockEngine = {
      errorHandler: {
        warn: sinon.spy(),
        error: sinon.spy(),
        info: sinon.spy(),
        debug: sinon.spy(),
        critical: sinon.spy(),
      },
      renderingEngine: {
        context: {},
        drawLine: sinon.spy(),
      }
    };

    // Create a new GridManager instance for each test with a fresh mockEngine
    gridManager = new GridManager(mockEngine, { ...defaultOptions });

    mockRenderingEngine = {
      context: {}, // Mock context if needed, not directly used by GridManager's logic for drawLine
      drawLine: sinon.spy(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with default and provided options', () => {
      const config = {
        numCols: 5,
        numRows: 20,
        tileWidth: 16,
        tileHeight: 64,
      };
      const gm = new GridManager(mockEngine, config);
      expect(gm.engine).to.equal(mockEngine);
      expect(gm.numCols).to.equal(5);
      expect(gm.numRows).to.equal(20);
      expect(gm.tileWidth).to.equal(16);
      expect(gm.tileHeight).to.equal(64);
      expect(gm.showGridLines).to.be.true; // Default
      expect(gm.gridLineColor).to.equal('rgba(255,255,255,0.3)'); // Default
    });

    it('should throw an error if engine is not provided', () => {
      expect(() => new GridManager(null, defaultOptions)).to.throw("GridManager constructor: Valid 'engine' instance with 'errorHandler' and 'renderingEngine' is required.");
    });
  });

  describe('screenToGrid()', () => {
    it('should convert screen coordinates to grid coordinates', () => {
      // Mock camera.screenToWorld method
      mockEngine.renderingEngine.camera = {
        screenToWorld: sinon.stub()
      };
      
      // Test conversion when camera returns (0,0) world position
      mockEngine.renderingEngine.camera.screenToWorld.returns({ x: 0, y: 0 });
      expect(gridManager.screenToGrid(100, 100)).to.deep.equal({ gridX: 0, gridY: 0 });
      
      // Test conversion when camera returns (32,32) world position 
      mockEngine.renderingEngine.camera.screenToWorld.returns({ x: 32, y: 32 });
      expect(gridManager.screenToGrid(100, 100)).to.deep.equal({ gridX: 1, gridY: 1 });
      
      // Test conversion when camera returns (160,96) world position
      mockEngine.renderingEngine.camera.screenToWorld.returns({ x: 160, y: 96 });
      expect(gridManager.screenToGrid(100, 100)).to.deep.equal({ gridX: 5, gridY: 3 });
    });

    it('should return null for coordinates outside grid bounds', () => {
      mockEngine.renderingEngine.camera = {
        screenToWorld: sinon.stub()
      };
      
      // Test negative world coordinates
      mockEngine.renderingEngine.camera.screenToWorld.returns({ x: -1, y: -1 });
      expect(gridManager.screenToGrid(100, 100)).to.be.null;
      
      // Test world coordinates beyond grid
      mockEngine.renderingEngine.camera.screenToWorld.returns({ x: 320, y: 256 }); // 10*32, 8*32 - out of bounds
      expect(gridManager.screenToGrid(100, 100)).to.be.null;
    });
  });

  describe('gridToWorld()', () => {
    it('should convert grid coordinates to world coordinates', () => {
      expect(gridManager.gridToWorld(0, 0)).to.deep.equal({ worldX: 0, worldY: 0 });
      expect(gridManager.gridToWorld(1, 1)).to.deep.equal({ worldX: 32, worldY: 32 });
      expect(gridManager.gridToWorld(5, 3)).to.deep.equal({ worldX: 160, worldY: 96 });
    });
  });

  describe('gridCellToWorldCenter()', () => {
    it('should convert grid coordinates to world center coordinates', () => {
      expect(gridManager.gridCellToWorldCenter(0, 0)).to.deep.equal({ worldX: 16, worldY: 16 }); // 32/2 = 16
      expect(gridManager.gridCellToWorldCenter(1, 1)).to.deep.equal({ worldX: 48, worldY: 48 }); // 32+16
    });
  });

  describe('isInBounds()', () => {
    it('should return true for valid positions', () => {
      expect(gridManager.isInBounds(0, 0)).to.be.true;
      expect(gridManager.isInBounds(defaultOptions.numCols - 1, defaultOptions.numRows - 1)).to.be.true;
      expect(gridManager.isInBounds(5, 4)).to.be.true; // numCols=10, numRows=8
    });

    it('should return false for positions outside boundaries', () => {
      expect(gridManager.isInBounds(-1, 0)).to.be.false;
      expect(gridManager.isInBounds(0, -1)).to.be.false;
      expect(gridManager.isInBounds(defaultOptions.numCols, 0)).to.be.false; // x = 10 is out of bounds (0-9)
      expect(gridManager.isInBounds(0, defaultOptions.numRows)).to.be.false; // y = 8 is out of bounds (0-7)
    });
  });

  describe('renderGridLines()', () => {
    it('should call renderingEngine.drawLine for each grid line', () => {
      gridManager.renderGridLines(mockRenderingEngine);
      // (numRows + 1) horizontal lines + (numCols + 1) vertical lines
      const expectedCallCount = (defaultOptions.numRows + 1) + (defaultOptions.numCols + 1);
      expect(mockRenderingEngine.drawLine.callCount).to.equal(expectedCallCount);

      // Check that drawLine was called with correct parameters
      expect(mockRenderingEngine.drawLine.calledWith(0, 0, 320, 0, 'rgba(255,255,255,0.3)', 1)).to.be.true; // First horizontal
      expect(mockRenderingEngine.drawLine.calledWith(0, 0, 0, 256, 'rgba(255,255,255,0.3)', 1)).to.be.true; // First vertical
    });

    it('should not draw grid lines if showGridLines is false', () => {
      gridManager.showGridLines = false;
      gridManager.renderGridLines(mockRenderingEngine);
      expect(mockRenderingEngine.drawLine.callCount).to.equal(0);
    });
  });
});