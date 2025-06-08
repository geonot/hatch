/**
 * @fileoverview Core class for the Hatch Game Engine.
 */

// Assuming ErrorHandler and EventSystem are in the same directory or appropriately pathed.
// For browser environment, these would typically be included via <script> tags or modules.
// For Node.js testing, require might be used. For Phase 1, we'll assume global availability
// or rely on later bundling/module system.

// const ErrorHandler = require('./ErrorHandler'); // Placeholder for Node.js if needed
// const EventSystem = require('./EventSystem');   // Placeholder for Node.js if needed

class HatchEngine {
    constructor(config = {}) {
        console.info("HatchEngine constructor called.");

        this.config = config;
        this.canvas = config.canvas || this.createCanvas(config.width || 800, config.height || 600);

        try {
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error("Failed to get 2D rendering context from canvas.");
            }
        } catch (e) {
            console.error("Error initializing canvas context:", e);
            // In a real scenario, ErrorHandler would be used here, but it might not be initialized yet.
            // So, direct console error is safer at this very early stage.
            throw e; // Re-throw to prevent engine from starting in an invalid state.
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Initialize core systems (stubs for now)
        // These assume ErrorHandler and EventSystem classes are available globally or via imports
        this.errorHandler = new ErrorHandler(); // Assuming ErrorHandler is globally available or imported
        this.eventSystem = new EventSystem();   // Assuming EventSystem is globally available or imported

        this.eventSystem.on('engineError', (errorData) => {
            this.errorHandler.handleError(errorData.error, errorData.context);
        });
        this.eventSystem.emit('engineConstructed', { engine: this }, true);


        // System managers - will be instantiated in init() or later
        this.gridManager = null;
        this.tileManager = null;
        this.inputManager = null;
        this.assetManager = null;
        this.audioManager = null; // Stub, not part of phase 1 detail
        this.sceneManager = null; // Stub, not part of phase 1 detail
        this.animationManager = null; // Stub, not part of phase 1 detail
        this.debugManager = null; // Stub, not part of phase 1 detail

        // Performance monitoring (basic stubs)
        this.deltaTime = 0;
        this.lastFrameTime = performance.now();
        this.targetFPS = config.targetFPS || 60;
        this.frameCount = 0;

        // Game loop control
        this.isRunning = false;
        this.isPaused = false;
        this.gameLoopId = null;

        console.info(`HatchEngine initialized with canvas: ${this.width}x${this.height}`);
    }

    /**
     * Creates a canvas element if one is not provided in the config.
     * @param {number} width The desired width of the canvas.
     * @param {number} height The desired height of the canvas.
     * @returns {HTMLCanvasElement} The created canvas element.
     */
    createCanvas(width, height) {
        if (typeof document === 'undefined') {
            // Non-browser environment, e.g. Node.js for testing without a DOM
            // console.warn("No DOM available to create canvas. Returning mock canvas for testing.");
            return {
                width: width,
                height: height,
                getContext: () => ({ // Mock context
                    fillRect: () => {},
                    clearRect: () => {},
                    drawImage: () => {},
                    beginPath: () => {},
                    stroke: () => {},
                    fill: () => {},
                    // Add other methods as needed for stubs to not crash
                }),
                style: {}, // Mock style object
                // Mock addEventListener for InputManager tests if DOM is not present
                addEventListener: () => {},
                removeEventListener: () => {}
            };
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        // Append to body or a specific container if needed, for now, just create
        // document.body.appendChild(canvas);
        console.info(`Canvas created: ${width}x${height}`);
        return canvas;
    }

    /**
     * Initializes all engine systems.
     * For Phase 1, this will be basic.
     */
    async init() {
        console.info("HatchEngine.init() called.");
        this.eventSystem.emit('engineInitStart', { engine: this }, true);

        // In a full engine, managers would be initialized here.
        // For the stub, we'll keep it simple.
        // Example:
        // this.assetManager = new AssetManager(this); // Assuming AssetManager is available
        // await this.assetManager.init();
        // this.inputManager = new InputManager(this); // Assuming InputManager is available
        // this.inputManager.init();
        // ... and so on for other managers

        this.lastFrameTime = performance.now();
        console.info("HatchEngine initialized successfully.");
        this.eventSystem.emit('engineInitComplete', { engine: this }, true);
    }

    /**
     * Starts the game loop.
     */
    start() {
        if (this.isRunning) {
            console.warn("HatchEngine.start() called but engine is already running.");
            return;
        }
        console.info("HatchEngine.start() called.");
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now(); // Reset last frame time

        // Bind the gameLoop to this instance to maintain context
        this.boundGameLoop = this.gameLoop.bind(this);
        this.gameLoopId = requestAnimationFrame(this.boundGameLoop);

        this.eventSystem.emit('engineStarted', { engine: this }, true);
        console.info("HatchEngine started and game loop initiated.");
    }

    /**
     * The main game loop.
     * @param {DOMHighResTimeStamp} currentTime The current time provided by requestAnimationFrame.
     */
    gameLoop(currentTime) {
        if (!this.isRunning) {
            console.info("Game loop stopping because isRunning is false.");
            return;
        }

        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Delta time in seconds
        this.lastFrameTime = currentTime;
        this.frameCount++;

        if (!this.isPaused) {
            this.update(this.deltaTime);
            this.render();
        } else {
            // Still request next frame even if paused to keep the loop alive for unpausing.
            // Or, handle pause differently (e.g. only render, or a specific pause screen update)
        }

        // Process event queue at the end of each frame (or beginning)
        this.eventSystem.processEventQueue();

        this.gameLoopId = requestAnimationFrame(this.boundGameLoop);
    }

    /**
     * Updates the game state.
     * @param {number} dt Delta time in seconds.
     */
    update(dt) {
        // console.log(`HatchEngine.update(dt: ${dt.toFixed(4)})`);
        this.eventSystem.emit('engineUpdate', { deltaTime: dt }, true);
        // In a full engine, this would call update on all relevant managers/systems:
        // this.inputManager.update(dt);
        // this.sceneManager.update(dt); // (or current scene)
        // this.animationManager.update(dt);
        // etc.
    }

    /**
     * Renders the current game state.
     */
    render() {
        // console.log("HatchEngine.render()");
        this.eventSystem.emit('engineRender', { context: this.ctx }, true);
        // Clear the canvas (basic clear for stub)
        // this.ctx.clearRect(0, 0, this.width, this.height);

        // In a full engine, this would call render on all relevant managers/systems:
        // this.sceneManager.render(this.ctx); // (or current scene)
        // this.debugManager.render(this.ctx); // if active
    }

    /**
     * Pauses the game loop.
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            console.warn("HatchEngine.pause() called but engine is not running or already paused.");
            return;
        }
        console.info("HatchEngine.pause() called.");
        this.isPaused = true;
        this.eventSystem.emit('enginePaused', { engine: this }, true);
    }

    /**
     * Resumes the game loop if paused.
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            console.warn("HatchEngine.resume() called but engine is not running or not paused.");
            return;
        }
        console.info("HatchEngine.resume() called.");
        this.isPaused = false;
        this.lastFrameTime = performance.now(); // Reset to avoid large deltaTime spike
        this.eventSystem.emit('engineResumed', { engine: this }, true);
    }

    /**
     * Stops the game loop and performs minor cleanup.
     */
    stop() {
        if (!this.isRunning) {
            console.warn("HatchEngine.stop() called but engine is not running.");
            return;
        }
        console.info("HatchEngine.stop() called.");
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        this.eventSystem.emit('engineStopped', { engine: this }, true);
        console.info("HatchEngine stopped and game loop cancelled.");
    }

    /**
     * Full cleanup and disposal of engine resources.
     * For a stub, this might be simple.
     */
    destroy() {
        console.info("HatchEngine.destroy() called.");
        this.stop(); // Ensure game loop is stopped

        // Clean up managers and systems
        // Example:
        // if (this.inputManager) this.inputManager.destroy();
        // if (this.assetManager) this.assetManager.destroy();
        // ...etc.

        this.eventSystem.emit('engineDestroyed', { engine: this }, true);

        // Clear listeners in event system
        if (this.eventSystem && typeof this.eventSystem.cleanup === 'function') {
            this.eventSystem.cleanup();
        }

        // Remove canvas from DOM if it was added by the engine
        if (this.canvas && this.canvas.parentElement && typeof document !== 'undefined' && this.canvas.remove) {
            // this.canvas.remove(); // Only if engine appended it.
        }

        // Nullify references
        this.canvas = null;
        this.ctx = null;
        this.errorHandler = null;
        this.eventSystem = null;
        // ... nullify other managers

        console.info("HatchEngine destroyed.");
    }

    /**
     * Resizes the game canvas and internal dimensions.
     * @param {number} newWidth The new width.
     * @param {number} newHeight The new height.
     */
    resize(newWidth, newHeight) {
        console.info(`HatchEngine.resize() called with ${newWidth}x${newHeight}`);
        if (this.canvas) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
        }
        this.width = newWidth;
        this.height = newHeight;

        // Notify systems about the resize
        this.eventSystem.emit('engineResized', { width: newWidth, height: newHeight }, true);

        // Re-render after resize
        if (this.isRunning) {
            this.render();
        }
    }

    /**
     * Sets the target FPS for the game loop.
     * Note: requestAnimationFrame usually aims for display refresh rate.
     * This targetFPS is more for logic that might depend on it.
     * @param {number} fps The desired target frames per second.
     */
    setTargetFPS(fps) {
        if (fps > 0) {
            this.targetFPS = fps;
            console.info(`HatchEngine target FPS set to: ${fps}`);
        } else {
            console.warn(`Invalid target FPS: ${fps}`);
        }
    }
}

// Export the class for use in other modules
// For browser environments, this class would be global or part of a module system.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HatchEngine;
}
