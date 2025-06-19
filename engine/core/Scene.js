/**
 * @file Scene.js
 * @description Base class for all game scenes in the HatchEngine.
 * Defines the lifecycle methods that scenes should implement to manage their state,
 * assets, game logic, and rendering.
 */

/**
 * @class Scene
 * @classdesc Represents a distinct state or screen in a game, such as a main menu,
 * a game level, or a settings screen. Developers should extend this class
 * to create their custom game scenes.
 *
 * @property {import('./HatchEngine.js').HatchEngine} engine - A reference to the main HatchEngine instance.
 *           This provides access to all core engine systems like AssetManager, InputManager,
 *           RenderingEngine, SceneManager, EventBus, and ErrorHandler.
 * @property {string} name - A descriptive name for the scene, often matching the key
 *                           used when adding it to the SceneManager. (Optional, for debugging/logging)
 */
export class Scene {
    /**
     * Creates an instance of a Scene.
     * @param {import('./HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     *                                                         It's crucial for accessing engine functionalities.
     * @param {string} [name='Scene'] - An optional name for the scene, useful for debugging.
     */
    constructor(engine, name = 'Scene') {
        if (!engine) {
            // This check is crucial. A scene cannot operate without the engine.
            // Since ErrorHandler might not be available if engine itself is invalid,
            // a direct throw is necessary here.
            throw new Error("Scene constructor: Valid 'engine' instance is required.");
        }
        /** @type {import('./HatchEngine.js').HatchEngine} */
        this.engine = engine;

        /** @type {string} */
        this.name = name;

        // Recommended: Log scene construction for easier debugging, if ErrorHandler is available.
        // this.engine.errorHandler.info(`Scene '${this.name}' constructed.`, { component: 'Scene', sceneName: this.name });
    }

    /**
     * Called by the SceneManager before initialization.
     * Use this method to load assets specific to this scene using `this.engine.assetManager`.
     * This method can be asynchronous if asset loading is asynchronous.
     * @returns {Promise<void>} A promise that resolves when all assets are loaded.
     * @async
     */
    async load() {
        // Example: await this.engine.assetManager.loadManifest('assets/scene-specific-manifest.json');
        // this.engine.errorHandler.info(`Scene '${this.name}': load() called.`, { component: 'Scene', sceneName: this.name, method: 'load' });
    }

    /**
     * Called by the SceneManager after `load()` completes and before `enter()`.
     * Use this method to initialize the scene's state, create game objects,
     * set up UI elements, etc.
     * @param {...any} args - Any arguments passed from `sceneManager.switchTo(sceneName, ...args)`.
     */
    init(...args) {
        // this.engine.errorHandler.info(`Scene '${this.name}': init() called with args: ${args.join(', ')}.`, { component: 'Scene', sceneName: this.name, method: 'init', params: args });
    }

    /**
     * Called by the SceneManager when this scene becomes the active scene.
     * Use this method to set up event listeners, start animations, or perform
     * any actions required when the scene becomes visible and interactive.
     * This method can be asynchronous.
     * @returns {Promise<void>} A promise that resolves when the scene has fully entered.
     * @async
     */
    async enter() {
        // this.engine.errorHandler.info(`Scene '${this.name}': enter() called.`, { component: 'Scene', sceneName: this.name, method: 'enter' });
    }

    /**
     * Called by the SceneManager when this scene is being switched away from (before the new scene's `enter`).
     * Use this method to clean up event listeners, pause animations, or save state
     * before the scene becomes inactive.
     * This method can be asynchronous.
     * @returns {Promise<void>} A promise that resolves when the scene has fully exited.
     * @async
     */
    async exit() {
        // this.engine.errorHandler.info(`Scene '${this.name}': exit() called.`, { component: 'Scene', sceneName: this.name, method: 'exit' });
    }

    /**
     * Called by the HatchEngine's game loop for each frame while this scene is active.
     * Use this method for game logic updates, input handling, physics calculations, etc.
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     */
    update(deltaTime) {
        // Example: this.player.update(deltaTime);
        // Note: Logging here can be very verbose. Use with caution or for specific debug needs.
        // if (this.engine.hatchConfig.logging.level === 'debug') { // Example conditional logging
        //     this.engine.errorHandler.debug(`Scene '${this.name}': update() called. DeltaTime: ${deltaTime.toFixed(4)}s`, { component: 'Scene', sceneName: this.name, method: 'update' });
        // }
    }

    /**
     * Called by the HatchEngine's game loop for each frame while this scene is active, after `update()`.
     * Use this method to add drawable objects to the RenderingEngine.
     * The RenderingEngine will then handle the actual drawing to the canvas.
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     *        Use `renderingEngine.add(drawable)` to add objects to the render queue.
     */
    render(renderingEngine) {
        // Example: renderingEngine.add(this.player);
        // Example: renderingEngine.add(this.tileMap);
        // Note: Logging here can be very verbose. Use with caution.
    }

    /**
     * Called by the SceneManager or engine when the scene is no longer needed and should
     * free up all its resources. This is important for preventing memory leaks.
     * Use this method to nullify references to large objects, remove event listeners
     * that were not cleaned up in `exit()`, dispose of assets if they are exclusively
     * used by this scene and no longer needed, etc.
     */
    destroy() {
        // this.engine.errorHandler.info(`Scene '${this.name}': destroy() called.`, { component: 'Scene', sceneName: this.name, method: 'destroy' });
        // Example: if (this.myCustomEventHandler) this.engine.eventBus.off('someEvent', this.myCustomEventHandler);
        // Example: this.player = null; this.tileMap = null;
    }
}
