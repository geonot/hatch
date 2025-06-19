/**
 * @file Tile.js
 * @description Represents a single tile in a grid.
 */

/**
 * @class Tile
 * @classdesc A simple data structure representing a tile on the game grid.
 * It holds information about its type, grid coordinates, and any custom data.
 *
 * @property {string} type - The type of the tile (e.g., 'wall', 'floor', 'grass').
 *                           This typically corresponds to a key defined in TileManager.
 * @property {number} gridX - The x-coordinate of the tile in the grid.
 * @property {number} gridY - The y-coordinate of the tile in the grid.
 * @property {object} data - An optional object to store custom data associated with this tile.
 * @property {boolean} visible - Whether the tile should be rendered. Defaults to true.
 * @property {number} zIndex - Rendering order. Defaults to 0.
 */
export class Tile {
    /**
     * Creates an instance of Tile.
     * @param {string} type - The type of the tile.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @param {object} [data={}] - Optional custom data for this tile.
     */
    constructor(type, gridX, gridY, data = {}) {
        if (typeof type !== 'string') {
            throw new TypeError('Tile constructor: type must be a string.');
        }
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            throw new TypeError('Tile constructor: gridX and gridY must be numbers.');
        }

        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.data = data;
        this.visible = true;
        this.zIndex = 0; // Default zIndex
    }

    // Basic render method for now, assuming it's drawn by TileManager
    // If Tile instances were to render themselves directly via RenderingEngine.add(tile),
    // this method would be more complex.
    render(context, tileManager, gridManager, assetManager) {
        // This method might be called by TileManager if it iterates tiles
        // and calls tile.render(). Or, TileManager can handle rendering directly.
        // For this step, TileManager will handle rendering.
    }
}
