/**
 * @file Scene.js
 * @description Provides the base class for all game scenes in the HatchEngine.
 * A scene represents a distinct part of the game, like a main menu, a level, or a game over screen.
 * It manages its own assets, game objects, and logic for updates and rendering.
 */

/**
 * @class Scene
 * @classdesc Base class for creating game scenes. Defines the lifecycle methods
 * that are called by the `SceneManager` during the game. Subclasses should override
 * these methods to implement scene-specific behavior.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
 * @property {import('../assets/AssetManager.js').default} assetManager - Convenience accessor for the engine's AssetManager.
 * @property {import('../input/InputManager.js').default} inputManager - Convenience accessor for the engine's InputManager.
 * @property {import('../rendering/RenderingEngine.js').default} renderingEngine - Convenience accessor for the engine's RenderingEngine.
 * @property {import('./SceneManager.js').default} sceneManager - Convenience accessor for the engine's SceneManager.
 * @property {import('../core/EventBus.js').default} eventBus - Convenience accessor for the engine's EventBus.
 */
class Scene {
    /**
     * Creates an instance of Scene.
     * @param {import('../core/HatchEngine.js').default} engine - A reference to the HatchEngine instance.
     *        This provides access to all engine subsystems.
     * @throws {Error} If an engine instance is not provided.
     */
    constructor(engine) {
        if (!engine) {
            throw new Error("Scene constructor: An 'engine' instance is required.");
        }
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {import('../assets/AssetManager.js').default} */
        this.assetManager = engine.assetManager;
        /** @type {import('../input/InputManager.js').default} */
        this.inputManager = engine.inputManager;
        /** @type {import('../rendering/RenderingEngine.js').default} */
        this.renderingEngine = engine.renderingEngine;
        /** @type {import('./SceneManager.js').default} */
        this.sceneManager = engine.sceneManager;
        /** @type {import('../core/EventBus.js').default} */
        this.eventBus = engine.eventBus;

        // console.log(`Scene: '${this.constructor.name}' constructed.`);
    }

    /**
     * Convenience accessor for the engine's camera.
     * @type {import('../rendering/Camera.js').default | null}
     * @readonly
     */
    get camera() {
        return this.renderingEngine ? this.renderingEngine.camera : null;
    }

    /**
     * Convenience accessor for the loaded project configuration (from hatch.config.yaml).
     * @type {Object | null}
     * @readonly
     */
    get hatchConfig() {
        return this.engine ? this.engine.hatchConfig : null;
    }

    /**
     * Asynchronous method called by the SceneManager when the scene is being prepared to be shown.
     * Subclasses should override this to load any assets specific to this scene
     * using `this.assetManager.loadAsset()` or `this.assetManager.loadManifest()`.
     * The `SceneManager` will wait for the promise returned by this method to resolve
     * before proceeding to `init()`.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when all scene-specific assets are loaded.
     */
    async load() {
        // Example: console.log(`Scene '${this.constructor.name}': load() called.`);
        // await this.assetManager.loadAsset({name: 'myImage', path: 'path/to/image.png', type: 'image'});
    }

    /**
     * Called by the SceneManager after `load()` has completed and before `enter()`.
     * This method is intended for setting up the initial state of the scene,
     * creating game objects, initializing variables, etc., based on loaded assets
     * and any arguments passed during the scene switch.
     *
     * @param {...any} args - Arguments passed from `SceneManager.switchTo()` to this scene.
     */
    init(...args) {
        // Example: console.log(`Scene '${this.constructor.name}': init() called with args:`, args);
    }

    /**
     * Called by the SceneManager when this scene becomes the active scene and is about to be displayed.
     * This is the place for any final setup before the first `update()` and `render()` calls,
     * such as starting scene-specific timers, playing intro animations, or resetting UI elements.
     */
    enter() {
        // Example: console.log(`Scene '${this.constructor.name}': enter() called.`);
    }

    /**
     * Called by the SceneManager when this scene is about to be deactivated (e.g., when switching to another scene).
     * This method should be used for any cleanup that needs to occur before the scene is no longer active,
     * such as pausing animations, saving state, or stopping scene-specific sounds.
     */
    exit() {
        // Example: console.log(`Scene '${this.constructor.name}': exit() called.`);
    }

    /**
     * Called every frame by the SceneManager for the active scene.
     * This is where game logic, physics updates, AI, and other per-frame updates for the scene should occur.
     *
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     *                             Used for frame-rate independent calculations.
     */
    update(deltaTime) {
        // Example: console.log(`Scene '${this.constructor.name}': update(${deltaTime}) called.`);
    }

    /**
     * Called every frame by the SceneManager for the active scene, after `update()`.
     * This method is responsible for preparing the scene to be drawn. Typically, this involves
     * adding drawable objects (like Sprites, Tile instances, UI elements) to the
     * `RenderingEngine`'s list of drawables for the current frame using `renderingEngine.add(myDrawableObject)`.
     * The actual drawing is then handled by `RenderingEngine.renderManagedDrawables()`.
     *
     * @param {import('../rendering/RenderingEngine.js').default} renderingEngine - The engine's rendering manager.
     *        Scene uses this to add its drawable objects to the current frame's render queue.
     */
    render(renderingEngine) {
        // Example:
        // if (this.playerSprite) {
        //     renderingEngine.add(this.playerSprite);
        // }
        // this.tileManager.renderTiles(renderingEngine); // If using a tile manager
    }

    /**
     * Called by the SceneManager when the scene is being permanently removed or the game is shutting down.
     * This method should be used for final cleanup of all resources held by the scene,
     * such as detaching event listeners, clearing object pools, or nullifying references
     * to prevent memory leaks.
     */
    destroy() {
        // Example: console.log(`Scene '${this.constructor.name}': destroy() called.`);
        // this.eventBus.off('someEvent', this._myEventHandler); // Example of cleaning up specific listeners
    }
}

export default Scene;
