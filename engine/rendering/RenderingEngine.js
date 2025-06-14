/**
 * @file RenderingEngine.js
 * @description Manages all rendering operations for the HatchEngine, including
 * canvas setup, context management, camera integration, DPI scaling,
 * and drawing primitives. It maintains a list of "drawable" objects
 * provided by the current scene and renders them each frame.
 */

import Camera from './Camera.js';

/**
 * @class RenderingEngine
 * @classdesc Orchestrates rendering to the HTML canvas. It handles the 2D rendering context,
 * manages a camera for viewport transformations, supports DPI scaling for sharp visuals,
 * and provides methods for drawing basic shapes, images, and text.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the main HatchEngine instance.
 * @property {HTMLCanvasElement} canvas - The HTML canvas element used for rendering.
 * @property {CanvasRenderingContext2D} context - The 2D rendering context of the canvas.
 * @property {number} width - The logical width of the canvas (from configuration).
 * @property {number} height - The logical height of the canvas (from configuration).
 * @property {number} pixelRatio - The device pixel ratio for handling high DPI displays.
 * @property {Camera} camera - The camera instance used for viewport management.
 * @property {Array<Object>} drawables - A list of objects to be rendered in the current frame.
 *                                      Each object must have a `render(ctx)` method.
 * @property {Object} renderStats - Statistics about rendering performance.
 * @property {number} renderStats.drawCalls - Number of draw operations in the last frame.
 * @property {number} renderStats.objectsRendered - Number of objects rendered in the last frame.
 * @property {number} renderStats.frameTime - Time taken to render the last frame in milliseconds (specifically the rendering part of the game loop).
 * @property {boolean} showDebugInfo - Flag to control the display of debug information.
 */
class RenderingEngine {
    /**
     * Creates an instance of RenderingEngine.
     * @param {HTMLCanvasElement} canvas - The HTML canvas element to render to.
     * @param {import('../core/HatchEngine.js').default} engine - A reference to the HatchEngine instance.
     * @param {Object} [options={}] - Configuration options for the renderer.
     * @param {Object} [options.rendererOptions={alpha: true}] - Options passed to `canvas.getContext('2d')`. Defaults to `{alpha: true}`.
     * @param {boolean} [options.scaleToDevicePixelRatio=true] - Whether to scale the canvas for high DPI displays.
     * @param {boolean} [options.showDebugInfo=false] - Whether to display debug information by default. This can be overridden by engine config.
     * @throws {Error} If the 2D rendering context cannot be obtained from the canvas.
     */
    constructor(canvas, engine, options = {}) {
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {?CanvasRenderingContext2D} */
        this.context = null;

        try {
            const contextOptions = options.rendererOptions !== undefined ? options.rendererOptions : { alpha: true };
            this.context = this.canvas.getContext('2d', contextOptions);
            if (!this.context) {
                throw new Error("RenderingEngine: Failed to get 2D rendering context. Rendering will not be possible.");
            }
        } catch (error) {
            if (this.engine && this.engine.errorHandler) {
                // .handle with critical:true is expected to call .critical, which throws.
                this.engine.errorHandler.handle(error, { phase: "RenderingEngine Constructor", originalError: error }, true);
            } else {
                // If no error handler, log and re-throw the original error.
                console.error("Critical Error: RenderingEngine failed to initialize context and no errorHandler is available.", error);
                throw error;
            }
            // If errorHandler.handle with critical:true didn't throw, the error would be swallowed.
            // However, our ErrorHandler.critical does throw, so this line is typically not reached if errorHandler is present.
            // If errorHandler is NOT present, the else block above throws.
        }

        /** @type {number} */
        this.width = this.canvas.width; // Logical width from config
        /** @type {number} */
        this.height = this.canvas.height; // Logical height from config

        /** @type {number} */
        this.pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1; // Default to 1 if window or devicePixelRatio is not available

        if (this.pixelRatio > 1 && options.scaleToDevicePixelRatio !== false) {
            console.log(`RenderingEngine: DevicePixelRatio: ${this.pixelRatio}. Adjusting canvas for high DPI.`);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.canvas.width = Math.floor(this.width * this.pixelRatio);
            this.canvas.height = Math.floor(this.height * this.pixelRatio);
            this.context.scale(this.pixelRatio, this.pixelRatio);
        } else {
            console.log(`RenderingEngine: DevicePixelRatio is ${this.pixelRatio} or DPI scaling disabled. Canvas dimensions: ${this.width}x${this.height}`);
        }

        /** @type {Camera} */
        this.camera = new Camera(this.width, this.height); // Pass logical dimensions

        /** @type {{drawCalls: number, objectsRendered: number, frameTime: number}} */
        this.renderStats = { drawCalls: 0, objectsRendered: 0, frameTime: 0 };

        /** @type {boolean} */
        this.showDebugInfo = options.showDebugInfo || false; // Default from RE options
        /** @type {Array<Object>} */
        this.drawables = [];

        console.log(`RenderingEngine: Initialized. Logical: ${this.width}x${this.height}. Backing: ${this.canvas.width}x${this.canvas.height}. DPR: ${this.pixelRatio}.`);
    }

    /**
     * Adds a drawable object to the rendering queue for the current frame.
     * A drawable object must have a `render(context)` method and optionally a `visible` property.
     * @param {Object} drawable - The object to add. Must implement `render(context: CanvasRenderingContext2D): void`.
     */
    add(drawable) {
        if (drawable && typeof drawable.render === 'function') {
            if (!this.drawables.includes(drawable)) {
                this.drawables.push(drawable);
            }
        } else {
            this.engine.errorHandler.warn("RenderingEngine.add: Attempted to add an invalid or non-renderable object.", {
                context: "RenderingEngine.add",
                providedObject: drawable
            });
        }
    }

    /**
     * Removes a specific drawable object from the rendering queue.
     * @param {Object} drawable - The drawable object to remove.
     */
    remove(drawable) {
        this.drawables = this.drawables.filter(d => d !== drawable);
    }

    /**
     * Clears all drawable objects from the rendering queue.
     * Typically called at the start of a scene's render method or by HatchEngine before scene rendering.
     */
    clearDrawables() {
        this.drawables = [];
    }

    /**
     * Clears the entire canvas. Called by HatchEngine at the beginning of each frame's render phase.
     * Resets frame-specific rendering statistics like `drawCalls` and `objectsRendered`.
     */
    clear() {
        this.context.clearRect(0, 0, this.width, this.height); // Uses logical width/height
        this.renderStats.drawCalls = 0;
        this.renderStats.objectsRendered = 0;
    }

    /**
     * Renders all drawable objects currently in the `drawables` list.
     * Called by HatchEngine after camera transformations are applied.
     */
    renderManagedDrawables() {
        let objectsRenderedThisFrame = 0;
        // Optional: Sort drawables by a zIndex property for layering
        // this.drawables.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        for (const drawable of this.drawables) {
            if (drawable && typeof drawable.render === 'function' && (drawable.visible === undefined || drawable.visible === true)) {
                try {
                    drawable.render(this.context);
                    objectsRenderedThisFrame++;
                } catch (error) {
                    this.engine.errorHandler.handle(error, {
                        context: "RenderingEngine.renderManagedDrawables: Error in drawable.render()",
                        drawableType: drawable.constructor?.name || typeof drawable.type || typeof drawable
                    }, false); // Not necessarily critical for the whole engine to stop
                }
            }
        }
        this.renderStats.objectsRendered = objectsRenderedThisFrame;
    }

    /**
     * Draws a line between two points in world space. Increments `drawCalls`.
     * @param {number} x1 - Starting x-coordinate (world space).
     * @param {number} y1 - Starting y-coordinate (world space).
     * @param {number} x2 - Ending x-coordinate (world space).
     * @param {number} y2 - Ending y-coordinate (world space).
     * @param {string} [color='white'] - CSS color string for the line.
     * @param {number} [lineWidth=1] - Width of the line in world units. Visual thickness is adjusted by camera zoom.
     */
    drawLine(x1, y1, x2, y2, color = 'white', lineWidth = 1) {
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.strokeStyle = color;
        const currentZoom = this.camera.zoom <= 0 ? 0.01 : this.camera.zoom; // Prevent zero/negative zoom issues
        this.context.lineWidth = lineWidth / currentZoom;
        this.context.stroke();
        this.renderStats.drawCalls++;
    }

    /**
     * Draws a filled or stroked rectangle in world space. Increments `drawCalls`.
     * @param {number} x - X-coordinate of the rectangle's top-left corner (world space).
     * @param {number} y - Y-coordinate of the rectangle's top-left corner (world space).
     * @param {number} width - Width of the rectangle (world units).
     * @param {number} height - Height of the rectangle (world units).
     * @param {string} color - CSS color string.
     * @param {boolean} [fill=true] - True to fill, false to stroke.
     */
    drawRect(x, y, width, height, color, fill = true) {
        // Culling is generally handled by the scene or objects themselves before adding to drawables.
        // if (!this.camera.isRectInView({x, y, width, height})) return;

        this.context.fillStyle = color;
        this.context.strokeStyle = color;
        if (fill) {
            this.context.fillRect(x, y, width, height);
        } else {
            this.context.strokeRect(x, y, width, height);
        }
        this.renderStats.drawCalls++;
    }

    /**
     * Draws an image or a portion of an image in world space. Wrapper for `ctx.drawImage`. Increments `drawCalls`.
     * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} image - The image source.
     * @param {...number} args - Arguments for `drawImage` (dx, dy, [dWidth, dHeight], [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight]). World space.
     */
    drawImage(image, ...args) {
        if (image && image instanceof HTMLImageElement && (image.naturalWidth === 0 || image.naturalHeight === 0)) {
            if (image.complete) { // Only warn if it's supposedly loaded but has no dimensions
                 console.warn(`RenderingEngine.drawImage: Attempting to draw image with zero dimensions (naturalWidth: ${image.naturalWidth}, naturalHeight: ${image.naturalHeight}). Source: ${image.src}`);
            }
            // Do not attempt to draw if dimensions are zero, as it might cause errors or be pointless.
            // However, the current structure with try...catch will handle errors if drawImage is called.
            // For now, just warning. The problem statement implies only adding a check and warning.
        }

        try {
            // It's important that image.complete is true for HTMLImageElement for reliable drawing.
            // The Sprite class already checks this. If drawing directly, caller should ensure.
            if (image && (image instanceof HTMLImageElement ? image.complete : true)) {
                this.context.drawImage(image, ...args);
                this.renderStats.drawCalls++;
            } else if (image && image instanceof HTMLImageElement && !image.complete) {
                // This case should ideally be handled by asset loading or pre-draw checks.
                console.warn(`RenderingEngine.drawImage: Image not yet complete. Source: ${image.src}`);
            }
        } catch (error) {
             this.engine.errorHandler.handle(error, {
                context: "RenderingEngine.drawImage",
                imageLoaded: image && (image.complete !== undefined ? image.complete : true),
                args: args.map(String) // Convert args to string for robust stringify
            }, false); // Not necessarily critical if one image fails
        }
    }

    /**
     * Draws text in world space. Increments `drawCalls`.
     * @param {string} text - The text to draw.
     * @param {number} x - X-coordinate for text anchor (world space).
     * @param {number} y - Y-coordinate for text anchor (world space).
     * @param {string} [font='16px sans-serif'] - CSS font string.
     * @param {string} [color='black'] - CSS color string.
     * @param {CanvasTextAlign} [align='left'] - Horizontal alignment.
     * @param {CanvasTextBaseline} [baseline='top'] - Vertical baseline.
     */
    drawText(text, x, y, font = '16px sans-serif', color = 'black', align = 'left', baseline = 'top') {
        this.context.font = font;
        this.context.fillStyle = color;
        this.context.textAlign = align;
        this.context.textBaseline = baseline;
        this.context.fillText(text, x, y);
        this.renderStats.drawCalls++;
    }

    /**
     * Draws debug information overlay (FPS, stats, etc.) in screen space.
     * Called by `HatchEngine._loop` if debug info is enabled.
     */
    drawDebugInfo() {
        const fps = this.engine.deltaTime > 0 ? (1 / this.engine.deltaTime).toFixed(1) : 'N/A';
        const { drawCalls, objectsRendered } = this.renderStats;
        const frameTime = this.renderStats.frameTime.toFixed(2);

        const lines = [
            `FPS: ${fps}`,
            `Frame Time: ${frameTime} ms`,
            `Draw Calls: ${drawCalls}`,
            `Objects Rendered: ${objectsRendered}`,
            `Camera: X:${this.camera.x.toFixed(0)}, Y:${this.camera.y.toFixed(0)}, Zoom:${this.camera.zoom.toFixed(2)}`,
            `Canvas: ${this.width}x${this.height} (Log) / ${this.canvas.width}x${this.canvas.height} (Back)`,
        ];

        if (this.engine.inputManager) {
            const mousePos = this.engine.inputManager.getMousePosition();
            const worldMousePos = this.camera.screenToWorld(mousePos.x, mousePos.y);
            lines.push(`Mouse: Scr(${mousePos.x.toFixed(0)},${mousePos.y.toFixed(0)}) Wrld(${worldMousePos.x.toFixed(0)},${worldMousePos.y.toFixed(0)})`);

            let pressedInfo = "";
            if (this.engine.inputManager.isMouseButtonPressed(0)) pressedInfo += "LMB ";
            if (this.engine.inputManager.isMouseButtonPressed(1)) pressedInfo += "MMB ";
            if (this.engine.inputManager.isMouseButtonPressed(2)) pressedInfo += "RMB ";
            if (this.engine.inputManager.isKeyPressed("Space")) pressedInfo += "Space ";
            if (pressedInfo) lines.push(`Pressed: ${pressedInfo.trim()}`);
        }
        if (this.engine.sceneManager && this.engine.sceneManager.currentSceneName) {
            lines.push(`Scene: ${this.engine.sceneManager.currentSceneName}`);
        }

        this.context.save();
        this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0); // Screen space for overlay

        // Configurable debug styles with defaults
        const debugConfig = this.engine.hatchConfig?.renderer?.debug || this.engine.hatchConfig?.debug || {};

        const fontFamily = debugConfig.fontFamily || 'Arial';
        const baseFontSize = debugConfig.fontSize || 12; // Logical pixels
        const fontColor = debugConfig.fontColor || 'white';
        const bgColor = debugConfig.bgColor || 'rgba(0,0,0,0.75)';
        const padding = debugConfig.padding || 5; // Logical pixels
        const lineHeightPadding = debugConfig.lineHeightPadding || 4; // Logical pixels

        // Apply pixelRatio for actual rendering dimensions
        const actualFontSize = baseFontSize / this.pixelRatio;
        const actualPadding = padding / this.pixelRatio;
        const actualLineHeight = (baseFontSize + lineHeightPadding) / this.pixelRatio;

        const x = actualPadding + (5 / this.pixelRatio); // Keep small offset from edge
        let currentY = actualPadding + (10 / this.pixelRatio); // Keep small offset from top

        this.context.font = `${actualFontSize}px ${fontFamily}`;

        let maxWidth = 0;
        for (const line of lines) {
            maxWidth = Math.max(maxWidth, this.context.measureText(line).width);
        }
        // backgroundWidth and backgroundHeight are in scaled pixels (already divided by pixelRatio implicitly through context measures)
        const backgroundWidth = maxWidth + actualPadding * 2;
        const backgroundHeight = lines.length * actualLineHeight + actualPadding * 1.5;

        this.context.fillStyle = bgColor;
        this.context.fillRect(x - actualPadding, currentY - actualPadding, backgroundWidth, backgroundHeight);

        this.context.fillStyle = fontColor;
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';

        for (const line of lines) {
            this.context.fillText(line, x, currentY);
            currentY += actualLineHeight;
        }

        this.context.restore();
    }
}

export default RenderingEngine;
