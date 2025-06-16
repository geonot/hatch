/**
 * @file Tile.js
 * @description Defines the Tile class, representing a single tile in a grid-based game world.
 * A tile can have a type, position, dimensions, associated data, an optional sprite for rendering,
 * or a fallback color.
 */

/**
 * @class Tile
 * @classdesc Represents an individual tile within a grid. It holds information about its
 * type, position (grid and world coordinates), dimensions, and visual representation
 * (which can be a Sprite instance or a fallback color).
 * Tiles are typically created and managed by a `TileManager` or similar system.
 *
 * @property {string} type - The type identifier for the tile (e.g., 'grass', 'wall', 'water').
 *                           This is typically defined by the game logic or level data.
 * @property {number} gridX - The x-coordinate of the tile in grid units (column index).
 * @property {number} gridY - The y-coordinate of the tile in grid units (row index).
 * @property {number} worldX - The x-coordinate of the tile's top-left corner in world space (pixels).
 * @property {number} worldY - The y-coordinate of the tile's top-left corner in world space (pixels).
 * @property {number} width - The width of the tile in world units (pixels).
 * @property {number} height - The height of the tile in world units (pixels).
 * @property {object} data - Custom data associated with the tile (e.g., `{ solid: true, traversable: false, lightSource: true }`).
 *                           Defaults to an empty object.
 * @property {import('../rendering/Sprite.js').Sprite | null} sprite - The `Sprite` instance used to render this tile.
 *           If `null`, the tile may be rendered with a fallback `color`.
 *           The sprite's anchor point should typically be (0,0) for standard tile rendering.
 * @property {string | null} color - A fallback CSS color string used to render the tile if no sprite is available
 *                                or if the sprite is not visible. Set to `null` if a sprite is provided.
 * @property {boolean} visible - Whether the tile (and its sprite, if any) should be rendered. Defaults to `true`.
 */
class Tile {
    /**
     * Creates an instance of Tile.
     * @param {object} options - Configuration options for the tile.
     * @param {string} options.type - The type identifier for the tile (e.g., 'grass', 'wall').
     * @param {number} options.gridX - The x-coordinate of the tile in the grid (column index).
     * @param {number} options.gridY - The y-coordinate of the tile in the grid (row index).
     * @param {number} options.worldX - The x-coordinate of the tile's top-left corner in world space (pixels).
     * @param {number} options.worldY - The y-coordinate of the tile's top-left corner in world space (pixels).
     * @param {number} options.width - The width of the tile in world units (pixels).
     * @param {number} options.height - The height of the tile in world units (pixels).
     * @param {object} [options.data={}] - Custom data associated with this tile (e.g., gameplay properties like `solid`, `cost`).
     * @param {import('../rendering/Sprite.js').Sprite | null} [options.sprite=null] - The `Sprite` instance for rendering this tile.
     *        If provided, its anchor should ideally be (0,0) for standard tile rendering.
     * @param {string} [options.color='magenta'] - Fallback CSS color string if no sprite is used or if the sprite is not visible.
     *        'magenta' is often used as a placeholder to indicate a missing or failed texture/sprite.
     * @param {boolean} [options.visible=true] - Whether the tile is initially visible.
     */
    constructor({
        type,
        gridX, gridY,
        worldX, worldY,
        width, height,
        data = {},
        sprite = null,
        color = 'magenta',
        visible = true
    }) {
        /** @type {string} The type identifier for the tile. */
        this.type = type;
        /** @type {number} The x-coordinate of the tile in grid units (column). */
        this.gridX = gridX;
        /** @type {number} The y-coordinate of the tile in grid units (row). */
        this.gridY = gridY;
        /** @type {number} The x-coordinate of the tile's top-left corner in world space. */
        this.worldX = worldX;
        /** @type {number} The y-coordinate of the tile's top-left corner in world space. */
        this.worldY = worldY;
        /** @type {number} The width of the tile in world units. */
        this.width = width;
        /** @type {number} The height of the tile in world units. */
        this.height = height;
        /** @type {object} Custom data associated with this tile. */
        this.data = data;
        /** @type {import('../rendering/Sprite.js').Sprite | null} The Sprite instance for this tile, if any. */
        this.sprite = sprite;
        /** @type {string | null} Fallback color; null if a sprite is actively used. */
        this.color = sprite ? null : color;
        /** @type {boolean} Whether this tile should be rendered. */
        this.visible = visible;

        // It's crucial that tile sprites have their anchor at (0,0) if their
        // position is set to the tile's top-left world coordinates.
        // TileManager ensures this when creating sprites for tiles.
        // if (this.sprite && (this.sprite.anchorX !== 0 || this.sprite.anchorY !== 0)) {
        //     console.warn(`Tile (${type} at ${gridX},${gridY}): Sprite anchor is not (0,0). This might lead to incorrect rendering if position is set to tile's top-left. Consider setting sprite anchor to (0,0) for tiles.`);
        // }
    }

    /**
     * Renders the tile using its sprite or fallback color.
     * This method is typically called by the `RenderingEngine` if the `Tile` instance itself
     * is added as a drawable object. It ensures the sprite (if any) is positioned correctly
     * at the tile's world coordinates before rendering.
     *
     * Note: It's often more performant for a `TileManager` to directly iterate through tiles
     * and call `renderingEngine.drawImage()` or `renderingEngine.drawRect()` instead of
     * adding each `Tile` instance as a separate drawable to the `RenderingEngine`. This method
     * is provided for cases where individual `Tile` objects need to manage their own rendering call.
     *
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
     *        It's assumed that world transformations (camera view) have already been applied to this context.
     */
    render(ctx) {
        if (!this.visible) {
            return;
        }

        if (this.sprite && this.sprite.visible) {
            // Ensure the sprite is positioned at the tile's world coordinates for this render call.
            // This is important if the tile or sprite can move independently or if the sprite
            // instance is shared and re-positioned.
            this.sprite.setPosition(this.worldX, this.worldY);
            this.sprite.render(ctx);
        } else if (this.color) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
            // Note: If using this direct render method, RenderingEngine draw call stats are not automatically updated
            // by this fillRect call itself. If stat tracking is important, use renderingEngine.drawRect().
        }
    }

    /**
     * Sets the visibility of the tile. If the tile has an associated sprite,
     * its visibility is also updated.
     * @param {boolean} visible - True if the tile should be visible, false otherwise.
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.sprite) {
            this.sprite.setVisible(visible);
        }
    }

    // Future methods might include:
    // - `onPointerEnter()`, `onPointerExit()`, `onClick()` for interactions.
    // - `update(deltaTime)` if tiles have active behaviors.
    // - `toJSON()`, `fromJSON()` for serialization.

    /**
     * Cleans up the tile, primarily by nullifying references.
     * If the tile's sprite had its own destroy method, it could be called here.
     */
    destroy() {
        // console.log(`Tile (${this.type} at ${this.gridX},${this.gridY}) destroyed.`); // Example logging
        // No direct access to engine.errorHandler here by default, logging would be up to the manager.
        if (this.sprite && typeof this.sprite.destroy === 'function') {
            // If sprites have their own destroy method for cleanup (e.g., releasing texture references from a cache)
            // this.sprite.destroy();
        }
        this.sprite = null;
        this.data = null;
    }
}

export default Tile;
