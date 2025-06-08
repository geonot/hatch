// Basic test for GridManager.

// Assuming HatchEngine core classes (ErrorHandler, EventSystem) for engine mock.
// For Node.js testing:
// const GridManager = require('./GridManager');
// const EventSystem = require('../core/EventSystem'); // Adjust path
// const ErrorHandler = require('../core/ErrorHandler'); // Adjust path

// Mock minimal engine for testing GridManager
const mockEngineForGrid = {
    eventSystem: new EventSystem(), // Assuming EventSystem is available
    errorHandler: new ErrorHandler(), // Assuming ErrorHandler is available
};


function testGridManager() {
    console.log("Running GridManager tests...");
    let gridManager;

    try {
        gridManager = new GridManager(mockEngineForGrid);
        gridManager.init();
        console.log("GridManager instantiated and initialized successfully.");
    } catch (e) {
        console.error("Failed to instantiate or initialize GridManager:", e);
        return;
    }

    // Test createSquareGrid
    console.log("Testing createSquareGrid...");
    const cols = 5, rows = 4, cellSize = 20;
    const initializer = (c, r) => ({ col: c, row: r, type: 'empty' });
    const grid = gridManager.createSquareGrid(cols, rows, cellSize, initializer);

    if (grid && grid.width === cols && grid.height === rows && grid.cellSize === cellSize && grid.data.length === rows && grid.data[0].length === cols) {
        console.log("createSquareGrid test passed: Dimensions and structure seem correct.");
        if (grid.data[1][2] && grid.data[1][2].col === 2 && grid.data[1][2].row === 1) {
            console.log("createSquareGrid initializer test passed.");
        } else {
            console.error("createSquareGrid initializer test FAILED. Tile at (2,1):", grid.data[1][2]);
        }
    } else {
        console.error("createSquareGrid test FAILED. Grid:", grid);
    }

    const activeGrid = gridManager.getActiveGrid();
    if (activeGrid === grid) {
        console.log("getActiveGrid returns the created grid: PASSED");
    } else {
        console.error("getActiveGrid did not return the created grid: FAILED");
    }


    // Test getTile and setTile
    console.log("Testing getTile and setTile...");
    const tileDataToSet = { type: 'wall' };
    let setResult = gridManager.setTile(2, 1, tileDataToSet); // col 2, row 1
    let retrievedTile = gridManager.getTile(2, 1);

    if (setResult && retrievedTile === tileDataToSet) {
        console.log("setTile and getTile test passed.");
    } else {
        console.error("setTile or getTile test FAILED. SetResult:", setResult, "Retrieved:", retrievedTile);
    }

    // Test out of bounds
    retrievedTile = gridManager.getTile(cols, rows); // Out of bounds
    if (retrievedTile === null) {
        console.log("getTile out of bounds test passed (returned null).");
    } else {
        console.error("getTile out of bounds test FAILED. Retrieved:", retrievedTile);
    }
    setResult = gridManager.setTile(cols, rows, tileDataToSet); // Out of bounds
    if (!setResult) {
        console.log("setTile out of bounds test passed (returned false).");
    } else {
        console.error("setTile out of bounds test FAILED. SetResult:", setResult);
    }

    if (gridManager.isValidPosition(1,1) && !gridManager.isValidPosition(cols, rows)) {
        console.log("isValidPosition test passed.");
    } else {
        console.error("isValidPosition test FAILED.");
    }


    // Test gridToScreen and screenToGrid
    console.log("Testing coordinate conversion...");
    const screenCoords = gridManager.gridToScreen(2, 1); // col 2, row 1
    if (screenCoords && screenCoords.x === 2 * cellSize && screenCoords.y === 1 * cellSize) {
        console.log("gridToScreen test passed. Coords:", screenCoords);
    } else {
        console.error("gridToScreen test FAILED. Coords:", screenCoords);
    }

    const gridCoords = gridManager.screenToGrid(2.5 * cellSize, 1.8 * cellSize); // Point within cell (2,1)
    if (gridCoords && gridCoords.col === 2 && gridCoords.row === 1) {
        console.log("screenToGrid test passed. Coords:", gridCoords);
    } else {
        console.error("screenToGrid test FAILED. Coords:", gridCoords);
    }

    // Test with no active grid (after destroy or before create)
    gridManager.activeGrid = null; // Simulate no active grid
    if (gridManager.getTile(0,0) === null) console.log("getTile with no active grid: PASSED"); else console.error("getTile with no active grid: FAILED");
    if (gridManager.gridToScreen(0,0) === null) console.log("gridToScreen with no active grid: PASSED"); else console.error("gridToScreen with no active grid: FAILED");
    gridManager.activeGrid = grid; // Restore for destroy test


    try {
        gridManager.destroy();
        console.log("GridManager destroyed successfully.");
        if (gridManager.getActiveGrid() === null) {
            console.log("getActiveGrid after destroy returns null: PASSED");
        } else {
            console.error("getActiveGrid after destroy did not return null: FAILED");
        }
    } catch (e) {
        console.error("Failed to destroy GridManager:", e);
    }

    console.log("GridManager tests finished.");
}

// Run the tests
// In a browser, ensure core files and GridManager.js are loaded.
// Then call testGridManager();
// For Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//     const EventSystem = require('../core/EventSystem');
//     const ErrorHandler = require('../core/ErrorHandler');
//     testGridManager();
// }
