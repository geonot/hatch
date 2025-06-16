/**
 * @file Sprite.js
 * @description Defines a Sprite class for rendering images or parts of images (sprite sheets)
 * with transformations like position, rotation, scale (via width/height), and alpha.
 */

/**
 * @class Sprite
 * @classdesc Represents a renderable 2D sprite. It encapsulates an image (or a portion of it,
 * for sprite sheets) and its transformations like position, rendered size, rotation,
 * opacity, and visibility. The sprite's position (`x`, `y`) is relative to its anchor point.
 *
 * @property {HTMLImageElement} image - The source image element (e.g., loaded via AssetManager).
 * @property {number} x - The x-coordinate of the sprite's anchor point in world space. Default is 0.
 * @property {number} y - The y-coordinate of the sprite's anchor point in world space. Default is 0.
 * @property {number} width - The width the sprite will be drawn at, in world units (pixels).
 *                           Defaults to `sourceWidth` if not provided, or `image.naturalWidth`.
 * @property {number} height - The height the sprite will be drawn at, in world units (pixels).
 *                            Defaults to `sourceHeight` if not provided, or `image.naturalHeight`.
 * @property {number} sourceX - The x-coordinate of the top-left corner of the sub-rectangle
 *                              of the source image to draw (for sprite sheets). Default is 0.
 * @property {number} sourceY - The y-coordinate of the top-left corner of the sub-rectangle
 *                              of the source image to draw (for sprite sheets). Default is 0.
 * @property {number} sourceWidth - The width of the sub-rectangle of the source image to draw.
 *                                  Defaults to `image.naturalWidth`.
 * @property {number} sourceHeight - The height of the sub-rectangle of the source image to draw.
 *                                   Defaults to `image.naturalHeight`.
 * @property {number} rotation - The rotation of the sprite in radians, applied around its anchor point. Default is 0.
 * @property {number} alpha - The opacity of the sprite, ranging from 0 (fully transparent) to 1 (fully opaque).
 *                           Clamped to this range. Default is 1.
 * @property {boolean} visible - Whether the sprite should be rendered. Default is true.
 * @property {number} anchorX - The normalized horizontal anchor point (0-1). 0 is left, 0.5 is center, 1 is right.
 *                              Default is 0.5.
 * @property {number} anchorY - The normalized vertical anchor point (0-1). 0 is top, 0.5 is center, 1 is bottom.
 *                              Default is 0.5.
 */
class Sprite {
    /**
     * Creates an instance of Sprite.
     * @param {object} options - Configuration options for the sprite.
     * @param {HTMLImageElement} options.image - The HTMLImageElement to use for the sprite. This is mandatory.
     * @param {number} [options.x=0] - The initial x-coordinate of the sprite's anchor in world space.
     * @param {number} [options.y=0] - The initial y-coordinate of the sprite's anchor in world space.
     * @param {number} [options.width] - The width to draw the sprite. If not provided, it defaults to `options.sourceWidth`
     *                                   (if specified) or `image.naturalWidth`.
     * @param {number} [options.height] - The height to draw the sprite. If not provided, it defaults to `options.sourceHeight`
     *                                    (if specified) or `image.naturalHeight`.
     * @param {number} [options.sourceX=0] - The x-offset of the sub-rectangle in the source image (for sprite sheets).
     * @param {number} [options.sourceY=0] - The y-offset of the sub-rectangle in the source image.
     * @param {number} [options.sourceWidth] - The width of the sub-rectangle in the source image. Defaults to `image.naturalWidth`.
     * @param {number} [options.sourceHeight] - The height of the sub-rectangle in the source image. Defaults to `image.naturalHeight`.
     * @param {number} [options.rotation=0] - The initial rotation of the sprite in radians, around its anchor point.
     * @param {number} [options.alpha=1] - The initial opacity of the sprite (0.0 to 1.0). Values are clamped.
     * @param {boolean} [options.visible=true] - Whether the sprite is initially visible and should be rendered.
     * @param {number} [options.anchorX=0.5] - The normalized horizontal anchor point (0-1, where 0 is left, 0.5 is center).
     * @param {number} [options.anchorY=0.5] - The normalized vertical anchor point (0-1, where 0 is top, 0.5 is center).
     * @throws {Error} If `options.image` is not a valid HTMLImageElement.
     */
    constructor({
        image,
        x = 0, y = 0,
        width, height,
        sourceX = 0, sourceY = 0,
        sourceWidth, sourceHeight,
        rotation = 0, // Radians
        alpha = 1,
        visible = true,
        anchorX = 0.5, anchorY = 0.5
    }) {
        if (!image || !(image instanceof HTMLImageElement)) {
            // This error is critical for the sprite's functionality.
            throw new Error("Sprite constructor: 'image' parameter must be an HTMLImageElement.");
        }
        this.image = image;

        this.x = (typeof x === 'number') ? x : 0;
        this.y = (typeof y === 'number') ? y : 0;

        this.sourceX = (typeof sourceX === 'number') ? sourceX : 0;
        this.sourceY = (typeof sourceY === 'number') ? sourceY : 0;

        const natWidth = image.naturalWidth || 0; // Default to 0 if not loaded
        const natHeight = image.naturalHeight || 0;

        this.sourceWidth = (typeof sourceWidth === 'number') ? sourceWidth : natWidth;
        this.sourceHeight = (typeof sourceHeight === 'number') ? sourceHeight : natHeight;

        this.width = (typeof width === 'number') ? width : this.sourceWidth;
        this.height = (typeof height === 'number') ? height : this.sourceHeight;

        if (this.width < 0) { console.warn(`Sprite constructor: 'width' is negative (${this.width}). Using 0.`); this.width = 0; }
        if (this.height < 0) { console.warn(`Sprite constructor: 'height' is negative (${this.height}). Using 0.`); this.height = 0; }
        if (this.sourceWidth < 0) { console.warn(`Sprite constructor: 'sourceWidth' is negative (${this.sourceWidth}). Using 0.`); this.sourceWidth = 0; }
        if (this.sourceHeight < 0) { console.warn(`Sprite constructor: 'sourceHeight' is negative (${this.sourceHeight}). Using 0.`); this.sourceHeight = 0; }


        this.rotation = (typeof rotation === 'number') ? rotation : 0;

        this.alpha = (typeof alpha === 'number') ? Math.max(0, Math.min(1, alpha)) : 1;

        this.visible = (typeof visible === 'boolean') ? visible : true;

        this.anchorX = (typeof anchorX === 'number') ? Math.max(0, Math.min(1, anchorX)) : 0.5;
        this.anchorY = (typeof anchorY === 'number') ? Math.max(0, Math.min(1, anchorY)) : 0.5;

        if (typeof x !== 'number' || typeof y !== 'number' ||
            (width !== undefined && typeof width !== 'number') || (height !== undefined && typeof height !== 'number') ||
            typeof sourceX !== 'number' || typeof sourceY !== 'number' ||
            (sourceWidth !== undefined && typeof sourceWidth !== 'number') || (sourceHeight !== undefined && typeof sourceHeight !== 'number') ||
            typeof rotation !== 'number' || typeof alpha !== 'number' || typeof visible !== 'boolean' ||
            typeof anchorX !== 'number' || typeof anchorY !== 'number') {
            console.warn("Sprite constructor: One or more optional parameters had an invalid type and were set to defaults. Check inputs.", { imageSrc: image.src, x, y, width, height, sourceX, sourceY, sourceWidth, sourceHeight, rotation, alpha, visible, anchorX, anchorY });
        }
    }

    /**
     * Renders the sprite to the given 2D rendering context.
     * This method applies the sprite's transformations (position, rotation, alpha)
     * and draws its image (or sub-rectangle of it).
     * It assumes that global transformations (like camera view) have already been applied to the context.
     *
     * @param {CanvasRenderingContext2D} ctx - The rendering context to draw on.
     */
    render(ctx) {
        if (!(ctx instanceof CanvasRenderingContext2D)) {
            console.error("Sprite.render: ctx must be an instance of CanvasRenderingContext2D.");
            return;
        }

        if (!this.visible || this.alpha <= 0 || !this.image || this.width === 0 || this.height === 0) {
            return;
        }

        ctx.save();

        if (typeof this.alpha === 'number') { // Ensure alpha is still valid before use
            ctx.globalAlpha = this.alpha;
        } else {
            ctx.globalAlpha = 1; // Default if somehow alpha became invalid
        }

        // Translate to the sprite's world position (which is its anchor point)
        ctx.translate(this.x, this.y);

        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }

        // Calculate the drawing offset based on the anchor point.
        // E.g., if anchor is (0.5, 0.5), the image is drawn offset by (-width/2, -height/2)
        // relative to the translated and rotated context origin.
        const drawX = -this.width * this.anchorX;
        const drawY = -this.height * this.anchorY;

        try {
            // Ensure the image is complete (loaded) before attempting to draw.
            // While AssetManager should provide loaded images, this is a safeguard.
            if (this.image.complete && this.sourceWidth > 0 && this.sourceHeight > 0) {
                ctx.drawImage(
                    this.image,
                    this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight, // Source rectangle
                    drawX, drawY, this.width, this.height // Destination rectangle (relative to anchor)
                );
            } else if (!this.image.complete) {
                console.warn(`Sprite.render: Image not yet complete. Src: ${this.image.src}`);
            } else if (this.sourceWidth === 0 || this.sourceHeight === 0) {
                console.warn(`Sprite.render: Source width or height is zero. Src: ${this.image.src}`);
            }
        } catch (e) {
            // This console.error is a fallback.
            // A more integrated solution might involve an ErrorHandler if sprites are engine-aware.
            console.error("Sprite.render: Error drawing image.", {
                error: e,
                spriteInfo: {
                    x: this.x, y: this.y,
                    width: this.width, height: this.height,
                    alpha: this.alpha, rotation: this.rotation,
                    visible: this.visible,
                    anchorX: this.anchorX, anchorY: this.anchorY,
                    imageSrc: this.image.src,
                    imageComplete: this.image.complete,
                    sourceX: this.sourceX, sourceY: this.sourceY,
                    sourceWidth: this.sourceWidth, sourceHeight: this.sourceHeight
                }
            });
        }

        ctx.restore();
    }

    /**
     * Sets the world position of the sprite's anchor point.
     * @param {number} x - The new x-coordinate in world space.
     * @param {number} y - The new y-coordinate in world space.
     */
    setPosition(x, y) {
        if (typeof x !== 'number' || typeof y !== 'number') {
            console.warn("Sprite.setPosition: x and y must be numbers.", { x, y });
            return;
        }
        this.x = x;
        this.y = y;
    }

    /**
     * Sets the rendered size of the sprite.
     * @param {number} width - The new width in world units.
     * @param {number} height - The new height in world units.
     */
    setSize(width, height) {
        if (typeof width !== 'number' || typeof height !== 'number') {
            console.warn("Sprite.setSize: width and height must be numbers.", { width, height });
            return;
        }
        this.width = width >= 0 ? width : 0; // Prevent negative size
        this.height = height >= 0 ? height : 0;
    }

    /**
     * Sets the rotation of the sprite.
     * @param {number} radians - The new rotation in radians.
     */
    setRotation(radians) {
        if (typeof radians !== 'number') {
            console.warn("Sprite.setRotation: radians must be a number.", { radians });
            return;
        }
        this.rotation = radians;
    }

    /**
     * Sets the alpha (opacity) of the sprite.
     * The value is clamped between 0 (transparent) and 1 (opaque).
     * @param {number} alpha - The new alpha value.
     */
    setAlpha(alpha) {
        if (typeof alpha !== 'number') {
            console.warn("Sprite.setAlpha: alpha must be a number.", { alpha });
            return;
        }
        this.alpha = Math.max(0, Math.min(1, alpha));
    }

    /**
     * Sets the visibility of the sprite.
     * If false, the sprite will not be rendered.
     * @param {boolean} visible - True if the sprite should be visible, false otherwise.
     */
    setVisible(visible) {
        if (typeof visible !== 'boolean') {
            console.warn("Sprite.setVisible: visible must be a boolean.", { visible });
            return;
        }
        this.visible = visible;
    }

    /**
     * Sets the anchor point of the sprite. The anchor determines the point around which
     * transformations (like rotation and positioning) occur.
     * (0,0) is top-left, (0.5,0.5) is center, (1,1) is bottom-right.
     * @param {number} anchorX - The normalized horizontal anchor point (0-1).
     * @param {number} anchorY - The normalized vertical anchor point (0-1).
     */
    setAnchor(anchorX, anchorY) {
        if (typeof anchorX !== 'number' || typeof anchorY !== 'number') {
            console.warn("Sprite.setAnchor: anchorX and anchorY must be numbers.", { anchorX, anchorY });
            return;
        }
        this.anchorX = Math.max(0, Math.min(1, anchorX));
        this.anchorY = Math.max(0, Math.min(1, anchorY));
    }

    /**
     * Updates the source rectangle (e.g., for sprite sheet animations).
     * This defines which part of the `this.image` is drawn.
     * @param {number} sx - The x-coordinate of the top-left corner of the source sub-rectangle.
     * @param {number} sy - The y-coordinate of the top-left corner of the source sub-rectangle.
     * @param {number} sWidth - The width of the source sub-rectangle.
     * @param {number} sHeight - The height of the source sub-rectangle.
     */
    setSourceRect(sx, sy, sWidth, sHeight) {
        if (typeof sx !== 'number' || typeof sy !== 'number' || typeof sWidth !== 'number' || typeof sHeight !== 'number') {
            console.warn("Sprite.setSourceRect: sx, sy, sWidth, and sHeight must be numbers.", { sx, sy, sWidth, sHeight });
            return;
        }
        this.sourceX = sx >= 0 ? sx : 0;
        this.sourceY = sy >= 0 ? sy : 0;
        this.sourceWidth = sWidth >= 0 ? sWidth : 0;
        this.sourceHeight = sHeight >= 0 ? sHeight : 0;
    }
}

export default Sprite;
