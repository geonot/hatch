/**
 * @file TileManager.js
 * @description Manages the definition, creation, and rendering of tiles within a grid-based system.
 * It works in conjunction with `GridManager` for spatial organization and `AssetManager` for loading tile sprites.
 */

import Tile from './Tile.js';
import Sprite from '../rendering/Sprite.js';

/**
 * @class TileManager
 * @classdesc Handles the lifecycle of tiles in a game. This includes defining types of tiles
 * (e.g., 'grass', 'wall') with their properties and visual representations (sprites or colors),
 * creating instances of these tiles on a grid, and managing their rendering.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine.
 * @property {import('../grid/GridManager.js').default} gridManager - Manages the grid on which tiles are placed.
 * @property {import('../assets/AssetManager.js').default} assetManager - Used for loading tile sprites.
 * @property {import('../rendering/RenderingEngine.js').default} renderingEngine - Used to add tiles to the render queue.
 * @property {Map<string, Object>} tileTypes - Stores definitions for tile types, keyed by type name.
 *           Each definition includes `spritePath`, `color`, `properties`, and `zIndex`.
 * @property {Map<string, Tile>} tilesMap - Stores active `Tile` instances, keyed by a string "x,y" of their grid coordinates.
 */
class TileManager {
    /**
     * Creates an instance of TileManager.
     * @param {Object} options - Configuration options.
     * @param {import('../core/HatchEngine.js').default} options.engine - Reference to the HatchEngine instance.
     * @param {import('../grid/GridManager.js').default} options.gridManager - Reference to the GridManager instance
     *        that this TileManager will operate upon.
     * @throws {Error} If `engine` or `gridManager` is not provided.
     */
    constructor({ engine, gridManager }) {
        if (!engine) {
            throw new Error("TileManager constructor: 'engine' instance is required.");
        }
        if (!gridManager) {
            throw new Error("TileManager constructor: 'gridManager' instance is required.");
        }

        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {import('../grid/GridManager.js').default} */
        this.gridManager = gridManager;
        /** @type {import('../assets/AssetManager.js').default} */
        this.assetManager = engine.assetManager;
        /** @type {import('../rendering/RenderingEngine.js').default} */
        this.renderingEngine = engine.renderingEngine;

        /** @type {Map<string, {spritePath: ?string, color: string, properties: Object}>} */
        this.tileTypes = new Map();
        /** @type {Map<string, Tile>} */
        this.tilesMap = new Map();

        this.engine.errorHandler.info("TileManager Initialized.", { component: 'TileManager', method: 'constructor' });
    }

    /**
     * Defines a new type of tile that can be created.
     * @param {string} name - The unique name for this tile type (e.g., 'grass', 'wall', 'water').
     * @param {Object} definition - The properties defining this tile type.
     * @param {?string} [definition.spritePath=null] - Path to the sprite image for this tile type.
     *                                                 If null, `color` will be used. Path is relative to where game is served from.
     * @param {string} [definition.color='gray'] - Fallback CSS color string to use if `spritePath` is null or sprite fails to load.
     * @param {Object} [definition.properties={}] - Custom properties associated with this tile type (e.g., `{ solid: true, movementCost: 2 }`).
 * @param {number} [definition.zIndex=0] - Default zIndex for tiles of this type.
     */
    defineTileType(name, definition) {
        if (typeof name !== 'string' || name.trim() === '') {
            this.engine.errorHandler.error("TileManager.defineTileType: 'name' must be a non-empty string.", { component: 'TileManager', method: 'defineTileType', params: { name } });
            return;
        }
        if (typeof definition !== 'object' || definition === null) {
            this.engine.errorHandler.error(`TileManager.defineTileType: 'definition' for tile type '${name}' must be an object.`, { component: 'TileManager', method: 'defineTileType', params: { name, definition } });
            return;
        }

        const { spritePath = null, color = 'gray', properties = {}, zIndex = 0 } = definition;

        const validatedDefinition = {
            spritePath: (spritePath !== null && typeof spritePath !== 'string') ? (this.engine.errorHandler.warn(`TileManager.defineTileType: 'spritePath' for tile type '${name}' must be a string or null. Using null.`, { component: 'TileManager', method: 'defineTileType', params: { name, spritePath } }), null) : spritePath,
            color: (typeof color !== 'string') ? (this.engine.errorHandler.warn(`TileManager.defineTileType: 'color' for tile type '${name}' must be a string. Using 'gray'.`, { component: 'TileManager', method: 'defineTileType', params: { name, color } }), 'gray') : color,
            properties: (typeof properties !== 'object' || properties === null) ? (this.engine.errorHandler.warn(`TileManager.defineTileType: 'properties' for tile type '${name}' must be an object. Using {}.`, { component: 'TileManager', method: 'defineTileType', params: { name, properties } }), {}) : properties,
            zIndex: (typeof zIndex !== 'number') ? (this.engine.errorHandler.warn(`TileManager.defineTileType: 'zIndex' for tile type '${name}' must be a number. Using 0.`, { component: 'TileManager', method: 'defineTileType', params: { name, zIndex } }), 0) : zIndex,
        };


        if (this.tileTypes.has(name)) {
            this.engine.errorHandler.warn(`Tile type '${name}' is being redefined.`, { component: 'TileManager', method: 'defineTileType', params: { name }});
        }

        this.tileTypes.set(name, validatedDefinition);
        this.engine.errorHandler.info(`Tile type '${name}' defined. Sprite: ${validatedDefinition.spritePath || 'N/A'}, Color: ${validatedDefinition.color}, zIndex: ${validatedDefinition.zIndex}, Properties: ${JSON.stringify(validatedDefinition.properties)}`, { component: 'TileManager', method: 'defineTileType', params: { name, definition: validatedDefinition }});
    }

    /**
     * Creates a new `Tile` instance of a defined type at the specified grid coordinates.
     * If a sprite is defined for the tile type, it attempts to load it via the `AssetManager`.
     * The new tile is stored in `GridManager`'s data and `TileManager`'s internal map.
     *
     * @param {string} typeName - The name of the tile type (must be pre-defined using `defineTileType`).
     * @param {number} gridX - The grid x-coordinate (column) for the new tile.
     * @param {number} gridY - The grid y-coordinate (row) for the new tile.
     * @param {object} [options={}] - Optional parameters for creating the tile.
     * @param {number} [options.zIndex] - Specific zIndex for this tile instance, overrides type default.
     * @returns {Promise<Tile|null>} A promise that resolves with the created `Tile` instance,
     *                               or `null` if the position is invalid or the type is not defined.
     *                               The promise handles asynchronous sprite loading.
     * @async
     */
    async createTile(typeName, gridX, gridY, options = {}) {
        if (typeof typeName !== 'string' || typeName.trim() === '') {
            this.engine.errorHandler.error("TileManager.createTile: 'typeName' must be a non-empty string.", { component: 'TileManager', method: 'createTile', params: { typeName, gridX, gridY, options } });
            return null;
        }
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error("TileManager.createTile: 'gridX' and 'gridY' must be numbers.", { component: 'TileManager', method: 'createTile', params: { typeName, gridX, gridY } });
            return null;
        }

        if (!this.gridManager.isValidGridPosition(gridX, gridY)) {
            this.engine.errorHandler.warn(`Attempted to create tile at invalid grid position (${gridX}, ${gridY}).`, { component: 'TileManager', method: 'createTile', params: { typeName, gridX, gridY, options }});
            return null;
        }

        const typeDef = this.tileTypes.get(typeName);
        if (!typeDef) {
            const errorMessage = `Tile type '${typeName}' not defined.`;
            this.engine.errorHandler.warn(errorMessage, {
                component: 'TileManager',
                method: 'createTile',
                params: { typeName, gridX, gridY, options },
                message: errorMessage
            });
            return null;
        }

        const worldPos = this.gridManager.gridToWorld(gridX, gridY); // Top-left world position
        let tileSprite = null;
        const zIndex = (options && typeof options.zIndex === 'number') ? options.zIndex : typeDef.zIndex;


        if (typeDef.spritePath) {
            // AssetManager handles caching, so use a consistent name for the asset.
            const spriteAssetName = `tile_${typeName}_${typeDef.spritePath}`;
            try {
                const image = await this.assetManager.loadAsset({
                    name: spriteAssetName,
                    path: typeDef.spritePath,
                    type: 'image'
                });

                if (image) {
                    tileSprite = new Sprite({
                        image: image,
                        x: 0, y: 0,
                        width: this.gridManager.tileWidth,
                        height: this.gridManager.tileHeight,
                        anchorX: 0,
                        anchorY: 0,
                        // Sprite's zIndex can be independent or linked. For now, let tile's zIndex govern.
                        // zIndex: zIndex // If sprite needs its own zIndex matching the tile's.
                    });
                } else {
                    this.engine.errorHandler.warn(
                        `TileManager.createTile: AssetManager returned no image for tile type '${typeName}' (path: ${typeDef.spritePath}). Using fallback color.`,
                        { context: 'TileManager.createTile.loadAssetNull', tileType: typeName, spritePath: typeDef.spritePath }
                    );
                }
            } catch (error) {
                // AssetManager's loadAsset already calls errorHandler.critical for load failures.
                // This warning is specifically about the TileManager's fallback behavior.
                this.engine.errorHandler.warn(
                    `TileManager.createTile: Failed to load sprite for tile type '${typeName}' (path: ${typeDef.spritePath}). Fallback to color. Original error: ${error.message}`,
                    { context: 'TileManager.createTile.loadAssetError', tileType: typeName, spritePath: typeDef.spritePath, originalError: error }
                );
            }
        }

        const newTile = new Tile({
            type: typeName,
            gridX, gridY,
            worldX: worldPos.x, worldY: worldPos.y,
            width: this.gridManager.tileWidth, height: this.gridManager.tileHeight,
            data: { ...typeDef.properties },
            sprite: tileSprite,
            color: tileSprite ? null : typeDef.color,
            visible: true,
            zIndex: zIndex // Pass the determined zIndex to the Tile constructor
        });

        this.gridManager.setTileData(gridX, gridY, newTile);
        this.tilesMap.set(`${gridX},${gridY}`, newTile);

        return newTile;
    }

    /**
     * Retrieves the `Tile` instance at the specified grid coordinates.
     * The actual tile data is stored in `GridManager`.
     * @param {number} gridX - The grid x-coordinate (column).
     * @param {number} gridY - The grid y-coordinate (row).
     * @returns {?Tile|any} The `Tile` instance if found, or the raw data from `GridManager`
     *                      (which could be `null` or `undefined` if no tile or out of bounds).
     */
    getTileAt(gridX, gridY) {
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error("TileManager.getTileAt: 'gridX' and 'gridY' must be numbers.", { component: 'TileManager', method: 'getTileAt', params: { gridX, gridY } });
            return undefined;
        }
        return this.gridManager.getTileData(gridX, gridY);
    }

    /**
     * Removes a tile from the specified grid coordinates.
     * This involves clearing its data in `GridManager` and removing it from `tilesMap`.
     * @param {number} gridX - The grid x-coordinate (column).
     * @param {number} gridY - The grid y-coordinate (row).
     */
    removeTile(gridX, gridY) {
        if (typeof gridX !== 'number' || typeof gridY !== 'number') {
            this.engine.errorHandler.error("TileManager.removeTile: 'gridX' and 'gridY' must be numbers.", { component: 'TileManager', method: 'removeTile', params: { gridX, gridY } });
            return;
        }
        const tileKey = `${gridX},${gridY}`;
        // It's better to get the tile from tilesMap directly if we are managing Tile instances there.
        // getTileAt might return raw data if GridManager stores something other than Tile instances directly,
        // or if TileManager doesn't populate GridManager with Tile instances (which it does).
        const tileToRemove = this.tilesMap.get(tileKey);

        if (tileToRemove) {
            if (typeof tileToRemove.destroy === 'function') {
                try {
                    tileToRemove.destroy();
                } catch (e) {
                    this.engine.errorHandler.error(`Error destroying tile at (${gridX},${gridY}): ${e.message}`, { context: 'TileManager.removeTile.destroyTile', gridX, gridY, originalError: e });
                }
            }
            this.gridManager.setTileData(gridX, gridY, null); // Clear from GridManager
            this.tilesMap.delete(tileKey); // Clear from TileManager's map
        } else {
            // If tileToRemove is not in tilesMap, still ensure it's cleared from GridManager if it exists there.
            // This handles cases where GridManager might have data not tracked by tilesMap (though ideally they are in sync).
            if (this.gridManager.getTileData(gridX, gridY) !== null) {
                 this.gridManager.setTileData(gridX, gridY, null);
                 this.engine.errorHandler.warn(`Cleared untracked tile data from GridManager at (${gridX},${gridY}).`, { component: 'TileManager', method: 'removeTile', params: { gridX, gridY }});
            }
        }
    }

    /**
     * Clears all tiles from the map, resetting `gridData` in `GridManager` and clearing `tilesMap`.
     */
    clearAllTiles() {
        for (let r = 0; r < this.gridManager.mapHeight; r++) {
            for (let c = 0; c < this.gridManager.mapWidth; c++) {
                const tile = this.getTileAt(c, r); // Assuming getTileAt retrieves the Tile instance
                if (tile && typeof tile.destroy === 'function') {
                    try {
                        tile.destroy();
                    } catch (e) {
                        this.engine.errorHandler.error(`Error destroying tile at (${c},${r}): ${e.message}`, { context: 'TileManager.clearAllTiles.destroyTile', gridX: c, gridY: r, originalError: e });
                    }
                }
                // Ensure GridManager is cleared regardless of tile.destroy success
                this.gridManager.setTileData(c, r, null);
            }
        }
        this.tilesMap.clear(); // Clear the TileManager's own map
        this.engine.errorHandler.info("All tiles cleared from GridManager and internal map. Individual tile destroy methods called if present.", { component: 'TileManager', method: 'clearAllTiles'});
    }


    /**
     * Adds all currently managed visible tiles to the `RenderingEngine`'s drawable list for rendering.
     * This method should be called by the active scene's `render` method each frame.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     * @throws {Error} If `renderingEngine` is not provided.
     */
    renderTiles(renderingEngine) {
        if (!renderingEngine) {
            this.engine.errorHandler.error("RenderingEngine instance is required for renderTiles.", { component: 'TileManager', method: 'renderTiles'});
            return;
        }
        for (const tile of this.tilesMap.values()) {
            if (tile.visible) {
                renderingEngine.add(tile); // Tile instances are themselves drawable
            }
        }
    }
}

export default TileManager;
