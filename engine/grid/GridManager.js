/**
 * @file GridManager.js
 * @description Manages the game grid, including its properties, coordinate conversions,
 * and rendering of debug grid lines.
 */

/**
 * @class GridManager
 * @classdesc Handles the logic and properties of the game grid.
 * It supports square grids, provides coordinate conversion utilities,
 * and can render a debug visualization of the grid.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine.
 * @property {number} numCols - Number of columns in the grid.
 * @property {number} numRows - Number of rows in the grid.
 * @property {number} tileWidth - Width of a single tile in pixels.
 * @property {number} tileHeight - Height of a single tile in pixels.
 * @property {boolean} showGridLines - Flag to control rendering of debug grid lines.
 * @property {string} gridLineColor - Color for the debug grid lines.
 */
export class GridManager {
    /**
     * Creates an instance of GridManager.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     * @param {object} config - Configuration for the grid.
     * @param {number} config.numCols - Number of columns.
     * @param {number} config.numRows - Number of rows.
     * @param {number} config.tileWidth - Width of each tile in pixels.
     * @param {number} config.tileHeight - Height of each tile in pixels.
     * @param {boolean} [config.showGridLines=true] - Whether to show debug grid lines.
     * @param {string} [config.gridLineColor='rgba(255,255,255,0.3)'] - Color of debug grid lines.
     */
    constructor(engine, config) {
        if (!engine || !engine.errorHandler || !engine.renderingEngine) {
            throw new Error("GridManager constructor: Valid 'engine' instance with 'errorHandler' and 'renderingEngine' is required.");
        }
        this.engine = engine;

        if (!config || typeof config.numCols !== 'number' || typeof config.numRows !== 'number' ||
            typeof config.tileWidth !== 'number' || typeof config.tileHeight !== 'number') {
            this.engine.errorHandler.critical("GridManager constructor: config object with numCols, numRows, tileWidth, and tileHeight is required.", { component: 'GridManager' });
            // Fallback or throw. For now, let critical handle it.
        }

        this.numCols = config.numCols;
        this.numRows = config.numRows;
        this.tileWidth = config.tileWidth;
        this.tileHeight = config.tileHeight;
        this.showGridLines = config.showGridLines === undefined ? true : config.showGridLines;
        this.gridLineColor = config.gridLineColor || 'rgba(255,255,255,0.3)';

        this.engine.errorHandler.info(
            `GridManager initialized: ${this.numCols}x${this.numRows} grid, ${this.tileWidth}x${this.tileHeight} tiles.`,
            { component: 'GridManager' }
        );
    }

    /**
     * Converts screen coordinates (e.g., mouse position) to grid coordinates.
     * Takes into account the camera's position and zoom.
     * @param {number} screenX - The x-coordinate on the screen.
     * @param {number} screenY - The y-coordinate on the screen.
     * @returns {{gridX: number, gridY: number} | null} The corresponding grid cell coordinates (integer)
     *                                                  or null if the screen coordinates are outside the grid bounds
     *                                                  (after considering camera).
     */
    screenToGrid(screenX, screenY) {
        const worldPos = this.engine.renderingEngine.camera.screenToWorld(screenX, screenY);

        const gridX = Math.floor(worldPos.x / this.tileWidth);
        const gridY = Math.floor(worldPos.y / this.tileHeight);

        if (gridX < 0 || gridX >= this.numCols || gridY < 0 || gridY >= this.numRows) {
            return null; // Position is outside the defined grid
        }
        return { gridX, gridY };
    }

    /**
     * Converts grid coordinates to screen coordinates (top-left of the tile).
     * Takes into account the camera's position and zoom for rendering.
     * Note: This returns the top-left of the tile in *world* space. The camera transform handles world to screen.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @returns {{worldX: number, worldY: number}} The world coordinates of the top-left corner of the grid cell.
     */
    gridToWorld(gridX, gridY) {
        return {
            worldX: gridX * this.tileWidth,
            worldY: gridY * this.tileHeight
        };
    }

    /**
     * Gets the world coordinates for the center of a grid cell.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @returns {{worldX: number, worldY: number}} The world coordinates of the center of the grid cell.
     */
    gridCellToWorldCenter(gridX, gridY) {
        return {
            worldX: (gridX * this.tileWidth) + this.tileWidth / 2,
            worldY: (gridY * this.tileHeight) + this.tileHeight / 2
        };
    }

    /**
     * Renders debug grid lines if `showGridLines` is true.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The rendering engine instance.
     */
    renderGridLines(renderingEngine) {
        if (!this.showGridLines) {
            return;
        }

        const worldWidth = this.numCols * this.tileWidth;
        const worldHeight = this.numRows * this.tileHeight;

        // Draw vertical lines
        for (let i = 0; i <= this.numCols; i++) {
            const x = i * this.tileWidth;
            renderingEngine.drawLine(x, 0, x, worldHeight, this.gridLineColor, 1);
        }

        // Draw horizontal lines
        for (let j = 0; j <= this.numRows; j++) {
            const y = j * this.tileHeight;
            renderingEngine.drawLine(0, y, worldWidth, y, this.gridLineColor, 1);
        }
    }

    /**
     * Checks if given grid coordinates are within the bounds of the grid.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @returns {boolean} True if the coordinates are within bounds, false otherwise.
     */
    isInBounds(gridX, gridY) {
        return gridX >= 0 && gridX < this.numCols && gridY >= 0 && gridY < this.numRows;
    }
}

export default GridManager;
