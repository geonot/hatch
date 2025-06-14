import { EventBus } from './EventBus.js';
import { ErrorHandler } from './ErrorHandler.js';
import AssetManager from '../assets/AssetManager.js';
import InputManager from '../input/InputManager.js';
import RenderingEngine from '../rendering/RenderingEngine.js'; // Corrected path
import SceneManager from './SceneManager.js';
import Scene from './Scene.js';

export class HatchEngine {
    static async loadProjectConfig(configPath = '/hatch.config.yaml') {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for path: ${configPath}`);
            }
            const yamlText = await response.text();
            const config = {};
            yamlText.split('\n').forEach(line => {
                // Basic YAML parsing: key: value
                // Ignores comments, empty lines, and complex structures
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const parts = trimmedLine.match(/^([^#:]+):\s*(.*)/);
                    if (parts && parts.length === 3) {
                        let key = parts[1].trim();
                        let value = parts[2].trim();
                        // Attempt to parse boolean and numbers, otherwise keep as string
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        // Check if value is a number string (handles integers and floats)
                        // Ensure it's not an empty string or just a dot before parsing
                        else if (value && !isNaN(Number(value))) value = Number(value);

                        config[key] = value;
                    }
                }
            });

            // Apply defaults and ensure correct types for critical fields
            config.projectName = config.projectName || 'MyHatchGame';
            config.canvasId = config.canvasId || 'gameCanvas';

            // Ensure gameWidth and gameHeight are numbers, default if not or NaN
            config.gameWidth = typeof config.gameWidth === 'number' ? config.gameWidth : parseInt(config.gameWidth, 10);
            if (isNaN(config.gameWidth)) config.gameWidth = 800;

            config.gameHeight = typeof config.gameHeight === 'number' ? config.gameHeight : parseInt(config.gameHeight, 10);
            if (isNaN(config.gameHeight)) config.gameHeight = 600;

            config.initialScene = config.initialScene || 'TestScene';
            // assetManifest can be undefined if not specified, AssetManager handles this.
            // No explicit default for assetManifest is needed here, undefined is fine.

            console.log('HatchEngine.loadProjectConfig: Loaded and parsed project config from', configPath, config);
            return config;
        } catch (e) {
            console.error(`HatchEngine.loadProjectConfig: Failed to load or parse ${configPath}. Using fallback defaults. Error: ${e.message}`);
            return {
                projectName: 'MyHatchGame (Fallback)',
                canvasId: 'gameCanvas',
                gameWidth: 800,
                gameHeight: 600,
                initialScene: 'TestScene',
                assetManifest: undefined // Explicitly undefined if load fails
            };
        }
    }

    constructor(config) {
        this.canvasId = config.canvasId;
        this.width = config.width;
        this.height = config.height;
        this.hatchConfig = config.hatchConfig; // Parsed content of hatch.config.yaml

        this.eventBus = new EventBus();
        // Pass the eventBus instance to the ErrorHandler
        this.errorHandler = new ErrorHandler(this.eventBus);

        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.lastTime = 0;

        // Emit event after basic setup
        this.eventBus.emit('engine:constructed', this);
    }

    init() {
        this.eventBus.emit('engine:pre-init', this);
        try {
            if (typeof document === 'undefined') {
                this.errorHandler.critical('document is not defined. HatchEngine must be run in a browser environment.');
                return; // Stop execution if not in browser
            }

            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) {
                // This will throw and stop execution due to critical error
                return this.errorHandler.critical(`Canvas element with ID '${this.canvasId}' not found.`);
            }

            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                // This will throw and stop execution
                return this.errorHandler.critical('Failed to get 2D rendering context for canvas.');
            }

            // Instantiate core managers
            this.assetManager = new AssetManager(this);
            this.inputManager = new InputManager(this, this.canvas);
            this.renderingEngine = new RenderingEngine(this.canvas, this);
            this.sceneManager = new SceneManager(this);

            // Make base Scene class available on the engine
            this.Scene = Scene;

            console.log('Core managers instantiated.');

        } catch (error) {
            // Catch any other unexpected errors during init, including manager instantiation
            // If critical already threw, this might not be reached, but good for safety.
            // Ensure the error is properly handled by the errorHandler
            const errorMessage = `Error during engine initialization or manager instantiation: ${error.message || error}`;
            if (this.errorHandler) {
                return this.errorHandler.critical(errorMessage, { originalError: error });
            } else {
                // Fallback if errorHandler itself is not available or failed
                console.error(errorMessage, error);
                throw error; // Re-throw if errorHandler is not available
            }
        }

        this.eventBus.emit('engine:init', this);
        console.log('HatchEngine initialized');
    }

    start() {
        if (typeof performance === 'undefined' || typeof requestAnimationFrame === 'undefined') {
            this.errorHandler.critical('performance or requestAnimationFrame is not defined. HatchEngine must be run in a browser environment.');
            return; // Stop execution if not in browser
        }

        if (this.isRunning) {
            this.errorHandler.warn('HatchEngine.start() called but engine is already running.');
            return;
        }
        if (!this.ctx) {
            this.errorHandler.critical('HatchEngine.start() called before successful initialization (canvas context not ready).');
            return;
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._loop.bind(this));
        this.eventBus.emit('engine:start', this);
        console.log('HatchEngine started');
    }

    stop() {
        if (!this.isRunning) {
            // this.errorHandler.info('HatchEngine.stop() called but engine is not running.'); // Optional: can be noisy
            return;
        }
        this.isRunning = false;
        this.eventBus.emit('engine:stop', this);
        console.log('HatchEngine stopped');
    }

    _loop(currentTime) {
        if (!this.isRunning) {
            return;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000; // deltaTime in seconds
        this.lastTime = currentTime;

        this.eventBus.emit('engine:update', deltaTime);

        // Scene updates (driven by engine:update or directly)
        if (this.sceneManager && typeof this.sceneManager.update === 'function') {
            this.sceneManager.update(deltaTime);
        } else if (!this.sceneManager) {
            // console.warnOnce('HatchEngine:_loop: this.sceneManager is not available for updates.'); // Requires console.warnOnce utility
        }


        // Rendering
        if (this.renderingEngine) {
            // 1. Clear canvas (responsibility of RenderingEngine)
            this.renderingEngine.clear();

            // 2. Apply camera transformations
            // Assuming renderingEngine.context and renderingEngine.camera are valid
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

            // 6. Draw debug information (if enabled)
            // showDebugInfo might be on engine.config or renderingEngine itself
            const showDebug = (this.hatchConfig && this.hatchConfig.debug && this.hatchConfig.debug.showStats) ||
                              (this.renderingEngine.showDebugInfo); // Assuming RE might have its own flag
            if (showDebug) {
                this.renderingEngine.drawDebugInfo();
            }

        } else if (!this.renderingEngine) {
            // console.warnOnce('HatchEngine:_loop: this.renderingEngine is not available for rendering.');
             // Fallback clear if no rendering engine, but this path indicates a setup issue.
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        this.eventBus.emit('engine:render', this); // Event indicating render phase is complete or ongoing

        requestAnimationFrame(this._loop.bind(this));
    }
}
