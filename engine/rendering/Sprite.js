/**
 * @file Sprite.js
 * @description Defines a Sprite class for rendering images or parts of images (sprite sheets)
 * with transformations like position, rotation, scale (via width/height), and alpha.
 */

/**
 * @class Sprite
 * @classdesc Represents a renderable 2D sprite. It encapsulates an image (or a portion of it)
 * and its properties like position, size, rotation, opacity, and visibility.
 * The sprite's position is determined by its `x` and `y` properties, which correspond
 * to its anchor point.
 *
 * @property {HTMLImageElement} image - The source image for the sprite.
 * @property {number} x - The x-coordinate of the sprite's anchor point in world space.
 * @property {number} y - The y-coordinate of the sprite's anchor point in world space.
 * @property {number} width - The rendered width of the sprite in world units.
 * @property {number} height - The rendered height of the sprite in world units.
 * @property {number} sourceX - The x-coordinate of the top-left corner of the sub-rectangle of the source image to draw (for sprite sheets).
 * @property {number} sourceY - The y-coordinate of the top-left corner of the sub-rectangle of the source image to draw.
 * @property {number} sourceWidth - The width of the sub-rectangle of the source image.
 * @property {number} sourceHeight - The height of the sub-rectangle of the source image.
 * @property {number} rotation - The rotation of the sprite in radians, around its anchor point.
 * @property {number} alpha - The opacity of the sprite, ranging from 0 (transparent) to 1 (opaque).
 * @property {boolean} visible - Whether the sprite should be rendered.
 * @property {number} anchorX - The horizontal anchor point, normalized (0-1). 0 is left, 0.5 is center, 1 is right.
 * @property {number} anchorY - The vertical anchor point, normalized (0-1). 0 is top, 0.5 is center, 1 is bottom.
 */
class Sprite {
    /**
     * Creates an instance of Sprite.
     * @param {Object} options - Configuration options for the sprite.
     * @param {HTMLImageElement} options.image - The image element to use for the sprite.
     * @param {number} [options.x=0] - The x-coordinate of the sprite's anchor in world space.
     * @param {number} [options.y=0] - The y-coordinate of the sprite's anchor in world space.
     * @param {number} [options.width] - The width to draw the sprite. Defaults to `sourceWidth` (which defaults to `image.naturalWidth`).
     * @param {number} [options.height] - The height to draw the sprite. Defaults to `sourceHeight` (which defaults to `image.naturalHeight`).
     * @param {number} [options.sourceX=0] - The x-coordinate of the top-left corner of the sub-rectangle of the source image.
     * @param {number} [options.sourceY=0] - The y-coordinate of the top-left corner of the sub-rectangle of the source image.
     * @param {number} [options.sourceWidth] - The width of the sub-rectangle of the source image. Defaults to `image.naturalWidth`.
     * @param {number} [options.sourceHeight] - The height of the sub-rectangle of the source image. Defaults to `image.naturalHeight`.
     * @param {number} [options.rotation=0] - The rotation of the sprite in radians, around its anchor point.
     * @param {number} [options.alpha=1] - The opacity of the sprite (0 to 1). Clamped to this range.
     * @param {boolean} [options.visible=true] - Whether the sprite is visible and should be rendered.
     * @param {number} [options.anchorX=0.5] - The horizontal anchor point (0-1). Default is 0.5 (center).
     * @param {number} [options.anchorY=0.5] - The vertical anchor point (0-1). Default is 0.5 (center).
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
            throw new Error("Sprite constructor: 'image' parameter must be an HTMLImageElement.");
        }
        /** @type {HTMLImageElement} */
        this.image = image;

        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;

        /** @type {number} */
        this.sourceX = sourceX;
        /** @type {number} */
        this.sourceY = sourceY;
        /** @type {number} */
        this.sourceWidth = sourceWidth === undefined ? image.naturalWidth : sourceWidth;
        /** @type {number} */
        this.sourceHeight = sourceHeight === undefined ? image.naturalHeight : sourceHeight;

        /** @type {number} */
        this.width = width === undefined ? this.sourceWidth : width;
        /** @type {number} */
        this.height = height === undefined ? this.sourceHeight : height;

        /** @type {number} */
        this.rotation = rotation;
        /** @type {number} */
        this.alpha = Math.max(0, Math.min(1, alpha)); // Clamped
        /** @type {boolean} */
        this.visible = visible;

        /** @type {number} */
        this.anchorX = anchorX;
        /** @type {number} */
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
            ctx.drawImage(
                this.image,
                this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight, // Source rectangle
                drawX, drawY, this.width, this.height // Destination rectangle (relative to anchor)
            );
        } catch (e) {
            // This catch block might be useful if, for example, the source image dimensions are invalid
            // or if the image element is broken after being loaded.
            console.error("Sprite.render: Error drawing image.", {
                error: e,
                spriteX: this.x, spriteY: this.y,
                imageSrc: this.image.src,
                sX: this.sourceX, sY: this.sourceY, sW: this.sourceWidth, sH: this.sourceHeight,
                drawX: drawX, drawY: drawY, dW: this.width, dH: this.height
            });
            // Depending on engine setup, this could also use this.engine.errorHandler if the sprite had a reference.
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
