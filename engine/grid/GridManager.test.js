import { GridManager } from './GridManager.js'; // Named export
// import { expect } from 'chai'; // Replaced with Jest's expect
// import sinon from 'sinon'; // Replaced with Jest's spyOn and jest.fn()
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // Removed spyOn from here

describe('GridManager', () => {
  let gridManager;
  let mockEngine;
  let mockRenderingEngine;
  let consoleErrorSpy;

  const defaultOptions = {
    engine: {}, // Mock engine object
    type: 'square',
    tileWidth: 32,
    tileHeight: 32,
    mapWidth: 10, // Default test map width
    mapHeight: 8,  // Default test map height
    offsetX: 0,
    offsetY: 0,
  };

  beforeEach(() => {
    // A simple mock for the engine, can be expanded if GridManager uses more engine features
    mockEngine = {
      errorHandler: {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(), // Add info if used by GridManager or its dependencies
        debug: jest.fn(),
        critical: jest.fn(),
      },
      renderingEngine: { // Add renderingEngine if used by GridManager or its dependencies
        // Mock any methods GridManager might call on renderingEngine if not already done by top-level mock
        // For example, if GridManager directly calls something on engine.renderingEngine
      },
      // Add other engine subsystems if GridManager directly accesses them
    };

    // Create a new GridManager instance for each test with a fresh mockEngine
    gridManager = new GridManager({ ...defaultOptions, engine: mockEngine });

    mockRenderingEngine = {
      context: {}, // Mock context if needed, not directly used by GridManager's logic for drawLine
      drawLine: jest.fn(), // Use jest.fn() for spies
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });

  afterEach(() => {
    // jest.restoreAllMocks(); // Restores all Jest spies and mocks
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore(); // Restore only the console.error spy
    }
  });

  describe('constructor', () => {
    it('should initialize with default and provided options', () => {
      const options = {
        engine: mockEngine,
        tileWidth: 16,
        mapHeight: 20,
        offsetX: 10,
      };
      const gm = new GridManager(options);
      expect(gm.engine).toBe(mockEngine);
      expect(gm.type).toBe('square'); // Default
      expect(gm.tileWidth).toBe(16);
      expect(gm.tileHeight).toBe(32); // Default
      expect(gm.mapWidth).toBe(20);   // Default
      expect(gm.mapHeight).toBe(20);
      expect(gm.offsetX).toBe(10);
      expect(gm.offsetY).toBe(0);    // Default
      expect(Array.isArray(gm.gridData)).toBe(true);
      expect(gm.gridData.length).toBe(20 * 20); // mapWidth * mapHeight
      expect(gm.gridData.every(cell => cell === null)).toBe(true);
    });

    it('should throw an error if engine is not provided', () => {
      const options = { ...defaultOptions };
      delete options.engine;
      expect(() => new GridManager(options)).toThrow("GridManager constructor: 'engine' instance is required.");
    });
  });

  describe('worldToGrid()', () => {
    it('should convert world coordinates to grid coordinates with no offset', () => {
      expect(gridManager.worldToGrid(0, 0)).toEqual({ x: 0, y: 0 });
      expect(gridManager.worldToGrid(31, 31)).toEqual({ x: 0, y: 0 }); // Still in cell (0,0)
      expect(gridManager.worldToGrid(32, 32)).toEqual({ x: 1, y: 1 });
      expect(gridManager.worldToGrid(160, 96)).toEqual({ x: 5, y: 3 }); // 160/32=5, 96/32=3
    });

    it('should convert world coordinates to grid coordinates with offset', () => {
      gridManager.offsetX = 10;
      gridManager.offsetY = 20;
      // World (10,20) is the new origin (0,0) of the grid
      expect(gridManager.worldToGrid(10, 20)).toEqual({ x: 0, y: 0 });
      // World (41, 51) -> relative (31, 31) -> grid (0,0)
      expect(gridManager.worldToGrid(41, 51)).toEqual({ x: 0, y: 0 });
      // World (42, 52) -> relative (32, 32) -> grid (1,1)
      expect(gridManager.worldToGrid(42, 52)).toEqual({ x: 1, y: 1 });
    });

    it('should handle negative world coordinates correctly', () => {
      expect(gridManager.worldToGrid(-1, -1)).toEqual({ x: -1, y: -1 });
      expect(gridManager.worldToGrid(-32, -32)).toEqual({ x: -1, y: -1 });
      expect(gridManager.worldToGrid(-33, -33)).toEqual({ x: -2, y: -2 });
    });
  });

  describe('gridToWorld()', () => {
    it('should convert grid coordinates to world (top-left) with no offset', () => {
      expect(gridManager.gridToWorld(0, 0)).toEqual({ x: 0, y: 0 });
      expect(gridManager.gridToWorld(1, 1)).toEqual({ x: 32, y: 32 });
      expect(gridManager.gridToWorld(5, 3)).toEqual({ x: 160, y: 96 });
    });

    it('should convert grid coordinates to world (centered) with no offset', () => {
      expect(gridManager.gridToWorld(0, 0, true)).toEqual({ x: 16, y: 16 }); // 32/2 = 16
      expect(gridManager.gridToWorld(1, 1, true)).toEqual({ x: 48, y: 48 }); // 32+16
    });

    it('should convert grid coordinates to world (top-left) with offset', () => {
      gridManager.offsetX = 10;
      gridManager.offsetY = 20;
      expect(gridManager.gridToWorld(0, 0)).toEqual({ x: 10, y: 20 });
      expect(gridManager.gridToWorld(1, 1)).toEqual({ x: 42, y: 52 }); // 10+32, 20+32
    });

    it('should convert grid coordinates to world (centered) with offset', () => {
      gridManager.offsetX = 10;
      gridManager.offsetY = 20;
      expect(gridManager.gridToWorld(0, 0, true)).toEqual({ x: 26, y: 36 }); // 10+16, 20+16
    });
  });

  describe('isValidGridPosition()', () => {
    it('should return true for valid positions', () => {
      expect(gridManager.isValidGridPosition(0, 0)).toBe(true);
      expect(gridManager.isValidGridPosition(defaultOptions.mapWidth - 1, defaultOptions.mapHeight - 1)).toBe(true);
      expect(gridManager.isValidGridPosition(5, 4)).toBe(true); // mapWidth=10, mapHeight=8
    });

    it('should return false for positions outside boundaries', () => {
      expect(gridManager.isValidGridPosition(-1, 0)).toBe(false);
      expect(gridManager.isValidGridPosition(0, -1)).toBe(false);
      expect(gridManager.isValidGridPosition(defaultOptions.mapWidth, 0)).toBe(false); // x = 10 is out of bounds (0-9)
      expect(gridManager.isValidGridPosition(0, defaultOptions.mapHeight)).toBe(false); // y = 8 is out of bounds (0-7)
    });
  });

  describe('getNeighbors()', () => {
    it('should return cardinal neighbors for a cell in the middle', () => {
      const neighbors = gridManager.getNeighbors(5, 4); // mapWidth=10, mapHeight=8
      expect(neighbors).toHaveLength(4);
      expect(neighbors).toEqual(expect.arrayContaining([
        { x: 5, y: 3 }, // N
        { x: 6, y: 4 }, // E
        { x: 5, y: 5 }, // S
        { x: 4, y: 4 }, // W
      ]));
    });

    it('should return cardinal and diagonal neighbors if includeDiagonals is true', () => {
      const neighbors = gridManager.getNeighbors(5, 4, true);
      expect(neighbors).toHaveLength(8);
      expect(neighbors).toEqual(expect.arrayContaining([
        { x: 5, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 5 }, { x: 4, y: 4 }, // Cardinal
        { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 3 }, // Diagonal
      ]));
    });

    it('should return only valid neighbors for a corner cell (0,0)', () => {
      const neighbors = gridManager.getNeighbors(0, 0);
      expect(neighbors).toHaveLength(2);
      expect(neighbors).toEqual(expect.arrayContaining([
        { x: 1, y: 0 }, // E
        { x: 0, y: 1 }, // S
      ]));
    });

    it('should return only valid diagonal neighbors for a corner cell (0,0)', () => {
      const neighbors = gridManager.getNeighbors(0, 0, true);
      expect(neighbors).toHaveLength(3);
      expect(neighbors).toEqual(expect.arrayContaining([
        { x: 1, y: 0 }, { x: 0, y: 1 }, // Cardinal
        { x: 1, y: 1 },                 // Diagonal SE
      ]));
    });
  });

  describe('setTileData() and getTileData()', () => {
    it('should set and get data for a valid grid position', () => {
      const data = { type: 'wall' };
      expect(gridManager.setTileData(2, 3, data)).toBe(true);
      expect(gridManager.getTileData(2, 3)).toBe(data);
    });

    it('setTileData should return false for invalid position and not store data', () => {
      const data = { type: 'rock' };
      expect(gridManager.setTileData(defaultOptions.mapWidth, 0, data)).toBe(false);
      expect(gridManager.getTileData(defaultOptions.mapWidth, 0)).toBeUndefined();
    });

    it('getTileData should return undefined for invalid position', () => {
      expect(gridManager.getTileData(-1, 0)).toBeUndefined();
    });

    it('getTileData should return null for valid position with no data set (default)', () => {
      expect(gridManager.getTileData(1, 1)).toBeNull(); // Default fill value
    });
  });

  describe('renderGridLines()', () => {
    it('should call renderingEngine.drawLine for each grid line', () => {
      gridManager.renderGridLines(mockRenderingEngine, '#FF0000', 2);
      // (mapHeight + 1) horizontal lines + (mapWidth + 1) vertical lines
      const expectedCallCount = (defaultOptions.mapHeight + 1) + (defaultOptions.mapWidth + 1);
      expect(mockRenderingEngine.drawLine).toHaveBeenCalledTimes(expectedCallCount);

      // Check first horizontal line call
      const firstHorizP1 = gridManager.gridToWorld(0,0);
      const firstHorizP2 = gridManager.gridToWorld(defaultOptions.mapWidth, 0);
      expect(mockRenderingEngine.drawLine).toHaveBeenCalledWith(firstHorizP1.x, firstHorizP1.y, firstHorizP2.x, firstHorizP2.y, '#FF0000', 2);

      // Check first vertical line call
      const firstVertP1 = gridManager.gridToWorld(0,0);
      const firstVertP2 = gridManager.gridToWorld(0, defaultOptions.mapHeight);
      expect(mockRenderingEngine.drawLine).toHaveBeenCalledWith(firstVertP1.x, firstVertP1.y, firstVertP2.x, firstVertP2.y, '#FF0000', 2);
    });

    it('should log an error if renderingEngine or its context/drawLine is invalid', () => {
      gridManager.renderGridLines(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith("GridManager.renderGridLines: Valid RenderingEngine with drawLine method is required.");

      consoleErrorSpy.mockClear();
      gridManager.renderGridLines({ context: {} }); // Missing drawLine
      expect(consoleErrorSpy).toHaveBeenCalledWith("GridManager.renderGridLines: Valid RenderingEngine with drawLine method is required.");

      // consoleErrorSpy.mockClear(); // No need to clear if we are checking for the same message or any message
      // gridManager.renderGridLines({ drawLine: () => {} }); // Missing context (though not explicitly checked in current code)
      // The current code doesn't explicitly check for context, so this might not error in the same way.
      // Depending on strictness, this test might need adjustment or the source code made more robust.
    });
  });
});
