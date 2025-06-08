/**
 * @file Tile.js
 * @description Defines the Tile class, representing a single tile in a grid-based game world.
 * A tile can have a type, position, dimensions, associated data, an optional sprite for rendering,
 * or a fallback color.
 */

/**
 * @class Tile
 * @classdesc Represents an individual tile within a grid. It holds information about its
 * type, position (grid and world), dimensions, and visual representation (sprite or color).
 * Tile instances are typically managed by a `TileManager`.
 *
 * @property {string} type - The type of the tile (e.g., 'grass', 'wall'), defined by the `TileManager`.
 * @property {number} gridX - The x-coordinate of the tile in grid units (column).
 * @property {number} gridY - The y-coordinate of the tile in grid units (row).
 * @property {number} worldX - The x-coordinate of the tile's top-left corner in world space.
 * @property {number} worldY - The y-coordinate of the tile's top-left corner in world space.
 * @property {number} width - The width of the tile in world units (pixels).
 * @property {number} height - The height of the tile in world units (pixels).
 * @property {Object} data - Custom data associated with the tile (e.g., `{ solid: true, traversable: false }`).
 * @property {?import('../rendering/Sprite.js').default} sprite - The `Sprite` instance used to render this tile, if any.
 *           The sprite's anchor point should typically be (0,0) for tile rendering.
 * @property {?string} color - A fallback CSS color string used to render the tile if no sprite is available or if the sprite is not visible.
 * @property {boolean} visible - Whether the tile (and its sprite, if any) should be rendered.
 */
class Tile {
    /**
     * Creates an instance of Tile.
     * @param {Object} options - Configuration options for the tile.
     * @param {string} options.type - The type identifier for the tile (e.g., 'grass', 'wall').
     * @param {number} options.gridX - The x-coordinate of the tile in the grid (column index).
     * @param {number} options.gridY - The y-coordinate of the tile in the grid (row index).
     * @param {number} options.worldX - The x-coordinate of the tile's top-left corner in world space.
     * @param {number} options.worldY - The y-coordinate of the tile's top-left corner in world space.
     * @param {number} options.width - The width of the tile in world units.
     * @param {number} options.height - The height of the tile in world units.
     * @param {Object} [options.data={}] - Custom data associated with this tile (e.g., gameplay properties like `solid`, `cost`).
     * @param {?import('../rendering/Sprite.js').default} [options.sprite=null] - The `Sprite` instance for rendering this tile.
     *        If provided, its anchor should ideally be (0,0) for standard tile rendering.
     * @param {?string} [options.color='magenta'] - Fallback CSS color string if no sprite is used or visible.
     *        'magenta' is often used to indicate a missing or failed texture/sprite.
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
        /** @type {string} */
        this.type = type;
        /** @type {number} */
        this.gridX = gridX;
        /** @type {number} */
        this.gridY = gridY;
        /** @type {number} */
        this.worldX = worldX;
        /** @type {number} */
        this.worldY = worldY;
        /** @type {number} */
        this.width = width;
        /** @type {number} */
        this.height = height;
        /** @type {Object} */
        this.data = data;
        /** @type {?import('../rendering/Sprite.js').default} */
        this.sprite = sprite;
        /** @type {?string} */
        this.color = sprite ? null : color; // Only store color if no sprite, or if sprite is secondary
        /** @type {boolean} */
        this.visible = visible;

        // It's crucial that tile sprites have their anchor at (0,0) if their
        // position is set to the tile's top-left world coordinates.
        // TileManager ensures this when creating sprites for tiles.
        // if (this.sprite && (this.sprite.anchorX !== 0 || this.sprite.anchorY !== 0)) {
        //     console.warn(`Tile (${type} at ${gridX},${gridY}): Sprite anchor is not (0,0). This might lead to incorrect rendering if position is set to tile's top-left. Consider setting sprite anchor to (0,0) for tiles.`);
        // }
    }

    /**
     * Renders the tile. This method is called by the `RenderingEngine` when this `Tile`
     * instance is added to the list of drawables. It will either render the tile's sprite
     * or draw a colored rectangle as a fallback.
     * Assumes that world transformations (e.g., camera view) have already been applied to the context.
     *
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
     */
    render(ctx) {
        if (!this.visible) {
            return;
        }

        if (this.sprite && this.sprite.visible) {
            // The sprite's own (x,y) should be its world position.
            // For tiles, this.sprite.x and this.sprite.y are set to this.worldX and this.worldY
            // by the TileManager or by ensuring the sprite's position is updated if the tile moves.
            // The sprite's anchor should be (0,0) for this to work as expected for typical tile rendering.
            this.sprite.setPosition(this.worldX, this.worldY); // Ensure sprite is at tile's world origin for rendering this frame
            this.sprite.render(ctx);
        } else if (this.color) {
            // Fallback rendering: draw a colored rectangle.
            ctx.fillStyle = this.color;
            ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
            // Note: Direct rendering like this won't automatically increment RenderingEngine's drawCall stats
            // unless this Tile class has a reference to RenderingEngine and calls its drawRect method.
            // For simplicity, TileManager adds Tile instances to RenderingEngine, and RE increments stats there.
            // If this render method is called, it's assumed the RE stats are handled or this is a direct draw.
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
}

export default Tile;
