/**
 * @file GridUtils.js
 * @description Comprehensive utility class for grid-based games that eliminates common boilerplate patterns.
 * Provides neighbor checking, flood fill, path finding, grid validation, and state management utilities.
 */

/**
 * @class GridUtils
 * @classdesc Static utility class providing common grid operations for puzzle and strategy games.
 * Eliminates repetitive boilerplate code patterns found in grid-based games.
 */
export class GridUtils {
    
    /**
     * Standard 8-directional neighbor offsets (including diagonals)
     * @static
     * @readonly
     */
    static NEIGHBORS_8 = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    /**
     * 4-directional neighbor offsets (no diagonals)
     * @static
     * @readonly
     */
    static NEIGHBORS_4 = [
        [-1, 0],
        [0, -1], [0, 1],
        [1, 0]
    ];

    /**
     * Check if grid coordinates are valid within bounds
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {number} cols - Total number of columns
     * @param {number} rows - Total number of rows
     * @returns {boolean} True if coordinates are valid
     */
    static isValidPosition(col, row, cols, rows) {
        return col >= 0 && col < cols && row >= 0 && row < rows;
    }

    /**
     * Get all valid neighbor positions for a cell
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {number} cols - Total number of columns
     * @param {number} rows - Total number of rows
     * @param {boolean} [includeDiagonals=true] - Whether to include diagonal neighbors
     * @returns {Array<{col: number, row: number}>} Array of valid neighbor positions
     */
    static getNeighbors(col, row, cols, rows, includeDiagonals = true) {
        const neighbors = [];
        const offsets = includeDiagonals ? this.NEIGHBORS_8 : this.NEIGHBORS_4;

        for (const [dx, dy] of offsets) {
            const newCol = col + dx;
            const newRow = row + dy;
            
            if (this.isValidPosition(newCol, newRow, cols, rows)) {
                neighbors.push({ col: newCol, row: newRow });
            }
        }

        return neighbors;
    }

    /**
     * Count neighbors that match a specific condition
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} condition - Function that takes (cell, col, row) and returns boolean
     * @param {boolean} [includeDiagonals=true] - Whether to include diagonal neighbors
     * @returns {number} Count of neighbors matching the condition
     */
    static countNeighbors(col, row, grid, condition, includeDiagonals = true) {
        const cols = grid[0]?.length || 0;
        const rows = grid.length;
        const neighbors = this.getNeighbors(col, row, cols, rows, includeDiagonals);
        
        return neighbors.reduce((count, neighbor) => {
            const cell = grid[neighbor.row][neighbor.col];
            return condition(cell, neighbor.col, neighbor.row) ? count + 1 : count;
        }, 0);
    }

    /**
     * Get all neighbors that match a specific condition
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} condition - Function that takes (cell, col, row) and returns boolean
     * @param {boolean} [includeDiagonals=true] - Whether to include diagonal neighbors
     * @returns {Array<{cell: any, col: number, row: number}>} Array of neighbors matching condition
     */
    static getNeighborsMatching(col, row, grid, condition, includeDiagonals = true) {
        const cols = grid[0]?.length || 0;
        const rows = grid.length;
        const neighbors = this.getNeighbors(col, row, cols, rows, includeDiagonals);
        
        return neighbors
            .map(neighbor => ({
                cell: grid[neighbor.row][neighbor.col],
                col: neighbor.col,
                row: neighbor.row
            }))
            .filter(neighbor => condition(neighbor.cell, neighbor.col, neighbor.row));
    }

    /**
     * Perform flood fill operation starting from a position
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} shouldFill - Function that takes (cell, col, row) and returns boolean
     * @param {Function} fillAction - Function that takes (cell, col, row) to perform the fill action
     * @param {boolean} [includeDiagonals=false] - Whether to include diagonal neighbors
     * @returns {Array<{col: number, row: number}>} Array of positions that were filled
     */
    static floodFill(startCol, startRow, grid, shouldFill, fillAction, includeDiagonals = false) {
        const cols = grid[0]?.length || 0;
        const rows = grid.length;
        const filled = [];
        const visited = new Set();
        const queue = [{ col: startCol, row: startRow }];

        while (queue.length > 0) {
            const { col, row } = queue.shift();
            const key = `${col},${row}`;

            if (visited.has(key) || !this.isValidPosition(col, row, cols, rows)) {
                continue;
            }

            const cell = grid[row][col];
            if (!shouldFill(cell, col, row)) {
                continue;
            }

            visited.add(key);
            fillAction(cell, col, row);
            filled.push({ col, row });

            // Add neighbors to queue
            const neighbors = this.getNeighbors(col, row, cols, rows, includeDiagonals);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.col},${neighbor.row}`;
                if (!visited.has(neighborKey)) {
                    queue.push(neighbor);
                }
            }
        }

        return filled;
    }

    /**
     * Perform Minesweeper-style flood fill for revealing cells
     * Reveals all connected empty cells and their numbered borders
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} isHidden - Function that takes (cell, col, row) and returns if cell is hidden
     * @param {Function} isMine - Function that takes (cell, col, row) and returns if cell is a mine
     * @param {Function} getNeighborMines - Function that takes (cell, col, row) and returns neighbor mine count
     * @param {Function} revealAction - Function that takes (cell, col, row) to reveal the cell
     * @param {boolean} [includeDiagonals=true] - Whether to include diagonal neighbors
     * @returns {Array<{col: number, row: number}>} Array of positions that were revealed
     */
    static minesweeperFloodFill(startCol, startRow, grid, isHidden, isMine, getNeighborMines, revealAction, includeDiagonals = true) {
        const cols = grid[0]?.length || 0;
        const rows = grid.length;
        const revealed = [];
        const visited = new Set();
        const queue = [{ col: startCol, row: startRow }];

        while (queue.length > 0) {
            const { col, row } = queue.shift();
            const key = `${col},${row}`;

            if (visited.has(key) || !this.isValidPosition(col, row, cols, rows)) {
                continue;
            }

            const cell = grid[row][col];
            
            // Skip if not hidden or is a mine
            if (!isHidden(cell, col, row) || isMine(cell, col, row)) {
                continue;
            }

            visited.add(key);
            revealAction(cell, col, row);
            revealed.push({ col, row });

            // Only propagate through cells with 0 neighbor mines
            if (getNeighborMines(cell, col, row) === 0) {
                // Add all neighbors to queue for potential revealing
                const neighbors = this.getNeighbors(col, row, cols, rows, includeDiagonals);
                for (const neighbor of neighbors) {
                    const neighborKey = `${neighbor.col},${neighbor.row}`;
                    if (!visited.has(neighborKey)) {
                        queue.push(neighbor);
                    }
                }
            }
        }

        return revealed;
    }

    /**
     * Create a 2D grid array with initial values
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @param {any|Function} initialValue - Initial value for each cell, or function that takes (col, row) and returns value
     * @returns {Array<Array>} 2D grid array
     */
    static createGrid(cols, rows, initialValue) {
        const grid = [];
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                grid[row][col] = typeof initialValue === 'function' 
                    ? initialValue(col, row) 
                    : initialValue;
            }
        }
        return grid;
    }

    /**
     * Clone a grid array (deep copy)
     * @param {Array<Array>} grid - Grid to clone
     * @returns {Array<Array>} Cloned grid
     */
    static cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    /**
     * Iterate over all cells in a grid
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} callback - Function called for each cell: (cell, col, row)
     */
    static forEachCell(grid, callback) {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                callback(grid[row][col], col, row);
            }
        }
    }

    /**
     * Find all cells that match a condition
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} condition - Function that takes (cell, col, row) and returns boolean
     * @returns {Array<{cell: any, col: number, row: number}>} Array of matching cells with positions
     */
    static findCells(grid, condition) {
        const matches = [];
        this.forEachCell(grid, (cell, col, row) => {
            if (condition(cell, col, row)) {
                matches.push({ cell, col, row });
            }
        });
        return matches;
    }

    /**
     * Count all cells that match a condition
     * @param {Array<Array>} grid - 2D grid array
     * @param {Function} condition - Function that takes (cell, col, row) and returns boolean
     * @returns {number} Number of cells matching the condition
     */
    static countCells(grid, condition) {
        let count = 0;
        this.forEachCell(grid, (cell, col, row) => {
            if (condition(cell, col, row)) {
                count++;
            }
        });
        return count;
    }

    /**
     * Get Manhattan distance between two positions
     * @param {number} col1 - First position column
     * @param {number} row1 - First position row
     * @param {number} col2 - Second position column
     * @param {number} row2 - Second position row
     * @returns {number} Manhattan distance
     */
    static manhattanDistance(col1, row1, col2, row2) {
        return Math.abs(col1 - col2) + Math.abs(row1 - row2);
    }

    /**
     * Get Euclidean distance between two positions
     * @param {number} col1 - First position column
     * @param {number} row1 - First position row
     * @param {number} col2 - Second position column
     * @param {number} row2 - Second position row
     * @returns {number} Euclidean distance
     */
    static euclideanDistance(col1, row1, col2, row2) {
        const dx = col1 - col2;
        const dy = row1 - row2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get all positions in a rectangular area
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {number} endCol - Ending column (inclusive)
     * @param {number} endRow - Ending row (inclusive)
     * @param {number} cols - Total grid columns for bounds checking
     * @param {number} rows - Total grid rows for bounds checking
     * @returns {Array<{col: number, row: number}>} Array of positions in the rectangle
     */
    static getPositionsInRect(startCol, startRow, endCol, endRow, cols, rows) {
        const positions = [];
        const minCol = Math.max(0, Math.min(startCol, endCol));
        const maxCol = Math.min(cols - 1, Math.max(startCol, endCol));
        const minRow = Math.max(0, Math.min(startRow, endRow));
        const maxRow = Math.min(rows - 1, Math.max(startRow, endRow));

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                positions.push({ col, row });
            }
        }
        return positions;
    }

    /**
     * Get random positions from the grid
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @param {number} count - Number of random positions to get
     * @param {Function} [filter] - Optional filter function (cell, col, row) => boolean
     * @param {Array<Array>} [grid] - Grid array (required if using filter)
     * @returns {Array<{col: number, row: number}>} Array of random positions
     */
    static getRandomPositions(cols, rows, count, filter, grid) {
        const allPositions = [];
        
        // Generate all valid positions
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!filter || (grid && filter(grid[row][col], col, row))) {
                    allPositions.push({ col, row });
                }
            }
        }

        // Shuffle and return requested count
        const shuffled = [...allPositions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Convert between different coordinate systems
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {string} from - Source coordinate system: 'grid', 'screen', 'world'
     * @param {string} to - Target coordinate system: 'grid', 'screen', 'world'
     * @param {Object} context - Context object with conversion parameters
     * @param {number} context.cellSize - Size of each cell in pixels
     * @param {number} context.offsetX - Grid offset X
     * @param {number} context.offsetY - Grid offset Y
     * @returns {{x: number, y: number} | {col: number, row: number}} Converted coordinates
     */
    static convertCoordinates(col, row, from, to, context) {
        if (from === to) {
            return from === 'grid' ? { col, row } : { x: col, y: row };
        }

        const { cellSize, offsetX = 0, offsetY = 0 } = context;

        // Convert to intermediate grid coordinates
        let gridCol, gridRow;
        if (from === 'grid') {
            gridCol = col;
            gridRow = row;
        } else if (from === 'screen' || from === 'world') {
            gridCol = Math.floor((col - offsetX) / cellSize);
            gridRow = Math.floor((row - offsetY) / cellSize);
        }

        // Convert from grid to target
        if (to === 'grid') {
            return { col: gridCol, row: gridRow };
        } else if (to === 'screen' || to === 'world') {
            return {
                x: gridCol * cellSize + offsetX,
                y: gridRow * cellSize + offsetY
            };
        }

        throw new Error(`Invalid coordinate system conversion: ${from} to ${to}`);
    }

    /**
     * Create a coordinate key for use in Sets and Maps
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @returns {string} Coordinate key in format "col,row"
     */
    static coordKey(col, row) {
        return `${col},${row}`;
    }

    /**
     * Parse a coordinate key back to coordinates
     * @param {string} key - Coordinate key in format "col,row"
     * @returns {{col: number, row: number}} Parsed coordinates
     */
    static parseCoordKey(key) {
        const [col, row] = key.split(',').map(Number);
        return { col, row };
    }
}
