/**
 * @file SceneManager.js
 * @description Manages the collection of game scenes, handles transitions between them,
 * and orchestrates their lifecycle methods (`load`, `init`, `enter`, `exit`, `update`, `render`, `destroy`).
 */

/**
 * @class SceneManager
 * @classdesc Responsible for managing different game scenes. It holds references to all
 * added scenes and controls which scene is currently active. It ensures that
 * scene lifecycle methods are called appropriately during transitions and game loop execution.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
 * @property {Map<string, import('./Scene.js').default>} scenes - A map storing scene instances, keyed by their unique names.
 * @property {?import('./Scene.js').default} currentScene - The currently active scene instance.
 * @property {?string} currentSceneName - The name of the currently active scene.
 */
class SceneManager {
    /**
     * Creates an instance of SceneManager.
     * @param {import('../core/HatchEngine.js').default} engine - A reference to the HatchEngine instance.
     *        Required for accessing other engine systems like ErrorHandler, EventBus, and RenderingEngine.
     */
    constructor(engine) {
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {Map<string, import('./Scene.js').default>} Stores scene instances by name. */
        this.scenes = new Map();
        /** @type {?import('./Scene.js').default} The active scene. */
        this.currentScene = null;
        /** @type {?string} Name of the active scene. */
        this.currentSceneName = null;
        console.log("SceneManager: Initialized.");
    }

    /**
     * Adds a scene instance to the manager. The scene should be an instance of a class
     * that extends `HatchEngine.Scene`.
     * @param {string} name - The unique name for the scene (e.g., 'mainMenu', 'level1').
     * @param {import('./Scene.js').default} sceneInstance - An instance of a scene class.
     * @throws {Error} If `sceneInstance` is not a valid instance of `engine.Scene`.
     */
    add(name, sceneInstance) {
        if (!(sceneInstance instanceof this.engine.Scene)) {
             const errorMsg = `SceneManager.add: Attempted to add object for name '${name}' which is not an instance of engine.Scene.`;
             console.error(errorMsg, sceneInstance);
             this.engine.errorHandler.handle(new TypeError(errorMsg), { context: 'SceneManager.add', sceneName: name, providedObject: sceneInstance });
             return; // Or throw new TypeError(errorMsg);
        }
        if (this.scenes.has(name)) {
            console.warn(`SceneManager.add: Scene with name '${name}' already exists. Overwriting with new instance.`);
            const oldScene = this.scenes.get(name);
            if (oldScene && typeof oldScene.destroy === 'function') {
                try {
                    console.log(`SceneManager.add: Destroying old scene instance '${name}' before overwriting.`);
                    oldScene.destroy();
                } catch (e) {
                    this.engine.errorHandler.error(
                        `SceneManager.add: Error while destroying old scene '${name}'.`,
                        { context: 'SceneManager.add.destroyOldScene', sceneName: name, originalError: e }
                    );
                }
            }
        }
        this.scenes.set(name, sceneInstance);
        console.log(`SceneManager: Scene '${name}' (instance of ${sceneInstance.constructor.name}) added.`);
    }

    /**
     * Switches the active scene to the scene specified by `name`.
     * This process involves:
     * 1. Calling `exit()` on the current scene (if one exists).
     * 2. Clearing drawables from the RenderingEngine.
     * 3. Setting the new scene as current.
     * 4. Calling `load()` on the new scene and awaiting its completion.
     * 5. Calling `init()` on the new scene with provided arguments.
     * 6. Calling `enter()` on the new scene.
     * 7. Emitting a 'scene:switched' event.
     * Errors during any critical lifecycle method of the new scene will be handled and may prevent the switch.
     *
     * @param {string} name - The name of the scene to switch to. Must have been previously added.
     * @param {...any} args - Arguments to pass to the new scene's `init()` method.
     * @returns {Promise<void>} A promise that resolves when the scene switch is complete, or rejects if it fails.
     * @async
     * @throws {Error} If the scene `name` is not found, or if `load`, `init`, or `enter` methods of the new scene throw an error.
     */
    async switchTo(name, ...args) {
        const newScene = this.scenes.get(name);

        if (!newScene) {
            const error = new Error(`SceneManager.switchTo: Scene "${name}" not found.`);
            // .handle with critical:true is expected to call .critical, which throws.
            this.engine.errorHandler.handle(error, { context: 'SceneManager.switchTo', sceneName: name, originalError: error }, true);
            // If errorHandler.handle didn't throw, the error would be swallowed.
            // Assuming critical path in errorHandler always throws.
            return; // Should not be reached if critical error is thrown. Added for logical clarity.
        }

        if (this.currentScene && typeof this.currentScene.exit === 'function') {
            try {
                console.log(`SceneManager: Exiting scene '${this.currentSceneName}'.`);
                this.currentScene.exit();
            } catch (e) {
                 this.engine.errorHandler.handle(e, { context: `SceneManager.currentScene.exit (${this.currentSceneName})`});
                 // Continue switching even if exit fails, but log it.
            }
        }

        if (this.engine.renderingEngine) {
            this.engine.renderingEngine.clearDrawables();
        }

        const oldSceneName = this.currentSceneName;
        this.currentScene = newScene;
        this.currentSceneName = name;
        console.log(`SceneManager: Switching from '${oldSceneName || 'none'}' to '${name}'.`);

        try {
            if (typeof newScene.load === 'function') {
                console.log(`SceneManager: Loading assets for scene '${name}'.`);
                await newScene.load();
            }
            if (typeof newScene.init === 'function') {
                console.log(`SceneManager: Initializing scene '${name}'.`);
                newScene.init(...args);
            }
            if (typeof newScene.enter === 'function') {
                console.log(`SceneManager: Entering scene '${name}'.`);
                newScene.enter();
            }
        } catch (error) {
            // If load, init, or enter fail, this is critical for the scene.
            // ErrorHandler has already been called by the scene method if it's well-behaved.
            // The primary error handler call below is for the switchTo context itself.
            this.engine.errorHandler.critical(
                `SceneManager.switchTo: Critical failure during lifecycle of new scene '${name}'. Original error: ${error.message}`,
                { context: 'SceneManager.switchTo.lifecycleFailure', sceneName: name, originalError: error }
            );

            // Attempt to clean up the failed scene
            if (newScene && typeof newScene.destroy === 'function') {
                try {
                    console.warn(`SceneManager.switchTo: Attempting to destroy scene '${name}' after lifecycle failure.`);
                    newScene.destroy();
                } catch (destroyError) {
                    this.engine.errorHandler.error(
                        `SceneManager.switchTo: Error while destroying scene '${name}' after it failed to initialize/load/enter. Original lifecycle error: ${error.message}`,
                        { context: 'SceneManager.switchTo.cleanupDestroyFailure', sceneName: name, cleanupError: destroyError, originalLifecycleError: error }
                    );
                    // Do not let the destroyError overshadow the original error.
                }
            }

            this.currentScene = null; // Prevent operations on a partially initialized/failed scene
            this.currentSceneName = null;
            // The critical handler above already throws, so no need to 'throw error;' here if critical always throws.
            // If critical does not throw, then 'throw error;' would be needed.
            // Assuming ErrorHandler.critical re-throws.
        }

        if (this.engine.eventBus) {
            this.engine.eventBus.emit('scene:switched', { name: this.currentSceneName, scene: this.currentScene });
        }
        console.log(`SceneManager: Successfully switched to scene '${this.currentSceneName}'.`);
    }

    /**
     * Updates the currently active scene by calling its `update()` method.
     * Called by `HatchEngine._loop` each frame.
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     */
    update(deltaTime) {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            try {
                this.currentScene.update(deltaTime);
            } catch (e) {
                 this.engine.errorHandler.handle(e, { context: `SceneManager.update (${this.currentSceneName})`});
                 // Depending on game design, an error in update might be critical enough to stop the scene or engine.
            }
        }
    }

    /**
     * Renders the currently active scene by calling its `render()` method.
     * The scene's `render` method is responsible for adding its drawable objects
     * to the `RenderingEngine`.
     * Called by `HatchEngine._loop` each frame.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     */
    render(renderingEngine) {
        if (this.currentScene && typeof this.currentScene.render === 'function') {
             try {
                this.currentScene.render(renderingEngine);
            } catch (e) {
                 this.engine.errorHandler.handle(e, { context: `SceneManager.render (${this.currentSceneName})`});
                 // Errors during render might also be critical.
            }
        }
    }

    /**
     * Calls `exit()` and `destroy()` on the current scene, effectively cleaning it up.
     * Sets `currentScene` and `currentSceneName` to null.
     * This might be used when shutting down the engine or before a major state change
     * that doesn't immediately involve switching to another managed scene.
     */
    destroyCurrentScene() {
        if (this.currentScene) {
            const sceneToDestroyName = this.currentSceneName;
            console.log(`SceneManager: Destroying current scene '${sceneToDestroyName}'.`);
            if (typeof this.currentScene.exit === 'function') {
                try { this.currentScene.exit(); } catch (e) { this.engine.errorHandler.handle(e, {context: `destroyCurrentScene.exit (${sceneToDestroyName})`}); }
            }
            if (typeof this.currentScene.destroy === 'function') {
                try { this.currentScene.destroy(); } catch (e) { this.engine.errorHandler.handle(e, {context: `destroyCurrentScene.destroy (${sceneToDestroyName})`}); }
            }
            this.currentScene = null;
            this.currentSceneName = null;
        }
    }
}

export default SceneManager;
