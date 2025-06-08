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
 *           Each definition includes `spritePath`, `color`, and `properties`.
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

        console.log("TileManager: Initialized.");
    }

    /**
     * Defines a new type of tile that can be created.
     * @param {string} name - The unique name for this tile type (e.g., 'grass', 'wall', 'water').
     * @param {Object} definition - The properties defining this tile type.
     * @param {?string} [definition.spritePath=null] - Path to the sprite image for this tile type.
     *                                                 If null, `color` will be used. Path is relative to where game is served from.
     * @param {string} [definition.color='gray'] - Fallback CSS color string to use if `spritePath` is null or sprite fails to load.
     * @param {Object} [definition.properties={}] - Custom properties associated with this tile type (e.g., `{ solid: true, movementCost: 2 }`).
     */
    defineTileType(name, { spritePath = null, color = 'gray', properties = {} }) {
        if (this.tileTypes.has(name)) {
            console.warn(`TileManager.defineTileType: Tile type '${name}' is being redefined.`);
        }
        this.tileTypes.set(name, { spritePath, color, properties });
        console.log(`TileManager: Tile type '${name}' defined. Sprite: ${spritePath || 'N/A'}, Color: ${color}, Properties: ${JSON.stringify(properties)}`);
    }

    /**
     * Creates a new `Tile` instance of a defined type at the specified grid coordinates.
     * If a sprite is defined for the tile type, it attempts to load it via the `AssetManager`.
     * The new tile is stored in `GridManager`'s data and `TileManager`'s internal map.
     *
     * @param {string} typeName - The name of the tile type (must be pre-defined using `defineTileType`).
     * @param {number} gridX - The grid x-coordinate (column) for the new tile.
     * @param {number} gridY - The grid y-coordinate (row) for the new tile.
     * @returns {Promise<Tile|null>} A promise that resolves with the created `Tile` instance,
     *                               or `null` if the position is invalid or the type is not defined.
     *                               The promise handles asynchronous sprite loading.
     * @async
     */
    async createTile(typeName, gridX, gridY) {
        if (!this.gridManager.isValidGridPosition(gridX, gridY)) {
            console.warn(`TileManager.createTile: Attempted to create tile at invalid grid position (${gridX}, ${gridY}).`);
            return null;
        }

        const typeDef = this.tileTypes.get(typeName);
        if (!typeDef) {
            this.engine.errorHandler.handle(new Error(`Tile type '${typeName}' not defined.`), {
                context: "TileManager.createTile",
                gridX, gridY, critical: false // Non-critical as it might be an expected condition in level design
            });
            return null;
        }

        const worldPos = this.gridManager.gridToWorld(gridX, gridY); // Top-left world position
        let tileSprite = null;

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
                        x: 0, y: 0, // Sprite's position is set by Tile.render relative to Tile's worldX/Y
                        width: this.gridManager.tileWidth,
                        height: this.gridManager.tileHeight,
                        anchorX: 0, // Tiles are drawn from their top-left corner
                        anchorY: 0
                    });
                } else {
                    // This case might occur if loadAsset resolves with null for some reason (e.g. unsupported type, though 'image' is supported)
                    console.warn(`TileManager.createTile: AssetManager returned no image for '${typeName}' from ${typeDef.spritePath}, using fallback color.`);
                }
            } catch (error) {
                // Error already handled by AssetManager's errorHandler call.
                // Log here indicates fallback to color due to loading failure.
                console.warn(`TileManager.createTile: Failed to load sprite for tile type '${typeName}' from ${typeDef.spritePath}. Fallback to color. Error: ${error.message}`);
            }
        }

        const newTile = new Tile({
            type: typeName,
            gridX, gridY,
            worldX: worldPos.x, worldY: worldPos.y,
            width: this.gridManager.tileWidth, height: this.gridManager.tileHeight,
            data: { ...typeDef.properties }, // Clone properties
            sprite: tileSprite,
            color: tileSprite ? null : typeDef.color, // Use fallback color if no sprite or sprite failed to load
            visible: true
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
        return this.gridManager.getTileData(gridX, gridY);
    }

    /**
     * Removes a tile from the specified grid coordinates.
     * This involves clearing its data in `GridManager` and removing it from `tilesMap`.
     * @param {number} gridX - The grid x-coordinate (column).
     * @param {number} gridY - The grid y-coordinate (row).
     */
    removeTile(gridX, gridY) {
        const tileKey = `${gridX},${gridY}`;
        const tileToRemove = this.tilesMap.get(tileKey);

        if (tileToRemove) {
            // If Tile had a destroy method for cleanup (e.g., releasing sprite asset if uniquely owned), call it.
            // if (typeof tileToRemove.destroy === 'function') { tileToRemove.destroy(); }
            this.gridManager.setTileData(gridX, gridY, null);
            this.tilesMap.delete(tileKey);
        }
    }

    /**
     * Clears all tiles from the map, resetting `gridData` in `GridManager` and clearing `tilesMap`.
     */
    clearAllTiles() {
        // Iterate over map dimensions to ensure all gridData entries are cleared
        for (let r = 0; r < this.gridManager.mapHeight; r++) {
            for (let c = 0; c < this.gridManager.mapWidth; c++) {
                // We might want to call destroy on each tile if they hold significant resources
                // const tile = this.getTileAt(c,r); if(tile && tile.destroy) tile.destroy();
                this.gridManager.setTileData(c, r, null);
            }
        }
        this.tilesMap.clear();
        console.log("TileManager: All tiles cleared from GridManager and internal map.");
    }


    /**
     * Adds all currently managed visible tiles to the `RenderingEngine`'s drawable list for rendering.
     * This method should be called by the active scene's `render` method each frame.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     * @throws {Error} If `renderingEngine` is not provided.
     */
    renderTiles(renderingEngine) {
        if (!renderingEngine) {
            // This should ideally not happen if called from a scene correctly.
            console.error("TileManager.renderTiles: RenderingEngine instance is required.");
            // this.engine.errorHandler.handle(new Error("TileManager.renderTiles: RenderingEngine is required."), { context: "TileManager.renderTiles", critical: true});
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
