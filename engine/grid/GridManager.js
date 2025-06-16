/**
 * @file GridManager.js
 * @description Provides functionality for managing a 2D grid, including coordinate conversions,
 * storing grid data, and debug rendering. Primarily designed for square grids.
 */

/**
 * @class GridManager
 * @classdesc Manages a 2D grid system for a game scene. It handles conversions between
 * world coordinates and grid coordinates, stores data for each grid cell (e.g., tile instances,
 * pathfinding information), and can render debug grid lines.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance.
 * @property {string} type - The type of grid (e.g., 'square'). Currently, only 'square' is fully supported.
 * @property {number} tileWidth - The width of each tile in the grid, in world units (pixels).
 * @property {number} tileHeight - The height of each tile in the grid, in world units (pixels).
 * @property {number} mapWidth - The width of the grid in number of tiles (columns).
 * @property {number} mapHeight - The height of the grid in number of tiles (rows).
 * @property {number} offsetX - The world x-coordinate of the grid's top-left origin. Default is 0.
 * @property {number} offsetY - The world y-coordinate of the grid's top-left origin. Default is 0.
 * @property {Array<any>} gridData - A 1D array storing custom data for each grid cell, indexed by `y * mapWidth + x`.
 *                                   Each element is initialized to `null`.
 */
class GridManager {
    /**
     * Creates an instance of GridManager.
     * @param {object} options - Configuration options for the grid.
     * @param {import('../core/HatchEngine.js').HatchEngine} options.engine - Reference to the HatchEngine instance. This is mandatory.
     * @param {string} [options.type='square'] - Type of grid (e.g., 'square'). Currently, only 'square' is fully supported.
     * @param {number} [options.tileWidth=32] - Width of a single tile in world units (typically pixels).
     * @param {number} [options.tileHeight=32] - Height of a single tile in world units (typically pixels).
     * @param {number} [options.mapWidth=20] - Width of the map in number of tiles (columns).
     * @param {number} [options.mapHeight=15] - Height of the map in number of tiles (rows).
     * @param {number} [options.offsetX=0] - X-offset of the grid's top-left origin in world coordinates.
     * @param {number} [options.offsetY=0] - Y-offset of the grid's top-left origin in world coordinates.
     * @throws {Error} If `options.engine` is not provided, as it's a required dependency.
     */
    constructor({
        engine,
        type = 'square',
        tileWidth = 32,
        tileHeight = 32,
        mapWidth = 20,
        mapHeight = 15,
        offsetX = 0,
        offsetY = 0
    }) {
        if (!engine) {
            // This is a critical setup error.
            throw new Error("GridManager constructor: 'engine' instance is required.");
        }
        this.engine = engine; // Assign early so errorHandler can be used if needed

        if (typeof type !== 'string') {
            this.engine.errorHandler.error("GridManager constructor: 'type' must be a string.", { component: 'GridManager', method: 'constructor', params: { type } });
            throw new TypeError("GridManager constructor: 'type' must be a string.");
        }
        this.type = type;

        if (typeof tileWidth !== 'number' || tileWidth <= 0) {
            this.engine.errorHandler.error("GridManager constructor: 'tileWidth' must be a positive number.", { component: 'GridManager', method: 'constructor', params: { tileWidth } });
            throw new RangeError("GridManager constructor: 'tileWidth' must be a positive number.");
        }
        this.tileWidth = tileWidth;

        if (typeof tileHeight !== 'number' || tileHeight <= 0) {
            this.engine.errorHandler.error("GridManager constructor: 'tileHeight' must be a positive number.", { component: 'GridManager', method: 'constructor', params: { tileHeight } });
            throw new RangeError("GridManager constructor: 'tileHeight' must be a positive number.");
        }
        this.tileHeight = tileHeight;

        if (typeof mapWidth !== 'number' || mapWidth <= 0) {
            this.engine.errorHandler.error("GridManager constructor: 'mapWidth' must be a positive number.", { component: 'GridManager', method: 'constructor', params: { mapWidth } });
            throw new RangeError("GridManager constructor: 'mapWidth' must be a positive number.");
        }
        this.mapWidth = mapWidth;

        if (typeof mapHeight !== 'number' || mapHeight <= 0) {
            this.engine.errorHandler.error("GridManager constructor: 'mapHeight' must be a positive number.", { component: 'GridManager', method: 'constructor', params: { mapHeight } });
            throw new RangeError("GridManager constructor: 'mapHeight' must be a positive number.");
        }
        this.mapHeight = mapHeight;

        if (typeof offsetX !== 'number') {
            this.engine.errorHandler.warn("GridManager constructor: 'offsetX' should be a number. Defaulting to 0.", { component: 'GridManager', method: 'constructor', params: { offsetX } });
            this.offsetX = 0;
        } else {
            this.offsetX = offsetX;
        }

        if (typeof offsetY !== 'number') {
            this.engine.errorHandler.warn("GridManager constructor: 'offsetY' should be a number. Defaulting to 0.", { component: 'GridManager', method: 'constructor', params: { offsetY } });
            this.offsetY = 0;
        } else {
            this.offsetY = offsetY;
        }

        /**
         * A 1D array storing custom data for each grid cell. The data is laid out row by row.
         * Access cell data for (x, y) using `gridData[y * mapWidth + x]`.
         * @type {Array<any>}
         */
        this.gridData = new Array(this.mapHeight * this.mapWidth).fill(null);

        this.engine.errorHandler.info(
            `GridManager Initialized: ${this.mapWidth}x${this.mapHeight} [${this.type}] grid. Tile: ${this.tileWidth}x${this.tileHeight}. Offset: (${this.offsetX},${this.offsetY})`, {
                component: 'GridManager',
                method: 'constructor'
            }
        );
    }

    /**
     * Converts world coordinates (e.g., mouse position in world space) to grid cell coordinates.
     * @param {number} worldX - The x-coordinate in world space.
     * @param {number} worldY - The y-coordinate in world space (e.g., from mouse input after camera transformation).
     * @returns {{x: number, y: number}} An object containing the grid cell's column `x` and row `y`.
     *                                   Coordinates may be outside the grid boundaries if worldX/worldY are outside.
     */
    worldToGrid(worldX, worldY) {
        if (typeof worldX !== 'number' || typeof worldY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for worldToGrid (must be numbers).', { component: 'GridManager', method: 'worldToGrid', params: { worldX, worldY } });
            return { x: NaN, y: NaN };
        }
        if (this.tileWidth === 0 || this.tileHeight === 0) {
            this.engine.errorHandler.error('Tile dimensions (tileWidth/tileHeight) are zero, cannot perform worldToGrid conversion.', { component: 'GridManager', method: 'worldToGrid' });
            return { x: NaN, y: NaN };
        }
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
     * @returns {{x: number, y: number}} An object containing the world `x` and `y` coordinates.
     */
    gridToWorld(gridX, gridY, centered = false) {
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for gridToWorld (must be numbers).', { component: 'GridManager', method: 'gridToWorld', params: { gridX, gridY } });
            return { x: NaN, y: NaN };
        }
        if (typeof centered !== 'boolean') {
            this.engine.errorHandler.warn('Invalid type for "centered" parameter in gridToWorld (must be boolean). Defaulting to false.', { component: 'GridManager', method: 'gridToWorld', params: { centered } });
            centered = false;
        }
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
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for isValidGridPosition (must be numbers).', { component: 'GridManager', method: 'isValidGridPosition', params: { gridX, gridY } });
            return false;
        }
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
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for getNeighbors (gridX/gridY must be numbers).', { component: 'GridManager', method: 'getNeighbors', params: { gridX, gridY } });
            return [];
        }
        if (typeof includeDiagonals !== 'boolean') {
            this.engine.errorHandler.warn('Invalid type for "includeDiagonals" in getNeighbors (must be boolean). Defaulting to false.', { component: 'GridManager', method: 'getNeighbors', params: { includeDiagonals } });
            includeDiagonals = false;
        }
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
     * This data can be anything relevant to the game's logic, such as a reference to a
     * Tile instance, pathfinding cost, terrain type identifier, or game object occupying the cell.
     * @param {number} gridX - The x-coordinate (column) of the grid cell.
     * @param {number} gridY - The y-coordinate (row) of the grid cell.
     * @param {any} data - The data to store for the specified cell.
     * @returns {boolean} True if the data was set successfully (i.e., the position was valid), false otherwise.
     */
    setTileData(gridX, gridY, data) {
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for setTileData (gridX/gridY must be numbers).', { component: 'GridManager', method: 'setTileData', params: { gridX, gridY } });
            return false;
        }
        if (this.isValidGridPosition(gridX, gridY)) {
            this.gridData[gridY * this.mapWidth + gridX] = data;
            return true;
        }
        // isValidGridPosition would have already logged an error if types were wrong,
        // so this warn is specifically for out-of-bounds after type validation.
        this.engine.errorHandler.warn(
            `Attempted to set tile data outside grid boundaries.`, {
                component: 'GridManager',
                method: 'setTileData',
                params: { gridX, gridY, mapWidth: this.mapWidth, mapHeight: this.mapHeight }
            }
        );
        return false;
    }

    /**
     * Retrieves the custom data stored for a specific tile (cell) in the grid.
     * @param {number} gridX - The x-coordinate (column) of the grid cell.
     * @param {number} gridY - The y-coordinate (row) of the grid cell.
     * @returns {any | undefined} The data stored for the cell if the position is valid. This could be `null`
     *                            if the cell is valid but no data has been set. Returns `undefined` if the
     *                            coordinates are outside the grid boundaries.
     */
    getTileData(gridX, gridY) {
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for getTileData (gridX/gridY must be numbers).', { component: 'GridManager', method: 'getTileData', params: { gridX, gridY } });
            return undefined;
        }
        if (this.isValidGridPosition(gridX, gridY)) {
            return this.gridData[gridY * this.mapWidth + gridX];
        }
        // isValidGridPosition would have already logged an error if types were wrong.
        // No additional log here for out-of-bounds get, as it's a common way to check.
        return undefined;
    }

    /**
     * Renders grid lines for debugging purposes. This method should be called within a scene's
     * `render` method (or a dedicated debug render pass), after camera transformations
     * have been applied to the rendering context by `RenderingEngine.camera.applyTransform()`.
     * It uses the `RenderingEngine.drawLine()` method for drawing.
     *
     * @param {import('../rendering/RenderingEngine.js').RenderingEngine} renderingEngine - The engine's rendering manager.
     * @param {string} [color='#555555'] - CSS color string for the grid lines.
     * @param {number} [lineWidth=1] - Desired width of the grid lines in world units.
     *                                 The actual visual thickness will be adjusted by camera zoom within `renderingEngine.drawLine`.
     */
    renderGridLines(renderingEngine, color = '#555555', lineWidth = 1) {
        if (!renderingEngine || typeof renderingEngine.drawLine !== 'function') {
            this.engine.errorHandler.error("Valid RenderingEngine with drawLine method is required to render grid lines.", {
                component: 'GridManager',
                method: 'renderGridLines',
                params: { hasRenderingEngine: !!renderingEngine, hasDrawLine: typeof renderingEngine?.drawLine }
            });
            return;
        }
        if (typeof color !== 'string') {
            this.engine.errorHandler.warn('Invalid color type for renderGridLines. Defaulting to #555555.', { component: 'GridManager', method: 'renderGridLines', params: { color } });
            color = '#555555';
        }
        if (typeof lineWidth !== 'number' || lineWidth <= 0) {
            this.engine.errorHandler.warn('Invalid lineWidth for renderGridLines (must be a positive number). Defaulting to 1.', { component: 'GridManager', method: 'renderGridLines', params: { lineWidth } });
            lineWidth = 1;
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
