// Basic test for TileManager.

// Assuming HatchEngine core classes (ErrorHandler, EventSystem) and GridManager for engine mock.
// For Node.js testing:
// const TileManager = require('./TileManager');
// const GridManager = require('./GridManager'); // Adjust path
// const EventSystem = require('../core/EventSystem'); // Adjust path
// const ErrorHandler = require('../core/ErrorHandler'); // Adjust path

// Mock minimal engine for testing TileManager
const mockEngineForTile = {
    eventSystem: new EventSystem(), // Assuming EventSystem is available
    errorHandler: new ErrorHandler(), // Assuming ErrorHandler is available
    gridManager: null // Will be set to a mock GridManager instance
};

// Mock GridManager for TileManager tests
class MockGridManager {
    constructor(engine) { this.engine = engine; this.activeGrid = null; }
    init() {}
    createSquareGrid(cols, rows, cellSize, initFn) {
        this.activeGrid = {
            width: cols, height: rows, cellSize: cellSize,
            data: Array(rows).fill(null).map(() => Array(cols).fill(null).map((_,c_idx) => initFn ? initFn(c_idx,0) : null)) // simplified init
        };
        if (initFn) { // More accurate init for testing
             for(let r=0; r<rows; ++r) for(let c=0; c<cols; ++c) this.activeGrid.data[r][c] = initFn(c,r);
        }
        return this.activeGrid;
    }
    getTile(col, row) {
        if (!this.activeGrid || row < 0 || row >= this.activeGrid.height || col < 0 || col >= this.activeGrid.width) return null;
        return this.activeGrid.data[row][col];
    }
    setTile(col, row, tileData) {
        if (!this.activeGrid || row < 0 || row >= this.activeGrid.height || col < 0 || col >= this.activeGrid.width) return false;
        this.activeGrid.data[row][col] = tileData;
        return true;
    }
    getActiveGrid() { return this.activeGrid; }
    destroy() { this.activeGrid = null; }
}
mockEngineForTile.gridManager = new MockGridManager(mockEngineForTile);


function testTileManager() {
    console.log("Running TileManager tests...");
    let tileManager;

    try {
        tileManager = new TileManager(mockEngineForTile);
        tileManager.init();
        console.log("TileManager instantiated and initialized successfully.");
    } catch (e) {
        console.error("Failed to instantiate or initialize TileManager:", e);
        return;
    }

    // Test defineTileType and getTileType
    console.log("Testing defineTileType and getTileType...");
    const wallProps = { color: 'gray', solid: true, imageName: 'wall.png' };
    let defineResult = tileManager.defineTileType('wall', wallProps);
    let retrievedType = tileManager.getTileType('wall');

    if (defineResult && retrievedType && retrievedType.color === 'gray' && retrievedType.solid === true && retrievedType.typeName === 'wall') {
        console.log("defineTileType and getTileType for 'wall' passed.");
    } else {
        console.error("defineTileType or getTileType for 'wall' FAILED. DefineResult:", defineResult, "Retrieved:", retrievedType);
    }

    const floorProps = { color: 'lightgray', solid: false };
    tileManager.defineTileType('floor', floorProps);

    const nonExistentType = tileManager.getTileType('nonExistent');
    if (nonExistentType === null) {
        console.log("getTileType for non-existent type returned null: PASSED");
    } else {
        console.error("getTileType for non-existent type FAILED. Retrieved:", nonExistentType);
    }

    // Define with no name
    const noNameResult = tileManager.defineTileType('', {color: 'blue'});
    if (!noNameResult) {
        console.log("defineTileType with empty name returned false: PASSED");
    } else {
        console.error("defineTileType with empty name FAILED.");
    }


    // Test createTile
    console.log("Testing createTile...");
    // Setup a grid in the mock GridManager
    mockEngineForTile.gridManager.createSquareGrid(5, 5, 10);

    const createdWallTile = tileManager.createTile('wall', 2, 3, { customInstanceProp: 'hello' }); // col 2, row 3
    if (createdWallTile && createdWallTile.typeName === 'wall' && createdWallTile.col === 2 && createdWallTile.row === 3 && createdWallTile.solid === true && createdWallTile.customInstanceProp === 'hello') {
        console.log("createTile for 'wall' passed with instance properties.");
        const tileOnGrid = mockEngineForTile.gridManager.getTile(2, 3);
        if (tileOnGrid === createdWallTile) {
            console.log("Tile instance correctly placed on grid by createTile.");
        } else {
            console.error("Tile instance NOT correctly placed on grid. Got:", tileOnGrid);
        }
    } else {
        console.error("createTile for 'wall' FAILED. Tile:", createdWallTile);
    }

    const createdNonExistentTile = tileManager.createTile('ghost', 1, 1);
    if (createdNonExistentTile === null) {
        console.log("createTile for non-existent type 'ghost' returned null: PASSED");
    } else {
        console.error("createTile for non-existent type 'ghost' FAILED. Tile:", createdNonExistentTile);
    }

    // Test removeTile
    console.log("Testing removeTile...");
    const removeResult = tileManager.removeTile(2,3); // Remove the wall tile
    const tileAfterRemove = mockEngineForTile.gridManager.getTile(2,3);
    if (removeResult && tileAfterRemove === null) {
        console.log("removeTile test passed.");
    } else {
        console.error("removeTile test FAILED. Result:", removeResult, "Tile on grid:", tileAfterRemove);
    }
    const removeNonExistentResult = tileManager.removeTile(10,10); // Out of bounds
    if (!removeNonExistentResult) {
        console.log("removeTile for out-of-bounds returned false: PASSED");
    } else {
        console.error("removeTile for out-of-bounds FAILED.");
    }


    try {
        tileManager.destroy();
        console.log("TileManager destroyed successfully.");
        if (tileManager.tileTypes.size === 0) {
            console.log("Tile types cleared after destroy: PASSED");
        } else {
            console.error("Tile types not cleared after destroy: FAILED");
        }
    } catch (e) {
        console.error("Failed to destroy TileManager:", e);
    }

    console.log("TileManager tests finished.");
}

// Run the tests
// In a browser, ensure core files, GridManager, and TileManager.js are loaded.
// Then call testTileManager();
// For Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//     const EventSystem = require('../core/EventSystem');
//     const ErrorHandler = require('../core/ErrorHandler');
//     // GridManager is mocked within the test file for TileManager
//     testTileManager();
// }
