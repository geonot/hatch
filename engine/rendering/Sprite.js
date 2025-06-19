/**
 * @file Sprite.js
 * @description A drawable game object that represents an image or a frame from a sprite atlas.
 */

/**
 * @class Sprite
 * @classdesc Represents a visual object that can be rendered on the canvas.
 * It can draw a whole image or a specific frame from a SpriteAtlas.
 * Sprites are typically added to the RenderingEngine's drawable list by a scene or manager.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine.
 * @property {HTMLImageElement | HTMLCanvasElement | ImageBitmap | import('../assets/SpriteAtlas.js').SpriteAtlas} source - The image source or SpriteAtlas.
 * @property {number} x - The x-coordinate of the sprite's top-left corner in world space.
 * @property {number} y - The y-coordinate of the sprite's top-left corner in world space.
 * @property {number} width - The width to draw the sprite.
 * @property {number} height - The height to draw the sprite.
 * @property {number} sourceX - The x-coordinate of the top-left corner of the sub-rectangle of the source image to draw.
 * @property {number} sourceY - The y-coordinate of the top-left corner of the sub-rectangle of the source image to draw.
 * @property {number} sourceWidth - The width of the sub-rectangle of the source image to draw.
 * @property {number} sourceHeight - The height of the sub-rectangle of the source image to draw.
 * @property {number} rotation - Rotation angle in radians. Centered around anchorX, anchorY.
 * @property {number} scaleX - Horizontal scale factor. Applied from anchorX, anchorY.
 * @property {number} scaleY - Vertical scale factor. Applied from anchorY, anchorY.
 * @property {number} anchorX - Horizontal anchor point for rotation and scaling (0-1, 0=left, 0.5=center, 1=right).
 * @property {number} anchorY - Vertical anchor point for rotation and scaling (0-1, 0=top, 0.5=center, 1=bottom).
 * @property {number} alpha - Opacity of the sprite (0-1).
 * @property {boolean} visible - Whether the sprite should be rendered. Defaults to true.
 * @property {number} zIndex - Rendering order. Lower values are drawn first. Defaults to 0.
 * @property {string|null} currentFrameName - If using a SpriteAtlas, the name of the current frame.
 */
export class Sprite {
    /**
     * Creates an instance of Sprite.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     * @param {HTMLImageElement | HTMLCanvasElement | ImageBitmap | import('../assets/SpriteAtlas.js').SpriteAtlas} source - The image or SpriteAtlas to use.
     * @param {object} [options={}] - Configuration options for the sprite.
     * @param {number} [options.x=0] - Initial x position in world space.
     * @param {number} [options.y=0] - Initial y position in world space.
     * @param {number} [options.width] - Initial width. If from atlas and not set, uses frame width. If whole image, uses image width.
     * @param {number} [options.height] - Initial height. If from atlas and not set, uses frame height. If whole image, uses image height.
     * @param {string} [options.frameName] - If source is a SpriteAtlas, the name of the frame to display.
     * @param {number} [options.sourceX=0] - Source x for drawing (if not using atlas frame).
     * @param {number} [options.sourceY=0] - Source y for drawing (if not using atlas frame).
     * @param {number} [options.sourceWidth] - Source width for drawing (if not using atlas frame).
     * @param {number} [options.sourceHeight] - Source height for drawing (if not using atlas frame).
     * @param {number} [options.rotation=0] - Initial rotation in radians.
     * @param {number} [options.scaleX=1] - Initial horizontal scale.
     * @param {number} [options.scaleY=1] - Initial vertical scale.
     * @param {number} [options.anchorX=0.5] - Horizontal anchor point (0-1).
     * @param {number} [options.anchorY=0.5] - Vertical anchor point (0-1).
     * @param {number} [options.alpha=1] - Initial opacity (0-1).
     * @param {boolean} [options.visible=true] - Initial visibility.
     * @param {number} [options.zIndex=0] - Initial zIndex.
     */
    constructor(engine, source, options = {}) {
        if (!engine) throw new Error("Sprite constructor: engine is required.");
        if (!source) throw new Error("Sprite constructor: source (Image or SpriteAtlas) is required.");

        this.engine = engine;
        this.source = source;

        this.x = options.x || 0;
        this.y = options.y || 0;

        this.rotation = options.rotation || 0;
        this.scaleX = options.scaleX === undefined ? 1 : options.scaleX;
        this.scaleY = options.scaleY === undefined ? 1 : options.scaleY;
        this.anchorX = options.anchorX === undefined ? 0.5 : options.anchorX;
        this.anchorY = options.anchorY === undefined ? 0.5 : options.anchorY;
        this.alpha = options.alpha === undefined ? 1 : options.alpha;
        this.visible = options.visible === undefined ? true : options.visible;
        this.zIndex = options.zIndex || 0;
        this.currentFrameName = options.frameName || null;

        if (this.source.constructor.name === 'SpriteAtlas' && this.currentFrameName) {
            const frameData = this.source.getFrameData(this.currentFrameName);
            if (frameData) {
                this.sourceX = frameData.x;
                this.sourceY = frameData.y;
                this.sourceWidth = frameData.w;
                this.sourceHeight = frameData.h;
                this.width = options.width === undefined ? frameData.w : options.width;
                this.height = options.height === undefined ? frameData.h : options.height;
            } else {
                this.engine.errorHandler.error(`Sprite: Frame '${this.currentFrameName}' not found in SpriteAtlas.`, { component: 'Sprite' });
                this._setFallbackSourceDimensions(options);
            }
        } else {
             this._setFallbackSourceDimensions(options);
        }
    }

    _setFallbackSourceDimensions(options) {
        // Fallback for direct image source or if atlas/frame is invalid
        const baseImage = (this.source.constructor.name === 'SpriteAtlas') ? this.source.atlasImage : this.source;
        this.sourceX = options.sourceX || 0;
        this.sourceY = options.sourceY || 0;
        this.sourceWidth = options.sourceWidth === undefined ? (baseImage.width || 0) : options.sourceWidth;
        this.sourceHeight = options.sourceHeight === undefined ? (baseImage.height || 0) : options.sourceHeight;
        this.width = options.width === undefined ? this.sourceWidth : options.width;
        this.height = options.height === undefined ? this.sourceHeight : options.height;
    }

    /**
     * Sets the current frame of the sprite if using a SpriteAtlas.
     * @param {string} frameName - The name of the frame to switch to.
     */
    setFrame(frameName) {
        if (this.source.constructor.name !== 'SpriteAtlas') {
            this.engine.errorHandler.warn("Sprite.setFrame: Source is not a SpriteAtlas.", { component: 'Sprite' });
            return;
        }
        if (typeof frameName !== 'string') {
             this.engine.errorHandler.error("Sprite.setFrame: frameName must be a string.", { component: 'Sprite' });
            return;
        }
        const frameData = this.source.getFrameData(frameName);
        if (frameData) {
            this.currentFrameName = frameName;
            this.sourceX = frameData.x;
            this.sourceY = frameData.y;
            this.sourceWidth = frameData.w;
            this.sourceHeight = frameData.h;
            // Optionally update width/height to match frame, or keep existing scaled size
            // For now, let's assume user wants to match frame size if they change frame
            this.width = frameData.w;
            this.height = frameData.h;
        } else {
            this.engine.errorHandler.error(`Sprite.setFrame: Frame '${frameName}' not found in SpriteAtlas.`, { component: 'Sprite' });
        }
    }

    /**
     * Renders the sprite to the given canvas rendering context.
     * This method is typically called by the RenderingEngine.
     * @param {CanvasRenderingContext2D} context - The rendering context to draw on.
     */
    render(context) {
        if (!this.visible || this.alpha <= 0) {
            return;
        }

        context.save();
        context.globalAlpha = this.alpha;

        // Translate context to sprite's position for rotation and scaling
        context.translate(this.x + this.width * this.anchorX, this.y + this.height * this.anchorY);
        if (this.rotation !== 0) {
            context.rotate(this.rotation);
        }
        if (this.scaleX !== 1 || this.scaleY !== 1) {
            context.scale(this.scaleX, this.scaleY);
        }
        // Translate back by anchor for drawing
        context.translate(-this.width * this.anchorX, -this.height * this.anchorY);

        const imageToDraw = (this.source.constructor.name === 'SpriteAtlas') ? this.source.atlasImage : this.source;

        if (imageToDraw && (this.sourceWidth > 0 && this.sourceHeight > 0)) {
            try {
                context.drawImage(
                    imageToDraw,
                    this.sourceX,
                    this.sourceY,
                    this.sourceWidth,
                    this.sourceHeight,
                    0, // Draw at the sprite's translated origin
                    0, // Draw at the sprite's translated origin
                    this.width,
                    this.height
                );
                // this.engine.renderingEngine.renderStats.drawCalls++; // RenderingEngine should manage this
            } catch (e) {
                this.engine.errorHandler.error('Error during Sprite.render.drawImage', { component: 'Sprite', originalError: e, spriteSource: imageToDraw.src });
            }
        } else if (imageToDraw && (this.sourceWidth === 0 || this.sourceHeight === 0)) {
             this.engine.errorHandler.warn('Sprite.render: sourceWidth or sourceHeight is zero.', { component: 'Sprite', spriteSource: imageToDraw.src, sw: this.sourceWidth, sh: this.sourceHeight });
        }


        context.restore();
    }
}
