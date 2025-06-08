/**
 * @fileoverview Basic GridManager for the Hatch engine, focusing on square grids for Phase 1.
 */

class GridManager {
    constructor(engine) {
        this.engine = engine;
        this.activeGrid = null; // Stores the current grid configuration and data

        console.info("GridManager initialized.");
        this.engine.eventSystem.emit('gridManagerConstructed', { manager: this }, true);
    }

    /**
     * Initializes the GridManager.
     */
    init() {
        console.log("GridManager.init() called.");
        // In a real system, might load default grid configurations or types.
        this.engine.eventSystem.emit('gridManagerInitialized', { manager: this }, true);
    }

    /**
     * Creates a new square grid and sets it as the active grid.
     * @param {number} cols - Number of columns in the grid.
     * @param {number} rows - Number of rows in the grid.
     * @param {number} cellSize - Size of each cell in pixels.
     * @param {function} [tileInitializer=null] - Optional function (col, row) => tileData to initialize each cell.
     * @returns {Object} The created grid object.
     */
    createSquareGrid(cols, rows, cellSize, tileInitializer = null) {
        if (cols <= 0 || rows <= 0 || cellSize <= 0) {
            const errorMsg = `Invalid dimensions for square grid: ${cols}x${rows}, cell size: ${cellSize}`;
            console.error(`GridManager: ${errorMsg}`);
            this.engine.eventSystem.emit('engineError', { error: new Error(errorMsg), context: "GridManager.createSquareGrid" });
            return null;
        }

        const gridData = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push(tileInitializer ? tileInitializer(c, r) : null); // Initialize with null or custom data
            }
            gridData.push(row);
        }

        this.activeGrid = {
            type: 'square',
            width: cols, // Number of columns
            height: rows, // Number of rows
            cellSize: cellSize,
            data: gridData, // The 2D array holding tile information
            // Other potential properties: orientation (for hex), layers, etc.
        };

        console.log(`Square grid created: ${cols}x${rows}, cell size ${cellSize}.`);
        this.engine.eventSystem.emit('gridCreated', { grid: this.activeGrid }, true);
        return this.activeGrid;
    }

    /**
     * Gets the tile data at the specified grid coordinates.
     * @param {number} col - The column index (x-coordinate).
     * @param {number} row - The row index (y-coordinate).
     * @returns {any | null} The tile data, or null if coordinates are out of bounds or no grid is active.
     */
    getTile(col, row) {
        if (!this.activeGrid) {
            // console.warn("GridManager.getTile: No active grid.");
            return null;
        }
        if (row >= 0 && row < this.activeGrid.height && col >= 0 && col < this.activeGrid.width) {
            return this.activeGrid.data[row][col];
        }
        // console.warn(`GridManager.getTile: Coordinates (${col},${row}) out of bounds.`);
        return null; // Out of bounds
    }

    /**
     * Sets the tile data at the specified grid coordinates.
     * @param {number} col - The column index (x-coordinate).
     * @param {number} row - The row index (y-coordinate).
     * @param {any} tileData - The data to set for the tile.
     * @returns {boolean} True if the tile was set successfully, false otherwise (e.g., out of bounds).
     */
    setTile(col, row, tileData) {
        if (!this.activeGrid) {
            // console.warn("GridManager.setTile: No active grid.");
            return false;
        }
        if (row >= 0 && row < this.activeGrid.height && col >= 0 && col < this.activeGrid.width) {
            this.activeGrid.data[row][col] = tileData;
            this.engine.eventSystem.emit('tileChanged', { col, row, tileData, grid: this.activeGrid }, true);
            return true;
        }
        // console.warn(`GridManager.setTile: Coordinates (${col},${row}) out of bounds.`);
        return false;
    }

    /**
     * Converts grid coordinates (column, row) to screen coordinates (pixels).
     * Assumes origin (0,0) of the grid is at screen (0,0).
     * @param {number} gridCol - The grid column index.
     * @param {number} gridRow - The grid row index.
     * @returns {{x: number, y: number} | null} Screen coordinates, or null if no active grid.
     */
    gridToScreen(gridCol, gridRow) {
        if (!this.activeGrid || this.activeGrid.cellSize === undefined) {
            // console.warn("GridManager.gridToScreen: No active grid or cellSize undefined.");
            return null;
        }
        return {
            x: gridCol * this.activeGrid.cellSize,
            y: gridRow * this.activeGrid.cellSize
        };
    }

    /**
     * Converts screen coordinates (pixels) to grid coordinates (column, row).
     * Assumes origin (0,0) of the grid is at screen (0,0).
     * @param {number} screenX - The screen x-coordinate.
     * @param {number} screenY - The screen y-coordinate.
     * @returns {{col: number, row: number} | null} Grid coordinates, or null if no active grid.
     */
    screenToGrid(screenX, screenY) {
        if (!this.activeGrid || this.activeGrid.cellSize === undefined || this.activeGrid.cellSize === 0) {
            // console.warn("GridManager.screenToGrid: No active grid or cellSize invalid.");
            return null;
        }
        return {
            col: Math.floor(screenX / this.activeGrid.cellSize),
            row: Math.floor(screenY / this.activeGrid.cellSize)
        };
    }

    /**
     * Gets the currently active grid object.
     * @returns {Object | null} The active grid object or null.
     */
    getActiveGrid() {
        return this.activeGrid;
    }

    /**
     * Checks if a given grid position is valid (within bounds).
     * @param {number} col - The column index.
     * @param {number} row - The row index.
     * @returns {boolean} True if the position is valid, false otherwise.
     */
    isValidPosition(col, row) {
        if (!this.activeGrid) return false;
        return row >= 0 && row < this.activeGrid.height && col >= 0 && col < this.activeGrid.width;
    }


    /**
     * Destroys the GridManager, cleaning up resources.
     */
    destroy() {
        console.log("GridManager.destroy() called.");
        this.activeGrid = null; // Clear the active grid
        // Any other specific cleanup for GridManager
        this.engine.eventSystem.emit('gridManagerDestroyed', { manager: this }, true);
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridManager;
}
