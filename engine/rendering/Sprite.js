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
        /** @type {HTMLImageElement} The source image element. */
        this.image = image;

        /** @type {number} X-coordinate of the sprite's anchor in world space. */
        this.x = x;
        /** @type {number} Y-coordinate of the sprite's anchor in world space. */
        this.y = y;

        /** @type {number} X-offset in the source image for sprite sheet functionality. */
        this.sourceX = sourceX;
        /** @type {number} Y-offset in the source image for sprite sheet functionality. */
        this.sourceY = sourceY;
        /** @type {number} Width of the sub-rectangle in the source image. */
        this.sourceWidth = sourceWidth === undefined ? image.naturalWidth : sourceWidth;
        /** @type {number} Height of the sub-rectangle in the source image. */
        this.sourceHeight = sourceHeight === undefined ? image.naturalHeight : sourceHeight;

        /** @type {number} Rendered width of the sprite in world units. */
        this.width = width === undefined ? this.sourceWidth : width;
        /** @type {number} Rendered height of the sprite in world units. */
        this.height = height === undefined ? this.sourceHeight : height;

        /** @type {number} Rotation in radians around the anchor point. */
        this.rotation = rotation;
        /** @type {number} Opacity, clamped between 0 and 1. */
        this.alpha = Math.max(0, Math.min(1, alpha));
        /** @type {boolean} Controls rendering of the sprite. */
        this.visible = visible;

        /** @type {number} Normalized horizontal anchor point (0-1). */
        this.anchorX = anchorX;
        /** @type {number} Normalized vertical anchor point (0-1). */
        this.anchorY = anchorY;
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
        if (!this.visible || this.alpha <= 0 || !this.image || this.width === 0 || this.height === 0) {
            // Do not render if invisible, fully transparent, no image, or zero size.
            // Zero size check prevents potential drawImage errors with 0 width/height.
            return;
        }

        ctx.save();

        ctx.globalAlpha = this.alpha;

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
        this.x = x;
        this.y = y;
    }

    /**
     * Sets the rendered size of the sprite.
     * @param {number} width - The new width in world units.
     * @param {number} height - The new height in world units.
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Sets the rotation of the sprite.
     * @param {number} radians - The new rotation in radians.
     */
    setRotation(radians) {
        this.rotation = radians;
    }

    /**
     * Sets the alpha (opacity) of the sprite.
     * The value is clamped between 0 (transparent) and 1 (opaque).
     * @param {number} alpha - The new alpha value.
     */
    setAlpha(alpha) {
        this.alpha = Math.max(0, Math.min(1, alpha));
    }

    /**
     * Sets the visibility of the sprite.
     * If false, the sprite will not be rendered.
     * @param {boolean} visible - True if the sprite should be visible, false otherwise.
     */
    setVisible(visible) {
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
        this.anchorX = anchorX;
        this.anchorY = anchorY;
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
        this.sourceX = sx;
        this.sourceY = sy;
        this.sourceWidth = sWidth;
        this.sourceHeight = sHeight;
    }
}

export default Sprite;
