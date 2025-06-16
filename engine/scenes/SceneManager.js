/**
 * @file SceneManager.js
 * @description Manages the collection of game scenes, handles transitions between them,
 * and orchestrates their lifecycle methods (`load`, `init`, `enter`, `exit`, `update`, `render`, `destroy`).
 */

/**
 * @class SceneManager
 * @classdesc Responsible for managing different game scenes. It holds references to all
 * added scenes (or their constructors) and controls which scene is currently active.
 * It ensures that scene lifecycle methods (`load`, `init`, `enter`, `exit`, `destroy`)
 * are called appropriately during transitions and game loop execution.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance.
 * @property {Map<string, import('./Scene.js').Scene | Function>} scenes - A map storing scene instances or scene constructors,
 *                                                                    keyed by their unique names.
 * @property {import('./Scene.js').Scene | null} currentScene - The currently active scene instance, or null if no scene is active.
 * @property {string | null} currentSceneName - The name of the currently active scene, or null.
 */
import { SceneEvents } from '../core/Constants.js';

class SceneManager {
    /**
     * Creates an instance of SceneManager.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - A reference to the HatchEngine instance.
     *        This provides access to other engine systems like ErrorHandler, EventBus, and RenderingEngine.
     */
    constructor(engine) {
        if (!engine || !engine.errorHandler || !engine.Scene) {
            const errorMsg = "SceneManager constructor: Valid 'engine' instance with 'errorHandler' and 'Scene' class reference is required.";
            if (engine && engine.errorHandler) {
                engine.errorHandler.critical(errorMsg, { component: 'SceneManager', method: 'constructor' });
            } else {
                console.error(errorMsg); // Fallback if errorHandler is not available
            }
            throw new Error(errorMsg);
        }
        /** @type {import('../core/HatchEngine.js').HatchEngine} */
        this.engine = engine;
        /** @type {Map<string, import('./Scene.js').Scene | Function>} */
        this.scenes = new Map();
        /** @type {import('./Scene.js').Scene | null} */
        this.currentScene = null;
        /** @type {string | null} */
        this.currentSceneName = null;
        // console.log("SceneManager: Initialized."); // Debug log, consider using ErrorHandler.info
        this.engine.errorHandler.info("SceneManager Initialized.", { component: "SceneManager", method: "constructor" });
    }

    /**
     * Adds a scene to the manager. The scene can be an instance of a class that extends
     * `HatchEngine.Scene` (or the configured `engine.SceneClass`) or a class constructor that extends it.
     * If a class constructor is provided, it will be instantiated with `new SceneClass(this.engine)`
     * when `switchTo` is called for that scene name for the first time.
     * If a scene with the same name already exists, the old scene (if an instance) will be destroyed
     * before the new one is added.
     *
     * @param {string} name - The unique name for the scene (e.g., 'mainMenu', 'level1').
     * @param {import('./Scene.js').Scene | Function} sceneClassOrInstance - An instance of a Scene subclass,
     *                                                                       or a constructor for a Scene subclass.
     */
    add(name, sceneClassOrInstance) {
        if (typeof name !== 'string' || name.trim() === '') {
            this.engine.errorHandler.error("SceneManager.add: 'name' must be a non-empty string.", { component: 'SceneManager', method: 'add', params: { nameProvided: name } });
            return;
        }
        if (!sceneClassOrInstance || (typeof sceneClassOrInstance !== 'function' && typeof sceneClassOrInstance !== 'object')) {
            this.engine.errorHandler.error(`SceneManager.add: 'sceneClassOrInstance' for scene '${name}' must be a class constructor or an object instance.`, { component: 'SceneManager', method: 'add', params: { name, typeProvided: typeof sceneClassOrInstance } });
            return;
        }

        let isValid = false;
        let typeAdded = '';

        if (typeof sceneClassOrInstance === 'function' && sceneClassOrInstance.prototype instanceof this.engine.Scene) {
            isValid = true;
            typeAdded = 'class';
        } else if (sceneClassOrInstance instanceof this.engine.Scene) {
            isValid = true;
            typeAdded = 'instance';
        }

        if (!isValid) {
            const errorMsg = `Attempted to add object which is not a valid Scene instance or Scene constructor for name '${name}'. Provided object type: ${typeof sceneClassOrInstance}.`;
            this.engine.errorHandler.error(errorMsg, {
                component: 'SceneManager',
                method: 'add',
                params: { name, providedType: typeof sceneClassOrInstance }
            });
            return;
        }

        if (this.scenes.has(name)) {
            const oldEntry = this.scenes.get(name);
            // If the old entry is an instance and has a destroy method, call it.
            if (typeof oldEntry !== 'function' && oldEntry && typeof oldEntry.destroy === 'function') {
                this.engine.errorHandler.warn(`Scene with name '${name}' already exists (was an instance). Destroying old instance before overwriting.`, { component: 'SceneManager', method: 'add', params: { name } });
                try {
                    oldEntry.destroy();
                } catch (e) {
                    this.engine.errorHandler.error(
                        `Error while destroying old scene instance '${name}'.`,
                        {
                            component: 'SceneManager',
                            method: 'add.destroyOldScene',
                            params: { name },
                            originalError: e
                        }
                    );
                }
            } else {
                 this.engine.errorHandler.warn(`Scene or class with name '${name}' already exists. Overwriting.`, { component: 'SceneManager', method: 'add', params: { name } });
            }
        }

        this.scenes.set(name, sceneClassOrInstance);
        if (typeAdded === 'class') {
            this.engine.errorHandler.info(`Scene class '${sceneClassOrInstance.name}' registered as '${name}'. It will be instantiated on first switch.`, { component: 'SceneManager', method: 'add', params: { name, sceneClassName: sceneClassOrInstance.name, typeAdded } });
        } else {
            this.engine.errorHandler.info(`Scene instance '${name}' (instance of ${sceneClassOrInstance.constructor.name}) added.`, { component: 'SceneManager', method: 'add', params: { name, sceneInstanceName: sceneClassOrInstance.constructor.name, typeAdded } });
        }
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
     * @param {string} name - The name of the scene to switch to. Must have been previously added via `add()`.
     * @param {...any} args - Arguments to pass to the new scene's `init()` method.
     * @returns {Promise<void>} A promise that resolves when the scene switch is complete.
     *                          If a critical error occurs during the switch (e.g., scene not found, instantiation failure,
     *                          critical lifecycle method failure), `ErrorHandler.critical` will be called, which typically throws.
     *                          The promise may not resolve or reject in such cases if execution is halted.
     * @async
     */
    _validateAndRetrieveScene(name) {
        const sceneEntry = this.scenes.get(name);
        if (!sceneEntry) {
            this.engine.errorHandler.critical(`Scene or scene class "${name}" not found. Cannot switch.`, {
                component: 'SceneManager',
                method: '_validateAndRetrieveScene',
                params: { name }
            });
            return null;
        }
        return sceneEntry;
    }

    /**
     * Instantiates a scene if the provided entry is a class constructor.
     * If it's already an instance, it returns the instance directly.
     * Updates the internal `scenes` map to store the instance if a class was instantiated.
     * @param {import('./Scene.js').Scene | Function} sceneEntry - The scene class constructor or an instance.
     * @param {string} name - The name of the scene, used for logging and map updates.
     * @returns {import('./Scene.js').Scene | null} The scene instance, or `null` if instantiation failed.
     * @private
     */
    _instantiateSceneIfNeeded(sceneEntry, name) {
        if (typeof sceneEntry === 'function') { // It's a class
            this.engine.errorHandler.info(`Instantiating scene class for '${name}'.`, { component: 'SceneManager', method: '_instantiateSceneIfNeeded', params: {name}});
            try {
                const sceneInstance = new sceneEntry(this.engine);
                if (!(sceneInstance instanceof this.engine.Scene)) { // Check against the potentially overridden Scene class
                    throw new TypeError(`Instantiated scene for '${name}' is not an instance of the configured Scene class.`);
                }
                this.scenes.set(name, sceneInstance); // Replace class with instance
                this.engine.errorHandler.info(`Scene '${name}' instantiated from class.`, { component: 'SceneManager', method: '_instantiateSceneIfNeeded', params: {name}});
                return sceneInstance;
            } catch (instantiationError) {
                this.engine.errorHandler.critical(
                    `Failed to instantiate scene class for '${name}'. Error: ${instantiationError.message}`, {
                        component: 'SceneManager',
                        method: '_instantiateSceneIfNeeded',
                        params: { name },
                        originalError: instantiationError
                    }
                );
                return null;
            }
        }
        return sceneEntry; // Already an instance
    }

    /**
     * Handles exiting the current scene, if one is active.
     * This includes calling its `exit()` method and clearing drawables from the rendering engine.
     * @returns {Promise<void>}
     * @private
     * @async
     */
    async _exitCurrentScene() {
        if (this.currentScene && typeof this.currentScene.exit === 'function') {
            try {
                this.engine.errorHandler.info(`Exiting scene '${this.currentSceneName}'.`, { component: 'SceneManager', method: '_exitCurrentScene', params: { sceneName: this.currentSceneName }});
                await this.currentScene.exit();
            } catch (e) {
                this.engine.errorHandler.error(
                    `Error during exit of scene '${this.currentSceneName}'. Scene switch will continue.`, {
                        component: 'SceneManager',
                        method: '_exitCurrentScene',
                        params: { sceneName: this.currentSceneName },
                        originalError: e
                    }
                );
            }
        }
        if (this.engine.renderingEngine) {
            this.engine.renderingEngine.clearDrawables();
        }
    }

    /**
     * Manages the loading and initialization lifecycle (`load`, `init`, `enter`) for a new scene.
     * If any of these critical steps fail, it attempts to destroy the failed scene.
     * @param {import('./Scene.js').Scene} scene - The scene instance to load and initialize.
     * @param {string} name - The name of the scene.
     * @param {any[]} args - Arguments to pass to the scene's `init()` method.
     * @returns {Promise<boolean>} True if all lifecycle methods completed successfully, false otherwise.
     * @private
     * @async
     */
    async _loadAndInitializeScene(scene, name, args) {
        try {
            if (typeof scene.load === 'function') {
                this.engine.errorHandler.info(`Loading assets for scene '${name}'.`, { component: 'SceneManager', method: '_loadAndInitializeScene', params: { sceneName: name, phase: 'load' }});
                await scene.load();
            }
            if (typeof scene.init === 'function') {
                this.engine.errorHandler.info(`Initializing scene '${name}'.`, { component: 'SceneManager', method: '_loadAndInitializeScene', params: { sceneName: name, phase: 'init' }});
                scene.init(...args);
            }
            if (typeof scene.enter === 'function') {
                this.engine.errorHandler.info(`Entering scene '${name}'.`, { component: 'SceneManager', method: '_loadAndInitializeScene', params: { sceneName: name, phase: 'enter' }});
                await scene.enter();
            }
            return true;
        } catch (error) {
            this.engine.errorHandler.critical(
                `Critical failure during lifecycle (load/init/enter) of new scene '${name}'. Original error: ${error.message}`, {
                    component: 'SceneManager',
                    method: '_loadAndInitializeScene',
                    params: { sceneName: name },
                    originalError: error
                }
            );

            if (scene && typeof scene.destroy === 'function') {
                try {
                    this.engine.errorHandler.warn(`Attempting to destroy scene '${name}' after lifecycle failure.`, { component: 'SceneManager', method: '_loadAndInitializeScene.cleanup', params: { sceneName: name }});
                    scene.destroy();
                } catch (destroyError) {
                    this.engine.errorHandler.error(
                        `Error while destroying scene '${name}' after it failed lifecycle methods.`, {
                            component: 'SceneManager',
                            method: '_loadAndInitializeScene.cleanup',
                            params: { sceneName: name, originalLifecycleErrorMsg: error.message },
                            originalError: destroyError
                        }
                    );
                }
            }
            return false;
        }
    }

    async switchTo(name, ...args) {
        if (typeof name !== 'string' || name.trim() === '') {
            this.engine.errorHandler.error("SceneManager.switchTo: 'name' must be a non-empty string.", { component: 'SceneManager', method: 'switchTo', params: { nameProvided: name } });
            return;
        }
        const sceneEntry = this._validateAndRetrieveScene(name);
        if (!sceneEntry) return;

        const newSceneInstance = this._instantiateSceneIfNeeded(sceneEntry, name);
        if (!newSceneInstance) return;

        const oldSceneName = this.currentSceneName;
        await this._exitCurrentScene();

        this.currentScene = newSceneInstance;
        this.currentSceneName = name;
        this.engine.errorHandler.info(`Switching from scene '${oldSceneName || 'none'}' to '${name}'.`, { component: 'SceneManager', method: 'switchTo', params: { oldSceneName, newSceneName: name } });

        const success = await this._loadAndInitializeScene(newSceneInstance, name, args);

        if (!success) {
            // Critical error already logged by _loadAndInitializeScene
            // Revert current scene if new one failed critically
            this.currentScene = null;
            this.currentSceneName = null;
            // Consider if we should attempt to switch back to oldSceneName, though that could also fail.
            // For now, leaving the engine without a current scene is a clear indication of failure.
            this.engine.errorHandler.error(`Failed to switch to scene '${name}' due to lifecycle errors. No scene is currently active.`, { component: 'SceneManager', method: 'switchTo', params: { name } });
            return;
        }

        if (this.engine.eventBus) {
            this.engine.eventBus.emit(SceneEvents.SCENE_SWITCHED, { name: this.currentSceneName, scene: this.currentScene });
        }
        this.engine.errorHandler.info(`Successfully switched to scene '${this.currentSceneName}'.`, { component: 'SceneManager', method: 'switchTo', params: { name: this.currentSceneName } });
    }

    /**
     * Updates the currently active scene by calling its `update()` method.
     * Called by `HatchEngine._loop` each frame.
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     */
    update(deltaTime) {
        if (typeof deltaTime !== 'number' || isNaN(deltaTime)) {
            this.engine.errorHandler.error('SceneManager.update: deltaTime must be a valid number.', { component: 'SceneManager', method: 'update', params: { deltaTime } });
            return;
        }
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            try {
                this.currentScene.update(deltaTime);
            } catch (e) {
                 this.engine.errorHandler.error(
                    `Error during update of scene '${this.currentSceneName}'.`,
                    {
                        component: 'SceneManager',
                        method: 'update',
                        params: { sceneName: this.currentSceneName },
                        originalError: e
                    }
                );
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
        if (!renderingEngine || typeof renderingEngine.add !== 'function') {
            this.engine.errorHandler.error('SceneManager.render: A valid RenderingEngine instance is required.', { component: 'SceneManager', method: 'render', hasRenderingEngine: !!renderingEngine });
            return;
        }
        if (this.currentScene && typeof this.currentScene.render === 'function') {
             try {
                this.currentScene.render(renderingEngine);
            } catch (e) {
                 this.engine.errorHandler.error(
                    `Error during render of scene '${this.currentSceneName}'.`,
                    {
                        component: 'SceneManager',
                        method: 'render',
                        params: { sceneName: this.currentSceneName },
                        originalError: e
                    }
                );
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
            this.engine.errorHandler.info(`Destroying current scene '${sceneToDestroyName}'.`, { component: 'SceneManager', method: 'destroyCurrentScene', params: { name: sceneToDestroyName } });
            if (typeof this.currentScene.exit === 'function') {
                try { this.currentScene.exit(); } catch (e) {
                    this.engine.errorHandler.error(
                        `Error during exit of scene '${sceneToDestroyName}' on destroy.`,
                        { component: 'SceneManager', method: 'destroyCurrentScene.exit', params: { sceneName: sceneToDestroyName }, originalError: e }
                    );
                }
            }
            if (typeof this.currentScene.destroy === 'function') {
                try { this.currentScene.destroy(); } catch (e) {
                    this.engine.errorHandler.error(
                        `Error during destroy of scene '${sceneToDestroyName}'.`,
                        { component: 'SceneManager', method: 'destroyCurrentScene.destroy', params: { sceneName: sceneToDestroyName }, originalError: e }
                    );
                }
            }
            this.currentScene = null;
            this.currentSceneName = null;
        }
    }
}

export default SceneManager;
