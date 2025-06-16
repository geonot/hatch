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
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the main HatchEngine instance.
 * @property {HTMLCanvasElement} canvas - The HTML canvas element used for rendering.
 * @property {CanvasRenderingContext2D} context - The 2D rendering context of the canvas.
 * @property {number} width - The logical width of the canvas, matching `engine.hatchConfig.gameWidth`.
 * @property {number} height - The logical height of the canvas, matching `engine.hatchConfig.gameHeight`.
 * @property {number} pixelRatio - The device pixel ratio, used for scaling the canvas on high DPI displays.
 * @property {Camera} camera - The camera instance used for viewport management and transformations.
 * @property {Array<Object>} drawables - A list of objects to be rendered in the current frame.
 *                                      Each object must have a `render(context: CanvasRenderingContext2D): void` method
 *                                      and an optional `visible: boolean` property.
 * @property {Object} renderStats - An object holding statistics about rendering performance.
 * @property {number} renderStats.drawCalls - Number of distinct draw operations (e.g., `fillRect`, `drawImage`) in the last rendered frame.
 * @property {number} renderStats.objectsRendered - Number of managed drawable objects rendered in the last frame.
 * @property {number} renderStats.frameTime - Time taken to render the last frame in milliseconds (engine's rendering phase).
 * @property {boolean} showDebugInfo - Flag to control the display of the debug information overlay.
 *                                    This can be influenced by engine configuration.
 */
class RenderingEngine {
    /**
     * @description Default styles for the debug information overlay.
     * These can be overridden by settings in `hatch.config.yaml` under `renderer.debug` or `debug`.
     * @type {Object}
     * @property {string} fontFamily - Font family for debug text.
     * @property {number} fontSize - Logical font size in pixels.
     * @property {string} fontColor - Color of debug text.
     * @property {string} bgColor - Background color of the debug overlay box.
     * @property {number} padding - Logical padding in pixels inside the debug box.
     * @property {number} lineHeightPadding - Additional logical padding for line height.
     * @static
     * @private
     */
    static _defaultDebugStyles = {
        fontFamily: 'Arial',
        fontSize: 12, // Logical pixels
        fontColor: 'white',
        bgColor: 'rgba(0,0,0,0.75)',
        padding: 5, // Logical pixels
        lineHeightPadding: 4 // Logical pixels
    };

    /**
     * Creates an instance of RenderingEngine.
     * @param {HTMLCanvasElement} canvas - The HTML canvas element to render to.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - A reference to the HatchEngine instance.
     * @param {object} [options={}] - Configuration options for the renderer.
     * @param {object} [options.rendererOptions={alpha: true}] - Options passed to `canvas.getContext('2d')`.
     *                                                          Defaults to `{alpha: true}`.
     * @param {boolean} [options.scaleToDevicePixelRatio=true] - Whether to scale the canvas for high DPI displays.
     *                                                           This is sourced from `hatchConfig.renderer.scaleToDevicePixelRatio`.
     * @param {boolean} [options.showDebugInfo=false] - Whether to display debug information by default.
     *                                                  This can be overridden by engine config (`hatchConfig.debug.showStats` or `hatchConfig.renderer.debug.showStats`).
     * @throws {Error} If the 2D rendering context cannot be obtained from the canvas (propagated via ErrorHandler).
     */
    constructor(canvas, engine, options = {}) {
        if (!engine || !engine.errorHandler) {
            const errorMsg = "RenderingEngine constructor: Valid 'engine' instance with 'errorHandler' is required.";
            console.error(errorMsg); // Fallback if errorHandler is not available
            throw new Error(errorMsg);
        }
        this.engine = engine;

        if (!(canvas instanceof HTMLCanvasElement)) {
            const errorMsg = "RenderingEngine constructor: 'canvas' must be an HTMLCanvasElement.";
            this.engine.errorHandler.critical(errorMsg, { component: 'RenderingEngine', method: 'constructor' });
            throw new TypeError(errorMsg); // Critical, cannot proceed
        }
        this.canvas = canvas;

        if (options && typeof options !== 'object') {
            this.engine.errorHandler.warn(`RenderingEngine constructor: 'options' parameter should be an object. Received: ${typeof options}`, { component: 'RenderingEngine', method: 'constructor' });
            options = {}; // Use default options
        }


        /** @type {CanvasRenderingContext2D | null} */
        this.context = null;

        try {
            const contextOptions = options.rendererOptions !== undefined ? options.rendererOptions : { alpha: true };
            this.context = this.canvas.getContext('2d', contextOptions);
            if (!this.context) {
                // This error is critical for the rendering engine's operation.
                // ErrorHandler is available at this point due to the check above.
                this.engine.errorHandler.critical("RenderingEngine: Failed to get 2D rendering context. Rendering will not be possible.", {
                    component: 'RenderingEngine',
                    method: 'constructor'
                });
                // No need to throw here if errorHandler.critical already does.
                // However, to be safe and ensure constructor fails hard:
                throw new Error("RenderingEngine: Failed to get 2D rendering context.");
            }
        } catch (error) { // Catch any other error during context creation
            this.engine.errorHandler.critical(error.message, {
                component: 'RenderingEngine',
                method: 'constructor.getContext',
                originalError: error
            });
            throw error; // Re-throw to ensure constructor failure
        }

        /** @type {number} */
        this.width = this.canvas.width;
        /** @type {number} */
        this.height = this.canvas.height;

        this._initializeCanvasDPIScaling(options);

        /** @type {Camera} */
        this.camera = new Camera(this.width, this.height);

        /** @type {{drawCalls: number, objectsRendered: number, frameTime: number}} */
        this.renderStats = { drawCalls: 0, objectsRendered: 0, frameTime: 0 };

        /** @type {boolean} */
        this.showDebugInfo = options.showDebugInfo || false;
        /** @type {Array<Object>} */
        this.drawables = [];

        // console.log(`RenderingEngine: Initialized. Logical: ${this.width}x${this.height}. Backing: ${this.canvas.width}x${this.canvas.height}. DPR: ${this.pixelRatio}.`);
        this.engine.errorHandler.info(`RenderingEngine Initialized. Logical: ${this.width}x${this.height}, Backing: ${this.canvas.width}x${this.canvas.height}, DPR: ${this.pixelRatio}.`, {
            component: 'RenderingEngine',
            method: 'constructor'
        });
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
            this.engine.errorHandler.warn("Attempted to add an invalid or non-renderable object.", {
                component: 'RenderingEngine',
                method: 'add',
                params: { providedObject: typeof drawable } // stringify or summarize drawable if too large
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
        // Sort drawables by zIndex for layering. Lower zIndex is drawn first (further back).
        this.drawables.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        for (const drawable of this.drawables) {
            if (drawable && typeof drawable.render === 'function' && (drawable.visible === undefined || drawable.visible === true)) {
                try {
                    drawable.render(this.context);
                    objectsRenderedThisFrame++;
                } catch (error) {
                    this.engine.errorHandler.error("Error in drawable.render()", {
                        component: 'RenderingEngine',
                        method: 'renderManagedDrawables',
                        params: { drawableType: drawable.constructor?.name || typeof drawable.type || typeof drawable },
                        originalError: error
                    }); // Not necessarily critical for the whole engine to stop
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
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number' || typeof lineWidth !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for drawLine coordinates or lineWidth (must be numbers).', { component: 'RenderingEngine', method: 'drawLine', params: { x1, y1, x2, y2, lineWidth } });
            return;
        }
        if (typeof color !== 'string') {
            this.engine.errorHandler.error('Invalid color type for drawLine (must be a string).', { component: 'RenderingEngine', method: 'drawLine', params: { color } });
            return;
        }
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
        if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
            this.engine.errorHandler.error('Invalid parameter type for drawRect coordinates or dimensions (must be numbers).', { component: 'RenderingEngine', method: 'drawRect', params: { x, y, width, height } });
            return;
        }
        if (typeof color !== 'string') {
            this.engine.errorHandler.error('Invalid color type for drawRect (must be a string).', { component: 'RenderingEngine', method: 'drawRect', params: { color } });
            return;
        }
        if (typeof fill !== 'boolean') {
            this.engine.errorHandler.error('Invalid fill type for drawRect (must be a boolean).', { component: 'RenderingEngine', method: 'drawRect', params: { fill } });
            // Optionally default fill to true or return
            fill = true;
        }

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
        if (!(image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap))) {
            this.engine.errorHandler.error('Invalid image type for drawImage. Must be HTMLImageElement, HTMLCanvasElement, or ImageBitmap.', { component: 'RenderingEngine', method: 'drawImage', params: { imageType: typeof image } });
            return;
        }
        // It's good practice to check if numerical arguments are indeed numbers, though drawImage itself will throw TypeErrors.
        // For brevity, we'll rely on the internal error catching for args type issues for now,
        // but a full validation would check each relevant arg in ...args.

        if (image instanceof HTMLImageElement && (image.naturalWidth === 0 || image.naturalHeight === 0) && image.complete) {
            this.engine.errorHandler.warn(
                `Attempting to draw image with zero dimensions (naturalWidth: ${image.naturalWidth}, naturalHeight: ${image.naturalHeight}).`, {
                component: 'RenderingEngine',
                method: 'drawImage',
                params: { imageSrc: image.src }
            });
            // Optionally return here if drawing zero-dimension images is undesirable
        }

        try {
            if (image && (image instanceof HTMLImageElement ? image.complete : true)) {
                this.context.drawImage(image, ...args);
                this.renderStats.drawCalls++;
            } else if (image && image instanceof HTMLImageElement && !image.complete) {
                this.engine.errorHandler.warn(
                    'Attempting to draw an image that is not yet complete.', {
                    component: 'RenderingEngine',
                    method: 'drawImage',
                    params: { imageSrc: image.src }
                });
            }
        } catch (error) {
             this.engine.errorHandler.error('Failed to execute drawImage.', {
                component: 'RenderingEngine',
                method: 'drawImage',
                params: {
                    imageSrc: image ? image.src : 'unknown',
                    imageComplete: image && (image.complete !== undefined ? image.complete : true),
                    args: args.map(String)
                },
                originalError: error
            }); // Not necessarily critical if one image fails
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
        if (typeof text !== 'string' && typeof text !== 'number') { // Canvas fillText can take numbers
            this.engine.errorHandler.error('Invalid text type for drawText (must be a string or number).', { component: 'RenderingEngine', method: 'drawText', params: { text } });
            return;
        }
        if (typeof x !== 'number' || typeof y !== 'number') {
            this.engine.errorHandler.error('Invalid coordinates type for drawText (must be numbers).', { component: 'RenderingEngine', method: 'drawText', params: { x, y } });
            return;
        }
        if (typeof font !== 'string' || typeof color !== 'string' || typeof align !== 'string' || typeof baseline !== 'string') {
            this.engine.errorHandler.error('Invalid font, color, align, or baseline type for drawText (must be strings).', { component: 'RenderingEngine', method: 'drawText', params: { font, color, align, baseline } });
            return;
        }

        this.context.font = font;
        this.context.fillStyle = color;
        this.context.textAlign = align;
        this.context.textBaseline = baseline;
        this.context.fillText(text, x, y);
        this.renderStats.drawCalls++;
    }

    /**
     * Draws debug information overlay (FPS, stats, etc.) in screen space.
     * Initializes DPI scaling for the canvas.
     * Adjusts canvas physical dimensions and scales the rendering context based on `window.devicePixelRatio`
     * if `options.scaleToDevicePixelRatio` is not false.
     * @param {object} options - Options passed to the constructor, may include `scaleToDevicePixelRatio`.
     * @private
     */
    _initializeCanvasDPIScaling(options) {
        /** @type {number} The detected or default device pixel ratio. */
        this.pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

        if (this.pixelRatio > 1 && options.scaleToDevicePixelRatio !== false) {
            this.engine.errorHandler.info(`DevicePixelRatio: ${this.pixelRatio}. Adjusting canvas for high DPI.`, {
                component: 'RenderingEngine',
                method: '_initializeCanvasDPIScaling'
            });
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.canvas.width = Math.floor(this.width * this.pixelRatio);
            this.canvas.height = Math.floor(this.height * this.pixelRatio);
            this.context.scale(this.pixelRatio, this.pixelRatio);
        } else {
            this.engine.errorHandler.info(`DevicePixelRatio is ${this.pixelRatio} or DPI scaling disabled. Canvas dimensions: ${this.width}x${this.height}`, {
                component: 'RenderingEngine',
                method: '_initializeCanvasDPIScaling'
            });
        }
    }

    /**
     * Generates an array of strings containing performance-related debug information.
     * @returns {string[]} Array of performance stat strings.
     * @private
     */
    _getPerformanceDebugStrings() {
        const fps = this.engine.deltaTime > 0 ? (1 / this.engine.deltaTime).toFixed(1) : 'N/A';
        const { drawCalls, objectsRendered } = this.renderStats;
        const frameTime = this.renderStats.frameTime.toFixed(2);
        return [
            `FPS: ${fps}`,
            `Frame Time: ${frameTime} ms`,
            `Draw Calls: ${drawCalls}`,
            `Objects Rendered: ${objectsRendered}`,
        ];
    }

    /**
     * Generates an array of strings containing camera-related debug information.
     * @returns {string[]} Array of camera stat strings.
     * @private
     */
    _getCameraDebugStrings() {
        return [
            `Camera: X:${this.camera.x.toFixed(0)}, Y:${this.camera.y.toFixed(0)}, Zoom:${this.camera.zoom.toFixed(2)}`,
        ];
    }

    /**
     * Generates an array of strings containing canvas dimension information.
     * @returns {string[]} Array of canvas dimension strings.
     * @private
     */
    _getCanvasDebugStrings() {
        return [
            `Canvas: ${this.width}x${this.height} (Log) / ${this.canvas.width}x${this.canvas.height} (Back)`,
        ];
    }

    /**
     * Generates an array of strings containing input-related debug information.
     * Requires `this.engine.inputManager` to be available.
     * @returns {string[]} Array of input stat strings, or an empty array if InputManager is not present.
     * @private
     */
    _getInputDebugStrings() {
        const lines = [];
        if (this.engine.inputManager) {
            const mousePos = this.engine.inputManager.getMousePosition();
            const worldMousePos = this.camera.screenToWorld(mousePos.x, mousePos.y);
            lines.push(`Mouse: Scr(${mousePos.x.toFixed(0)},${mousePos.y.toFixed(0)}) Wrld(${worldMousePos.x.toFixed(0)},${worldMousePos.y.toFixed(0)})`);

            let pressedInfo = "";
            if (this.engine.inputManager.isMouseButtonPressed(0)) pressedInfo += "LMB ";
            if (this.engine.inputManager.isMouseButtonPressed(1)) pressedInfo += "MMB ";
            if (this.engine.inputManager.isMouseButtonPressed(2)) pressedInfo += "RMB ";
            if (this.engine.inputManager.isKeyPressed("Space")) pressedInfo += "Space "; // Example key
            if (pressedInfo) lines.push(`Pressed: ${pressedInfo.trim()}`);
        }
        return lines;
    }

    /**
     * Generates an array of strings containing current scene information.
     * Requires `this.engine.sceneManager` to be available.
     * @returns {string[]} Array of scene stat strings, or an empty array if SceneManager is not present or no scene is active.
     * @private
     */
    _getSceneDebugStrings() {
        if (this.engine.sceneManager && this.engine.sceneManager.currentSceneName) {
            return [`Scene: ${this.engine.sceneManager.currentSceneName}`];
        }
        return [];
    }

    /**
     * Draws the debug information overlay onto the canvas.
     * This includes performance statistics, camera and canvas information, input state, and current scene.
     * The appearance of the overlay can be customized via `hatch.config.yaml` (renderer.debug or debug sections).
     */
    drawDebugInfo() {
        const lines = [
            ...this._getPerformanceDebugStrings(),
            ...this._getCameraDebugStrings(),
            ...this._getCanvasDebugStrings(),
            ...this._getInputDebugStrings(),
            ...this._getSceneDebugStrings(),
        ];

        this.context.save();
        this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0); // Screen space for overlay

        const hatchConfigDebugOptions = this.engine.hatchConfig?.renderer?.debug || this.engine.hatchConfig?.debug || {};
        const style = { ...RenderingEngine._defaultDebugStyles, ...hatchConfigDebugOptions };

        // Apply pixelRatio for actual rendering dimensions
        const actualFontSize = style.fontSize / this.pixelRatio;
        const actualPadding = style.padding / this.pixelRatio;
        const actualLineHeight = (style.fontSize + style.lineHeightPadding) / this.pixelRatio;

        const x = actualPadding + (5 / this.pixelRatio);
        let currentY = actualPadding + (10 / this.pixelRatio);

        this.context.font = `${actualFontSize}px ${style.fontFamily}`;

        let maxWidth = 0;
        for (const line of lines) {
            maxWidth = Math.max(maxWidth, this.context.measureText(line).width);
        }
        const backgroundWidth = maxWidth + actualPadding * 2;
        const backgroundHeight = lines.length * actualLineHeight + actualPadding * 1.5;

        this.context.fillStyle = style.bgColor;
        this.context.fillRect(x - actualPadding, currentY - actualPadding, backgroundWidth, backgroundHeight);

        this.context.fillStyle = style.fontColor;
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
