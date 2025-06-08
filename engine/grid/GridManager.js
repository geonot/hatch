/**
 * @file GridManager.js
 * @description Provides functionality for managing a 2D grid, including coordinate conversions,
 * storing grid data, and debug rendering. Primarily designed for square grids.
 */

/**
 * @class GridManager
 * @classdesc Manages a 2D grid system for a game scene. It handles conversions between
 * world coordinates and grid coordinates, stores data for each grid cell (e.g., tile instances),
 * and can render debug grid lines.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine.
 * @property {string} type - The type of grid (e.g., 'square'). Currently, only 'square' is fully supported.
 * @property {number} tileWidth - The width of each tile in the grid, in world units.
 * @property {number} tileHeight - The height of each tile in the grid, in world units.
 * @property {number} mapWidth - The width of the grid in number of tiles.
 * @property {number} mapHeight - The height of the grid in number of tiles.
 * @property {number} offsetX - The world x-coordinate of the grid's top-left origin.
 * @property {number} offsetY - The world y-coordinate of the grid's top-left origin.
 * @property {Array<any>} gridData - A 1D array storing data for each grid cell, indexed by `y * mapWidth + x`.
 */
class GridManager {
    /**
     * Creates an instance of GridManager.
     * @param {Object} options - Configuration options for the grid.
     * @param {import('../core/HatchEngine.js').default} options.engine - Reference to the HatchEngine instance.
     * @param {string} [options.type='square'] - Type of grid (e.g., 'square'). Currently only 'square' is supported.
     * @param {number} [options.tileWidth=32] - Width of a single tile in world units (pixels).
     * @param {number} [options.tileHeight=32] - Height of a single tile in world units (pixels).
     * @param {number} [options.mapWidth=20] - Width of the map in number of tiles.
     * @param {number} [options.mapHeight=15] - Height of the map in number of tiles.
     * @param {number} [options.offsetX=0] - X-offset of the grid's top-left origin in world coordinates.
     * @param {number} [options.offsetY=0] - Y-offset of the grid's top-left origin in world coordinates.
     * @throws {Error} If `options.engine` is not provided.
     */
    constructor({
        engine,
        type = 'square', // 'square', 'hex', 'isometric'
        tileWidth = 32,
        tileHeight = 32,
        mapWidth = 20,  // Number of tiles wide
        mapHeight = 15, // Number of tiles high
        offsetX = 0,    // World X position of grid origin (top-left)
        offsetY = 0     // World Y position of grid origin (top-left)
    }) {
        if (!engine) {
            throw new Error("GridManager constructor: 'engine' instance is required.");
        }
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {string} */
        this.type = type;
        /** @type {number} */
        this.tileWidth = tileWidth;
        /** @type {number} */
        this.tileHeight = tileHeight;
        /** @type {number} */
        this.mapWidth = mapWidth;
        /** @type {number} */
        this.mapHeight = mapHeight;
        /** @type {number} */
        this.offsetX = offsetX;
        /** @type {number} */
        this.offsetY = offsetY;

        /**
         * Stores data for each cell in the grid. This is a 1D array representing a 2D grid.
         * Access using `gridData[y * mapWidth + x]`.
         * @type {Array<any>}
         */
        this.gridData = new Array(this.mapHeight * this.mapWidth).fill(null);

        console.log(`GridManager: Initialized ${this.mapWidth}x${this.mapHeight} [${this.type}] grid. Tile size: ${this.tileWidth}x${this.tileHeight}. World offset: (${this.offsetX},${this.offsetY})`);
    }

    /**
     * Converts world coordinates (e.g., mouse position in world space) to grid cell coordinates.
     * @param {number} worldX - The x-coordinate in world space.
     * @param {number} worldY - The y-coordinate in world space.
     * @returns {{x: number, y: number}} The corresponding grid cell coordinates (column `x`, row `y`).
     */
    worldToGrid(worldX, worldY) {
        const relativeX = worldX - this.offsetX;
        const relativeY = worldY - this.offsetY;

        const gridX = Math.floor(relativeX / this.tileWidth);
        const gridY = Math.floor(relativeY / this.tileHeight);

        return { x: gridX, y: gridY };
    }

    /**
     * Converts grid cell coordinates to world coordinates.
     * @param {number} gridX - The x-coordinate (column) of the grid cell.
     * @param {number} gridY - The y-coordinate (row) of the grid cell.
     * @param {boolean} [centered=false] - If true, returns the world coordinates of the center of the cell.
     *                                     If false (default), returns the world coordinates of the top-left corner of the cell.
     * @returns {{x: number, y: number}} The corresponding world coordinates.
     */
    gridToWorld(gridX, gridY, centered = false) {
        let worldX = (gridX * this.tileWidth) + this.offsetX;
        let worldY = (gridY * this.tileHeight) + this.offsetY;

        if (centered) {
            worldX += this.tileWidth / 2;
            worldY += this.tileHeight / 2;
        }
        return { x: worldX, y: worldY };
    }

    /**
     * Checks if the given grid coordinates (column `gridX`, row `gridY`) are within the valid boundaries of the map.
     * @param {number} gridX - The x-coordinate (column) of the grid cell to check.
     * @param {number} gridY - The y-coordinate (row) of the grid cell to check.
     * @returns {boolean} True if the position is within the map boundaries, false otherwise.
     */
    isValidGridPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.mapWidth && gridY >= 0 && gridY < this.mapHeight;
    }

    /**
     * Gets the valid neighboring grid cells for a given cell.
     * For a 'square' grid, this typically includes N, E, S, W neighbors, and optionally diagonal ones.
     * @param {number} gridX - The x-coordinate (column) of the source grid cell.
     * @param {number} gridY - The y-coordinate (row) of the source grid cell.
     * @param {boolean} [includeDiagonals=false] - If true, includes diagonal neighbors in the result.
     * @returns {Array<{x: number, y: number}>} An array of objects, each with `x` and `y` properties
     *                                           representing the coordinates of a valid neighbor.
     */
    getNeighbors(gridX, gridY, includeDiagonals = false) {
        const neighbors = [];
        const baseDirections = [ // Cardinal directions
            { dx: 0, dy: -1, name: 'N' }, { dx: 1, dy: 0, name: 'E' },
            { dx: 0, dy: 1, name: 'S' },  { dx: -1, dy: 0, name: 'W' }
        ];
        const diagonalDirections = [ // Diagonal directions
            { dx: 1, dy: -1, name: 'NE' }, { dx: 1, dy: 1, name: 'SE' },
            { dx: -1, dy: 1, name: 'SW' }, { dx: -1, dy: -1, name: 'NW' }
        ];

        const directionsToUse = includeDiagonals ? [...baseDirections, ...diagonalDirections] : baseDirections;

        for (const dir of directionsToUse) {
            const nx = gridX + dir.dx;
            const ny = gridY + dir.dy;
            if (this.isValidGridPosition(nx, ny)) {
                neighbors.push({ x: nx, y: ny /*, direction: dir.name */ }); // Optionally include direction name
            }
        }
        return neighbors;
    }

    /**
     * Sets custom data for a specific tile (cell) in the grid.
     * This data can be anything, e.g., a Tile instance, pathfinding cost, or a terrain type identifier.
     * @param {number} gridX - The x-coordinate (column) of the grid cell.
     * @param {number} gridY - The y-coordinate (row) of the grid cell.
     * @param {any} data - The data to store for the specified cell.
     * @returns {boolean} True if the data was set successfully (position was valid), false otherwise.
     */
    setTileData(gridX, gridY, data) {
        if (this.isValidGridPosition(gridX, gridY)) {
            this.gridData[gridY * this.mapWidth + gridX] = data;
            return true;
        }
        // console.warn(`GridManager.setTileData: Position (${gridX}, ${gridY}) is outside grid boundaries.`);
        return false;
    }

    /**
     * Retrieves the custom data stored for a specific tile (cell) in the grid.
     * @param {number} gridX - The x-coordinate (column) of the grid cell.
     * @param {number} gridY - The y-coordinate (row) of the grid cell.
     * @returns {any|undefined} The data stored for the cell if the position is valid and data exists;
     *                          otherwise, `undefined` (if out of bounds) or `null` (if valid but no data set, default).
     */
    getTileData(gridX, gridY) {
        if (this.isValidGridPosition(gridX, gridY)) {
            return this.gridData[gridY * this.mapWidth + gridX];
        }
        return undefined; // Position is outside grid boundaries
    }

    /**
     * Renders grid lines for debugging purposes. This method should be called within a scene's
     * `render` method, after camera transformations have been applied to the rendering context.
     * Uses the `RenderingEngine.drawLine` method.
     *
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     * @param {string} [color='#555555'] - CSS color string for the grid lines.
     * @param {number} [lineWidth=1] - Desired width of the grid lines in world units.
     *                                 The actual visual thickness will be adjusted by camera zoom in `drawLine`.
     */
    renderGridLines(renderingEngine, color = '#555555', lineWidth = 1) {
        if (!renderingEngine || !renderingEngine.context || typeof renderingEngine.drawLine !== 'function') {
            console.error("GridManager.renderGridLines: Valid RenderingEngine with drawLine method is required.");
            return;
        }

        // Draw horizontal lines
        for (let row = 0; row <= this.mapHeight; row++) {
            const p1 = this.gridToWorld(0, row);
            const p2 = this.gridToWorld(this.mapWidth, row);
            renderingEngine.drawLine(p1.x, p1.y, p2.x, p2.y, color, lineWidth);
        }

        // Draw vertical lines
        for (let col = 0; col <= this.mapWidth; col++) {
            const p1 = this.gridToWorld(col, 0);
            const p2 = this.gridToWorld(col, this.mapHeight);
            renderingEngine.drawLine(p1.x, p1.y, p2.x, p2.y, color, lineWidth);
        }
    }
}

export default GridManager;
