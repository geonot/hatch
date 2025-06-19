/**
 * @file HatchEngine.js
 * @description The main game engine class responsible for orchestrating all engine systems,
 * managing the game loop, configuration, core managers, and the overall lifecycle of the game.
 */

import jsyaml from 'js-yaml';
import { EventBus } from './EventBus.js';
import { ErrorHandler } from './ErrorHandler.js';
import { EngineEvents, ErrorLevels, LogLevelPriority } from './Constants.js';
import AssetManager from '../assets/AssetManager.js';
import InputManager from '../input/InputManager.js';
import RenderingEngine from '../rendering/RenderingEngine.js'; // Corrected path
import SceneManager from '../scenes/SceneManager.js';
import { Scene } from './Scene.js';
import AudioManager from '../audio/AudioManager.js';

/**
 * @class HatchEngine
 * @classdesc The main game engine class responsible for orchestrating all engine systems.
 * It manages the game loop, configuration, core managers (assets, input, rendering, scenes, errors),
 * and the overall lifecycle of the game.
 *
 * @property {object} hatchConfig - The fully processed project configuration object.
 * @property {string} canvasId - The ID of the HTML canvas element to use for rendering.
 * @property {number} width - The logical width of the game canvas.
 * @property {number} height - The logical height of the game canvas.
 * @property {EventBus} eventBus - Instance of the EventBus for engine-wide events.
 * @property {ErrorHandler} errorHandler - Instance of the ErrorHandler for logging and error management.
 * @property {HTMLCanvasElement | null} canvas - The HTML canvas element used for rendering.
 * @property {CanvasRenderingContext2D | null} ctx - The 2D rendering context of the canvas.
 * @property {boolean} isRunning - Flag indicating if the game loop is currently active.
 * @property {number} lastTime - Timestamp of the last frame, used for calculating delta time.
 * @property {AssetManager} assetManager - Manages loading and retrieval of game assets.
 * @property {InputManager} inputManager - Manages user input from keyboard and mouse.
 * @property {RenderingEngine} renderingEngine - Manages all rendering operations.
 * @property {SceneManager} sceneManager - Manages game scenes and transitions.
 * @property {AudioManager} audioManager - Manages audio playback.
 * @property {typeof Scene} Scene - A reference to the base Scene class, for convenience.
 * @property {Function} AssetManagerClass - The class to use for AssetManager (for DI).
 * @property {Function} InputManagerClass - The class to use for InputManager (for DI).
 * @property {Function} RenderingEngineClass - The class to use for RenderingEngine (for DI).
 * @property {Function} SceneManagerClass - The class to use for SceneManager (for DI).
 * @property {Function} AudioManagerClass - The class to use for AudioManager (for DI).
 * @property {Function} SceneClass - The class to use as the base Scene (for DI).
 */
export class HatchEngine {
    /**
     * Applies default values to the parsed project configuration.
     * @param {object} config - The parsed configuration object from `hatch.config.yaml`.
     * @returns {object} The configuration object with defaults applied.
     * @private
     */
    static _applyDefaultConfigValues(config) {
        const defaults = {
            projectName: 'MyHatchGame',
            canvasId: 'gameCanvas',
            gameWidth: 800,
            gameHeight: 600,
            initialScene: 'TestScene',
            assetManifest: undefined,
            logging: { level: ErrorLevels.INFO }, // Default logging config
            renderer: {},
        };

        // Apply defaults for missing keys (simple top-level merge)
        for (const key in defaults) {
            if (config[key] === undefined) {
                config[key] = defaults[key];
            }
        }

        // Type coercion and validation for critical fields
        config.projectName = String(config.projectName);
        config.canvasId = String(config.canvasId);
        config.initialScene = String(config.initialScene);

        // gameWidth and gameHeight validation
        config.gameWidth = Number(config.gameWidth);
        if (isNaN(config.gameWidth) || config.gameWidth <= 0) {
            console.warn(`Invalid gameWidth: ${config.gameWidth}. Falling back to default: ${defaults.gameWidth}`);
            config.gameWidth = defaults.gameWidth;
        }

        config.gameHeight = Number(config.gameHeight);
        if (isNaN(config.gameHeight) || config.gameHeight <= 0) {
            console.warn(`Invalid gameHeight: ${config.gameHeight}. Falling back to default: ${defaults.gameHeight}`);
            config.gameHeight = defaults.gameHeight;
        }

        // assetManifest can be a string or undefined. If it's some other truthy type, stringify.
        // If falsy (but not undefined), it might be an error or explicit null, handle as per requirements.
        // For now, if it's not undefined and not a string, log a warning.
        if (config.assetManifest !== undefined && typeof config.assetManifest !== 'string') {
            console.warn(`[HatchEngine._applyDefaultConfigValues] assetManifest should be a string path or undefined. Received: ${config.assetManifest}. Attempting to treat as undefined.`);
            config.assetManifest = undefined;
        }

        // Ensure logging level is valid, default if not
        config.logging = config.logging || {};
        if (!config.logging.level || !LogLevelPriority.hasOwnProperty(config.logging.level)) {
            if (config.logging.level) { // only warn if a level was provided but was invalid
                console.warn(`[HatchEngine._applyDefaultConfigValues] Invalid logging level: ${config.logging.level}. Defaulting to ${defaults.logging.level}.`);
            }
            config.logging.level = defaults.logging.level;
        }

        // Ensure renderer options exist
        config.renderer = config.renderer || defaults.renderer;

        return config;
    }

    /**
     * Asynchronously loads and parses the project configuration file (`hatch.config.yaml`).
     * Applies default values to the parsed configuration.
     * @param {string} [configPath='/hatch.config.yaml'] - The path to the project configuration file.
     * @returns {Promise<object>} A promise that resolves with the processed configuration object.
     *                            Returns a configuration with fallback defaults if loading or parsing fails.
     * @static
     */
    static async loadProjectConfig(configPath = '/hatch.config.yaml') {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for path: ${configPath}`);
            }
            const yamlText = await response.text();
            let config;
            try {
                config = jsyaml.load(yamlText);
                if (typeof config !== 'object' || config === null) {
                    // js-yaml might return null or a primitive for invalid YAML that doesn't throw.
                    // We expect an object.
                    throw new Error('Parsed YAML is not an object.');
                }
            } catch (yamlError) {
                console.error('[HATCH|ERROR][Static:HatchEngine.loadProjectConfig] Error parsing YAML content.', { path: configPath, library: 'js-yaml', error: yamlError.message, details: yamlError.stack });
                // Trigger ErrorHandler or rethrow if critical
                // For now, we'll let it be caught by the outer catch block to return fallback defaults.
                throw yamlError; // Re-throw to be caught by the main try-catch
            }

            config = this._applyDefaultConfigValues(config);

            console.log('HatchEngine.loadProjectConfig: Loaded and parsed project config using js-yaml from', configPath, config);
            return config;
        } catch (e) {
            // This catches fetch errors, js-yaml parsing errors (if re-thrown), or other errors
            // NOTE: This is a static method, so it cannot access `this.errorHandler` directly.
            // A proper refactor might involve making ErrorHandler accessible statically or passing an instance.
            // For now, console.error is used as per existing structure.
            console.error('[HATCH|CRITICAL][Static:HatchEngine.loadProjectConfig] Failed to load or parse configuration file.', { path: configPath, error: e.message, details: e.stack }, 'Using fallback default configuration.');
            // If ErrorHandler were available:
            // errorHandler.critical(`Failed to load project config from ${configPath}`, {
            //     component: 'HatchEngine',
            //     method: 'loadProjectConfig',
            //     params: { configPath },
            //     originalError: e
            // });
            return this._applyDefaultConfigValues({});
        }
    }

    /**
     * Creates an instance of HatchEngine.
     * The `projectConfig` parameter should be the result of `HatchEngine.loadProjectConfig()`.
     * This configuration object is stored as `this.hatchConfig` and used to initialize
     * various engine properties and core managers.
     *
     * @param {object} projectConfig - The project configuration object. This object can also include
     *                                 override classes for core managers (e.g., `EventBusClass`,
     *                                 `ErrorHandlerClass`, `AssetManagerClass`, `InputManagerClass`,
     *                                 `RenderingEngineClass`, `SceneManagerClass`, `SceneClass`)
     *                                 for dependency injection, typically used for testing or extensions.
     */
    constructor(projectConfig) {
        if (!projectConfig || typeof projectConfig !== 'object') {
            // ErrorHandler is not available yet. Direct throw is appropriate.
            throw new Error("HatchEngine constructor: projectConfig must be a valid object.");
        }
        /** @type {object} */
        this.hatchConfig = projectConfig;

        // Basic check for essential config properties before ErrorHandler is initialized
        if (typeof this.hatchConfig.canvasId !== 'string' ||
            typeof this.hatchConfig.gameWidth !== 'number' ||
            typeof this.hatchConfig.gameHeight !== 'number') {
            throw new Error("HatchEngine constructor: projectConfig is missing essential properties (canvasId, gameWidth, gameHeight) or they are of the wrong type.");
        }

        /** @type {string} */
        this.canvasId = this.hatchConfig.canvasId;
        /** @type {number} */
        this.width = this.hatchConfig.gameWidth;
        /** @type {number} */
        this.height = this.hatchConfig.gameHeight;

        // Determine classes for core components, allowing for injection via hatchConfig
        const EventBusClass = this.hatchConfig.EventBusClass || EventBus;
        const ErrorHandlerClass = this.hatchConfig.ErrorHandlerClass || ErrorHandler;

        /** @type {Function} */
        this.AssetManagerClass = this.hatchConfig.AssetManagerClass || AssetManager;
        /** @type {Function} */
        this.InputManagerClass = this.hatchConfig.InputManagerClass || InputManager;
        /** @type {Function} */
        this.RenderingEngineClass = this.hatchConfig.RenderingEngineClass || RenderingEngine;
        /** @type {Function} */
        this.SceneManagerClass = this.hatchConfig.SceneManagerClass || SceneManager;
        /** @type {Function} */
        this.AudioManagerClass = this.hatchConfig.AudioManagerClass || AudioManager;
        /** @type {Function} */
        this.SceneClass = this.hatchConfig.SceneClass || Scene;

        /** @type {EventBus} */
        this.eventBus = new EventBusClass();

        const initialLogLevel = this.hatchConfig.logging?.level || ErrorLevels.INFO;
        /** @type {ErrorHandler} */
        this.errorHandler = new ErrorHandlerClass(this.eventBus, initialLogLevel);

        /** @type {HTMLCanvasElement | null} */
        this.canvas = null;
        /** @type {CanvasRenderingContext2D | null} */
        this.ctx = null;
        /** @type {boolean} */
        this.isRunning = false;
        /** @type {number} */
        this.lastTime = 0;

        /** @type {import('../grid/GridManager.js').GridManager | null} */
        this.gridManager = null;

        this.eventBus.emit(EngineEvents.CONSTRUCTED, this);
    }

    /**
     * Initializes the HatchEngine instance. This setup includes:
     * - Verifying the browser environment.
     * - Getting the canvas element and its 2D rendering context.
     * - Instantiating core engine managers (AssetManager, InputManager, RenderingEngine, SceneManager).
     * - Making the base Scene class available on the engine instance.
     * Emits `engine:pre-init` before initialization and `engine:init` after successful initialization.
     * Critical errors during initialization are handled by the ErrorHandler and may stop execution.
     */
    init() {
        this.eventBus.emit(EngineEvents.PRE_INIT, this);
        try {
            if (typeof document === 'undefined') {
                return this.errorHandler.critical(
                    'Document is not defined. HatchEngine must be run in a browser environment.',
                    { component: 'HatchEngine', method: 'init' }
                );
            }

            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) {
                return this.errorHandler.critical(
                    `Canvas element with ID '${this.canvasId}' not found.`,
                    { component: 'HatchEngine', method: 'init', params: { canvasId: this.canvasId } }
                );
            }

            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                return this.errorHandler.critical(
                    'Failed to get 2D rendering context for canvas.',
                    { component: 'HatchEngine', method: 'init', params: { canvasId: this.canvasId } }
                );
            }

            // Instantiate core managers
            this.assetManager = new this.AssetManagerClass(this);
            this.inputManager = new this.InputManagerClass(this, this.canvas);
            // Pass renderer options from hatchConfig to RenderingEngine constructor
            const rendererOptions = this.hatchConfig.renderer || {};
            this.renderingEngine = new this.RenderingEngineClass(this.canvas, this, rendererOptions);
            this.sceneManager = new this.SceneManagerClass(this);
            this.audioManager = new this.AudioManagerClass(this);

            // Make base Scene class available on the engine
            /** @type {typeof Scene} */
            this.Scene = this.SceneClass;

            this.errorHandler.info('Core managers instantiated.', { component: 'HatchEngine', method: 'init' });

        } catch (error) {
            // Catch any other unexpected errors during init, including manager instantiation
            // If critical already threw, this might not be reached, but good for safety.
            // Ensure the error is properly handled by the errorHandler
            const errorMessage = `Error during engine initialization or manager instantiation: ${error.message || error}`;
            if (this.errorHandler) {
                return this.errorHandler.critical(errorMessage, {
                    component: 'HatchEngine',
                    method: 'init.managers', // Indicates manager instantiation phase
                    originalError: error
                });
            } else {
                // Fallback if errorHandler itself is not available or failed
                console.error(errorMessage, error);
                throw error; // Re-throw if errorHandler is not available
            }
        }

        this.eventBus.emit(EngineEvents.INIT, this);
        this.errorHandler.info('HatchEngine initialized', { component: 'HatchEngine', method: 'init' });
    }

    /**
     * Starts the main game loop.
     * Checks for necessary browser features (performance, requestAnimationFrame).
     * Ensures the engine is not already running and that the rendering context is available.
     * Sets the engine to a running state and begins the loop using `requestAnimationFrame`.
     * Emits `engine:start` event.
     * Errors during startup checks are handled by the ErrorHandler.
     */
    start() {
        if (typeof performance === 'undefined' || typeof requestAnimationFrame === 'undefined') {
            return this.errorHandler.critical(
                'Performance or requestAnimationFrame is not defined. HatchEngine must be run in a browser environment.',
                { component: 'HatchEngine', method: 'start' }
            );
        }

        if (this.isRunning) {
            this.errorHandler.warn(
                'HatchEngine.start() called but engine is already running.',
                { component: 'HatchEngine', method: 'start' }
            );
            return;
        }
        if (!this.ctx) {
            return this.errorHandler.critical(
                'HatchEngine.start() called before successful initialization (canvas context not ready).',
                { component: 'HatchEngine', method: 'start' }
            );
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._loop.bind(this));
        this.eventBus.emit(EngineEvents.START, this);
        this.errorHandler.info('HatchEngine started', { component: 'HatchEngine', method: 'start' });
    }

    /**
     * Stops the main game loop.
     * If the engine is running, it sets `isRunning` to false and emits `engine:stop` event.
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.eventBus.emit(EngineEvents.STOP, this);
        this.errorHandler.info('HatchEngine stopped', { component: 'HatchEngine', method: 'stop' });
    }

    /**
     * The main game loop method, called by `requestAnimationFrame`.
     * - Calculates delta time.
     * - Emits `engine:update` event.
     * - Updates the current scene via SceneManager.
     * - Handles rendering operations via RenderingEngine (clear, camera transform, scene render, debug info).
     * - Emits `engine:render` event.
     * - Requests the next animation frame.
     * @param {number} currentTime - The current time provided by `requestAnimationFrame`.
     * @private
     */
    _loop(currentTime) {
        if (!this.isRunning) {
            return;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000; // deltaTime in seconds
        this.lastTime = currentTime;

        try {
            this.eventBus.emit(EngineEvents.UPDATE, deltaTime);

            // Scene updates (driven by engine:update or directly)
            if (this.sceneManager && typeof this.sceneManager.update === 'function') {
                this.sceneManager.update(deltaTime);
            } else if (!this.sceneManager) {
                this.errorHandler.warn('SceneManager is not available for updates in game loop.', { component: 'HatchEngine', method: '_loop', detail: 'this.sceneManager is null or has no update method.' });
            }

            // Rendering
            if (this.renderingEngine) {
                // 1. Clear canvas (responsibility of RenderingEngine)
                this.renderingEngine.clear();

                // 2. Apply camera transformations
                if (this.renderingEngine.context && this.renderingEngine.camera) {
                    this.renderingEngine.context.save(); // Save context state before camera transform
                    this.renderingEngine.camera.applyTransform(this.renderingEngine.context);

                    // 3. Scene-specific rendering (scene tells renderingEngine what to draw)
                    if (this.sceneManager && typeof this.sceneManager.render === 'function') {
                        this.sceneManager.render(this.renderingEngine);
                    }

                    // 4. Render all objects added by the scene to the RenderingEngine's list
                    this.renderingEngine.renderManagedDrawables();

                    // 5. Restore context to pre-camera state (for UI, debug info)
                    this.renderingEngine.context.restore();
                } else {
                    this.errorHandler.warn('RenderingEngine context or camera is not available for rendering transformations.', { component: 'HatchEngine', method: '_loop', detail: 'Context or camera missing.' });
                }

                // 6. Draw debug information (if enabled)
                const showDebug = (this.hatchConfig && this.hatchConfig.debug && this.hatchConfig.debug.showStats) ||
                                  (this.renderingEngine.showDebugInfo); // Assuming RE might have its own flag
                if (showDebug) {
                    this.renderingEngine.drawDebugInfo();
                }

            } else if (!this.renderingEngine) {
                this.errorHandler.warn('RenderingEngine is not available for rendering in game loop.', { component: 'HatchEngine', method: '_loop', detail: 'this.renderingEngine is null.' });
                 // Fallback clear if no rendering engine, but this path indicates a setup issue.
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
            }

            this.eventBus.emit(EngineEvents.RENDER, this); // Event indicating render phase is complete or ongoing
        } catch (loopError) {
            this.errorHandler.critical('Unhandled error in game loop.', {
                component: 'HatchEngine',
                method: '_loop',
                originalError: loopError
            });
            this.stop(); // Stop the game loop to prevent further errors.
            // Optionally, re-throw if the environment should handle it, but stopping is safer for a game loop.
            // throw loopError;
            return; // Exit the loop function
        }

        requestAnimationFrame(this._loop.bind(this));
    }
}
// Constructor changes have been applied.
// The comments below this were related to the previous state and are now resolved.
