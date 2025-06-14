import { EventBus } from './EventBus.js';
import { ErrorHandler } from './ErrorHandler.js';

export class HatchEngine {
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
        } catch (error) {
            // Catch any other unexpected errors during init
             // If critical already threw, this might not be reached, but good for safety.
            return this.errorHandler.critical(`Error during engine initialization: ${error.message || error}`);
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
        // console.log('Engine tick:', deltaTime); // Placeholder for actual update logic. Can be very noisy.

        // Placeholder: Clear canvas (will be moved to RenderingEngine or Scene rendering)
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.eventBus.emit('engine:render', this);

        requestAnimationFrame(this._loop.bind(this));
    }
}
