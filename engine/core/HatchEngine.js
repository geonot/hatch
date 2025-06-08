/**
 * @file HatchEngine.js
 * @description Main class for the Hatch game engine. Orchestrates all engine subsystems.
 */

import EventBus from './EventBus.js';
import ErrorHandler from './ErrorHandler.js';
import RenderingEngine from '../rendering/RenderingEngine.js';
import InputManager from '../input/InputManager.js';
import AssetManager from '../assets/AssetManager.js';
import Scene from '../scenes/Scene.js';
import SceneManager from '../scenes/SceneManager.js';

/**
 * @class HatchEngine
 * @classdesc The core class of the Hatch game engine. It initializes and manages
 * all engine subsystems including rendering, input, assets, scenes, and the main game loop.
 *
 * @property {Object} config - The configuration object passed during instantiation.
 * @property {?HTMLCanvasElement} canvas - The HTML canvas element used for rendering.
 * @property {boolean} isRunning - Flag indicating if the game loop is active.
 * @property {EventBus} eventBus - The central event bus for engine-wide communication.
 * @property {ErrorHandler} errorHandler - Handles error reporting and logging.
 * @property {?RenderingEngine} renderingEngine - Manages rendering operations.
 * @property {?InputManager} inputManager - Manages user input (keyboard, mouse).
 * @property {AssetManager} assetManager - Manages loading and storage of game assets.
 * @property {SceneManager} sceneManager - Manages game scenes and transitions.
 * @property {typeof Scene} Scene - A reference to the base Scene class, for type checking.
 */
class HatchEngine {
    /**
     * Creates an instance of HatchEngine.
     * @param {Object} config - The engine and game configuration object.
     *                          Should typically include `engine` and `project` sub-objects.
     */
    constructor(config) {
        /** @type {Object} */
        this.config = config || {};
        /** @type {?HTMLCanvasElement} */
        this.canvas = null;
        /** @type {boolean} */
        this.isRunning = false;
        /** @private @type {number} Time of the last frame, used for calculating deltaTime. */
        this.lastTime = 0;
        /** @type {number} Time elapsed since the last frame, in seconds. Passed to update methods. */
        this.deltaTime = 0;
        /** @private @type {?number} ID returned by `requestAnimationFrame`, used for cancelling the loop. */
        this.rafId = null;

        /** @type {EventBus} Central event bus for the engine. */
        this.eventBus = new EventBus();
        /** @type {ErrorHandler} Handles all error reporting and logging. */
        this.errorHandler = new ErrorHandler(this);
        /** @type {typeof Scene} Provides access to the base Scene class, e.g., for `instanceof` checks. */
        this.Scene = Scene;

        // Initialize Managers
        /** @type {AssetManager} Manages loading and storage of game assets. */
        this.assetManager = new AssetManager(this);
        /** @type {SceneManager} Manages game scenes, their lifecycle, and transitions. */
        this.sceneManager = new SceneManager(this);
        /** @private @type {Map<string, typeof Scene>} Stores scene classes to be instantiated by SceneManager at start. */
        this.scenesToRegisterBeforeStart = new Map();

        /** @type {?RenderingEngine} Manages all rendering operations; initialized in `init()`. */
        this.renderingEngine = null;
        /** @type {?InputManager} Manages all user input; initialized in `init()`. */
        this.inputManager = null;

        console.log("HatchEngine: Constructor called. Engine created.");
    }

    /**
     * Registers a scene class with the engine.
     * Scenes are instantiated by the SceneManager when the engine starts or when switched to.
     * @param {string} name - The unique name to identify the scene.
     * @param {typeof Scene} sceneClass - The class constructor of the scene (must extend `HatchEngine.Scene`).
     */
    registerScene(name, sceneClass) {
        if (typeof sceneClass !== 'function' || !(sceneClass.prototype instanceof this.Scene)) {
            const errorMsg = `HatchEngine.registerScene: Attempted to register '${name}' which is not a valid Scene class. Ensure it extends engine.Scene.`;
            console.error(errorMsg);
            // this.errorHandler.handle(new TypeError(errorMsg), { context: "HatchEngine.registerScene" }); // Optional: more formal logging
            return;
        }
        this.scenesToRegisterBeforeStart.set(name, sceneClass);
        console.log(`HatchEngine: Scene class '${name}' registered successfully.`);
    }

    /**
     * Initializes the HatchEngine. This setup includes acquiring the canvas,
     * setting up core managers like RenderingEngine and InputManager, and preparing
     * for the initial scene.
     * @param {Object} [options={}] - Initialization options.
     * @param {string} [options.initialSceneName] - Optional name of the scene to load first.
     *                                              If not provided, uses `config.engine.initialScene`.
     * @param {any[]} [options.initialSceneArgs=[]] - Optional arguments to pass to the initial scene's `init` method.
     * @returns {Promise<void>} A promise that resolves when initialization is complete.
     * @throws {Error} If critical initialization steps fail (e.g., canvas not found).
     */
    async init({ initialSceneName, initialSceneArgs = [] } = {}) {
        console.log("HatchEngine: Initializing...");
        try {
            /** @type {?string} Name of the scene to load on start, determined by options or config. */
            this.initialSceneName = initialSceneName || this.config.engine?.initialScene || null;
            /** @type {any[]} Arguments to be passed to the initial scene's `init` method. */
            this.initialSceneArgs = initialSceneArgs;

            const canvasId = this.config.engine?.canvasId || 'gameCanvas';
            this.canvas = document.getElementById(canvasId);

            if (!this.canvas) {
                throw new Error(`HatchEngine.init: Canvas element with ID '${canvasId}' not found.`);
            }

            this.canvas.width = this.config.engine?.width || 800;
            this.canvas.height = this.config.engine?.height || 600;

            const renderingOptions = this.config.engine?.renderingOptions || {};
            if (this.config.engine?.scaleToDevicePixelRatio !== undefined) {
                renderingOptions.scaleToDevicePixelRatio = this.config.engine.scaleToDevicePixelRatio;
            }
            // Pass showDebugInfo to renderingOptions for RenderingEngine to use
            renderingOptions.showDebugInfo = this.config.engine?.showDebugInfo ?? false;

            this.renderingEngine = new RenderingEngine(this.canvas, this, renderingOptions);
            this.inputManager = new InputManager(this, this.canvas, this.config.engine?.inputOptions || {});

            console.log("HatchEngine: Initialized successfully.");
            this.eventBus.emit('engine:initialized', { timestamp: new Date(), engine: this });

        } catch (error) {
            this.errorHandler.handle(error, { phase: "HatchEngine.init" }, true);
            throw error; // Re-throw to allow caller (e.g., main.js) to handle critical init failure
        }
    }

    /**
     * Starts the engine's game loop and loads the initial scene.
     * This method is asynchronous because switching to the initial scene (which may involve asset loading)
     * is an asynchronous operation.
     *
     * @returns {Promise<void>} A promise that resolves when the engine has started and the initial scene (if any)
     *                          has been successfully switched to. It might reject if the initial scene fails critically.
     */
    async start() {
        if (this.isRunning) {
            console.warn("HatchEngine.start: Engine is already running.");
            return;
        }

        console.log("HatchEngine: Starting engine systems...");
        this.isRunning = true; // Set isRunning true before async operations that might be slow
        this.lastTime = performance.now();
        this.eventBus.emit('engine:started', { timestamp: new Date(), engine: this });

        // Instantiate registered scenes and add them to SceneManager
        if (this.scenesToRegisterBeforeStart.size > 0) {
            for (const [name, sceneClass] of this.scenesToRegisterBeforeStart) {
                try {
                    const sceneInstance = new sceneClass(this); // Pass engine instance to scene constructor
                    this.sceneManager.add(name, sceneInstance);
                } catch (error) {
                    this.errorHandler.handle(error, { context: `HatchEngine.start: Failed to instantiate scene '${name}'` }, true);
                    // Depending on desired robustness, may choose to stop or continue without this scene
                }
            }
            this.scenesToRegisterBeforeStart.clear(); // Clear after attempting instantiation
        } else {
            console.log("HatchEngine.start: No scenes were pre-registered via engine.registerScene().");
        }

        if (this.initialSceneName) {
            try {
                console.log(`HatchEngine: Attempting to switch to initial scene '${this.initialSceneName}' with args:`, this.initialSceneArgs);
                await this.sceneManager.switchTo(this.initialSceneName, ...this.initialSceneArgs);
            } catch (error) {
                // SceneManager.switchTo already logs and handles errors via errorHandler.
                // This catch is for critical failure of the initial scene switch.
                console.error(`HatchEngine.start: Critical failure switching to initial scene '${this.initialSceneName}'. Stopping engine.`);
                this.stop(); // Stop engine if initial scene fails critically
                // No re-throw needed as stop() handles cleanup; main.js might catch if start() itself is awaited and throws.
                return;
            }
        } else {
            console.warn("HatchEngine.start: No initial scene specified. Engine will start without an active scene.");
        }

        console.log("HatchEngine: Started successfully. Beginning game loop.");
        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }

    /**
     * Stops the engine's game loop, cancels the animation frame request,
     * and triggers cleanup for managers like InputManager and the current scene.
     * Emits an 'engine:stopped' event.
     */
    stop() {
        if (!this.isRunning) {
            console.warn("HatchEngine.stop: Engine is not currently running.");
            return;
        }
        this.isRunning = false; // Signal loop to stop
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Clean up managers and current scene
        if (this.inputManager && typeof this.inputManager.destroy === 'function') {
            this.inputManager.destroy();
        }
        if (this.sceneManager && typeof this.sceneManager.destroyCurrentScene === 'function') {
             this.sceneManager.destroyCurrentScene(); // Calls exit() and destroy() on current scene
        }
        // Other managers like RenderingEngine, AssetManager could have destroy methods if they hold persistent resources or listeners.

        console.log("HatchEngine: Stopped.");
        this.eventBus.emit('engine:stopped', { timestamp: new Date(), engine: this });
    }

    /**
     * The main game loop, called by `requestAnimationFrame`.
     * This method orchestrates the per-frame updates and rendering sequence:
     * 1. Calculates delta time.
     * 2. Processes input.
     * 3. Updates the current scene's logic.
     * 4. Renders the current scene.
     * It includes try-catch blocks for update and render phases to prevent
     * unhandled errors from stopping the entire loop, delegating errors to the ErrorHandler.
     *
     * @param {DOMHighResTimeStamp} currentTime - The current high-resolution timestamp from `requestAnimationFrame`.
     * @private
     */
    _loop(currentTime) {
        if (!this.isRunning) { // Check if stop() has been called
            return;
        }

        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert milliseconds to seconds
        this.lastTime = currentTime;

        const loopProcessStartTime = performance.now();

        // --- Update Phase ---
        try {
            if (this.inputManager) {
                this.inputManager.update(this.deltaTime);
            }
            if (this.sceneManager) {
                this.sceneManager.update(this.deltaTime); // Calls currentScene.update()
            }
        } catch (error) {
            this.errorHandler.handle(error, { context: "HatchEngine._loop: Update phase" }, true); // Mark as critical
            this.stop(); // Stop the engine on critical update errors
            return; // Exit loop
        }

        // --- Render Phase ---
        if (this.renderingEngine) {
            const renderStartTime = performance.now();
            try {
                this.renderingEngine.clear();

                this.renderingEngine.context.save();
                this.renderingEngine.camera.applyTransform(this.renderingEngine.context);

                if (this.sceneManager) {
                    // Scene's render method is responsible for adding drawables to RenderingEngine
                    this.sceneManager.render(this.renderingEngine);
                }

                this.renderingEngine.renderManagedDrawables();

                this.renderingEngine.context.restore(); // From camera transform

                // Draw debug information (overlay, not affected by camera)
                // Use showDebugInfo from engine config as the primary source of truth
                const showDebug = this.config.engine?.showDebugInfo ?? this.renderingEngine.showDebugInfo ?? false;
                if (showDebug) {
                    this.renderingEngine.drawDebugInfo();
                }

                this.renderingEngine.renderStats.frameTime = performance.now() - renderStartTime;
            } catch (error) {
                this.errorHandler.handle(error, { context: "HatchEngine._loop: Rendering phase" }, true); // Mark as critical
                this.stop(); // Stop the engine on critical rendering errors
                return; // Exit loop
            }
        }

        // Overall loop processing time (excluding vsync wait) can be calculated here if needed:
        // const loopProcessEndTime = performance.now();
        // const processTime = loopProcessEndTime - loopProcessStartTime;
        // console.log(`Loop process time: ${processTime.toFixed(2)}ms`);


        // Request the next frame to continue the loop, only if still running
        if (this.isRunning) {
            this.rafId = requestAnimationFrame(this._loop.bind(this));
        }
    }
}

export default HatchEngine;
