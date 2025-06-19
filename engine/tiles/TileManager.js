/**
 * @file TileManager.js
 * @description Manages tile types, tile instances on a grid, and their rendering.
 */

import { Tile } from './Tile.js';
import { Sprite } from '../rendering/Sprite.js';

/**
 * @class TileManager
 * @classdesc Handles the definition of tile types, creation and management of tile instances
 * on a grid, and orchestrates their rendering.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine.
 * @property {import('../grid/GridManager.js').GridManager} gridManager - Reference to the GridManager.
 * @property {Map<string, object>} tileTypes - Stores definitions for different tile types, keyed by name.
 *                                             Each definition can include properties like color, solid status, sprite info, etc.
 * @property {Map<string, Tile>} tiles - Stores tile instances, keyed by "x_y" grid coordinates.
 */
export class TileManager {
    /**
     * Creates an instance of TileManager.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     * @param {import('../grid/GridManager.js').GridManager} gridManager - The GridManager instance for this tile manager.
     */
    constructor(engine, gridManager) {
        if (!engine || !engine.errorHandler) {
            throw new Error("TileManager constructor: Valid 'engine' instance with 'errorHandler' is required.");
        }
        if (!gridManager || !(gridManager instanceof Object) || !gridManager.engine) { // Basic check for GridManager-like object
            throw new Error("TileManager constructor: Valid 'gridManager' instance is required.");
        }
        this.engine = engine;
        this.gridManager = gridManager;

        this.tileTypes = new Map();
        this.tiles = new Map(); // Using a Map to store tiles, keyed by "x_y"

        this.engine.errorHandler.info('TileManager initialized.', { component: 'TileManager' });
    }

    /**
     * Defines a new type of tile.
     * @param {string} name - The unique name for this tile type (e.g., 'grass', 'wall').
     * @param {object} properties - An object containing properties for this tile type.
     *                              Example: `{ color: 'green', isSolid: false, atlasName: 'myAtlas', frameName: 'grass_01.png', zIndex: 0 }`
     *                              `atlasName` and `frameName` are used for sprite-based tiles.
     *                              `color` is used as a fallback or for non-sprite tiles.
     *                              `zIndex` determines rendering order if sprites are used.
     *                              Other custom properties (e.g., `isSolid`, `isInteractive`) can also be included.
     */
    defineTileType(name, properties) {
        if (typeof name !== 'string' || name.trim() === '') {
            this.engine.errorHandler.error("TileManager.defineTileType: 'name' must be a non-empty string.", { component: 'TileManager', method: 'defineTileType' });
            return;
        }
        if (typeof properties !== 'object' || properties === null) {
            this.engine.errorHandler.error(`TileManager.defineTileType: 'properties' for type '${name}' must be an object.`, { component: 'TileManager', method: 'defineTileType' });
            return;
        }
        // Properties can now include: color, isSolid, atlasName, frameName, zIndex
        if (!properties.color && (!properties.atlasName || !properties.frameName)) {
             this.engine.errorHandler.warn(`Tile type '${name}' defined without a color or atlasName/frameName. It might not be renderable.`, { component: 'TileManager', method: 'defineTileType', params: {name, properties} });
        }
        this.tileTypes.set(name, properties);
        this.engine.errorHandler.info(`Tile type '${name}' defined.`, { component: 'TileManager', method: 'defineTileType', params: { name, properties } });
    }

    /**
     * Creates a tile of a specific type at the given grid coordinates.
     * If a tile already exists at these coordinates, it will be overwritten.
     * If the tile type properties include `atlasName` and `frameName`, a `Sprite` instance
     * will be created and stored in `tile.data.spriteInstance`.
     * @param {string} typeName - The name of the tile type to create (must be predefined using `defineTileType`).
     * @param {number} gridX - The x-coordinate in the grid where the tile will be placed.
     * @param {number} gridY - The y-coordinate in the grid where the tile will be placed.
     * @param {object} [initialData={}] - Optional custom data to associate with this specific tile instance.
     *                                    This data is merged into the `Tile`'s `data` property.
     *                                    Can also include `zIndex` to override type's default zIndex for sprites.
     * @returns {Tile | null} The created `Tile` instance, or `null` if the tile type is not defined
     *                        or the coordinates are out of bounds. The `Tile` object may have
     *                        `tile.data.spriteInstance` populated if applicable.
     */
    createTile(typeName, gridX, gridY, initialData = {}) {
        if (!this.tileTypes.has(typeName)) {
            this.engine.errorHandler.error(`Tile type '${typeName}' not defined. Cannot create tile.`, { component: 'TileManager', method: 'createTile' });
            return null;
        }
        if (!this.gridManager.isInBounds(gridX, gridY)) {
            this.engine.errorHandler.warn(`Cannot create tile at (${gridX},${gridY}): Coordinates out of bounds.`, { component: 'TileManager', method: 'createTile' });
            return null;
        }

        const tile = new Tile(typeName, gridX, gridY, initialData);
        const key = `${gridX}_${gridY}`;

        const typeProps = this.getTileTypeProperties(typeName); // Already checked that typeProps exists
        if (typeProps && typeProps.atlasName && typeProps.frameName) {
            const atlas = this.engine.assetManager.get(typeProps.atlasName);
            if (atlas && atlas.constructor.name === 'SpriteAtlas') {
                const worldPos = this.gridManager.gridToWorld(gridX, gridY);
                const zIndex = (typeProps.zIndex !== undefined) ? typeProps.zIndex : (initialData.zIndex !== undefined ? initialData.zIndex : 0);

                tile.data.spriteInstance = new Sprite(this.engine, atlas, {
                    frameName: typeProps.frameName,
                    x: worldPos.worldX,
                    y: worldPos.worldY,
                    width: this.gridManager.tileWidth,
                    height: this.gridManager.tileHeight,
                    zIndex: zIndex
                });
            } else {
                this.engine.errorHandler.warn(`SpriteAtlas '${typeProps.atlasName}' not found or invalid for tile type '${typeName}' at (${gridX},${gridY}). Tile will attempt color fallback.`, {component: 'TileManager'});
            }
        }
        this.tiles.set(key, tile);
        return tile;
    }

    /**
     * Retrieves the tile instance at the given grid coordinates.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @returns {Tile | undefined} The Tile instance, or undefined if no tile exists at these coordinates.
     */
    getTile(gridX, gridY) {
        const key = `${gridX}_${gridY}`;
        return this.tiles.get(key);
    }

    /**
     * Removes the tile at the given grid coordinates.
     * @param {number} gridX - The x-coordinate in the grid.
     * @param {number} gridY - The y-coordinate in the grid.
     * @returns {boolean} True if a tile was removed, false otherwise.
     */
    removeTile(gridX, gridY) {
        const key = `${gridX}_${gridY}`;
        return this.tiles.delete(key);
    }

    /**
     * Gets the properties defined for a specific tile type.
     * @param {string} typeName - The name of the tile type.
     * @returns {object | undefined} The properties object for the tile type, or undefined if not found.
     */
    getTileTypeProperties(typeName) {
        return this.tileTypes.get(typeName);
    }

    /**
     * Renders all managed tiles.
     * If a tile has a `spriteInstance` in its `data` property, that sprite is added to the `RenderingEngine`.
     * Otherwise, if the tile type has a `color` property, a colored rectangle is drawn directly by the `RenderingEngine`.
     * A placeholder may be drawn if a sprite was intended but failed to load.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The rendering engine instance to add drawables to or draw with.
     */
    renderTiles(renderingEngine) {
        if (!renderingEngine) {
            this.engine.errorHandler.error("TileManager.renderTiles: RenderingEngine is required.", { component: 'TileManager', method: 'renderTiles' });
            return;
        }

        for (const tile of this.tiles.values()) {
            if (!tile.visible) continue;

            const typeProps = this.getTileTypeProperties(tile.type);
            if (!tile.visible) continue;

            if (tile.data.spriteInstance instanceof Sprite) {
                renderingEngine.add(tile.data.spriteInstance);
            } else {
                const typeProps = this.getTileTypeProperties(tile.type);
                if (typeProps && typeProps.color) {
                    const worldPos = this.gridManager.gridToWorld(tile.gridX, tile.gridY);
                    renderingEngine.drawRect(
                        worldPos.worldX,
                        worldPos.worldY,
                        this.gridManager.tileWidth,
                        this.gridManager.tileHeight,
                        typeProps.color,
                        true
                    );
                } else if (typeProps && (typeProps.atlasName || typeProps.frameName) && !tile.data.spriteInstance) {
                    // Only draw placeholder if sprite was intended but failed to load/create
                    const worldPos = this.gridManager.gridToWorld(tile.gridX, tile.gridY);
                    renderingEngine.drawRect( worldPos.worldX, worldPos.worldY, this.gridManager.tileWidth, this.gridManager.tileHeight, '#FF00FF', true);
                    this.engine.errorHandler.debug(`Drawing placeholder for tile type '${tile.type}' at (${tile.gridX},${tile.gridY}) as sprite instance was not created.`, {component: 'TileManager'});
                }
            }
        }
    }

    /**
     * Clears all tile instances and defined tile types.
     * Useful for resetting or changing levels.
     */
    clearAll() {
        this.tiles.clear();
        this.tileTypes.clear();
        this.engine.errorHandler.info('TileManager: All tiles and tile types cleared.', { component: 'TileManager', method: 'clearAll' });
    }
}
