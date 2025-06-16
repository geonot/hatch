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
 * these methods to implement scene-specific behavior, such as loading assets,
 * initializing game objects, handling updates, and rendering.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance, providing access to all core systems.
 * @property {import('../assets/AssetManager.js').AssetManager} assetManager - Convenience accessor for `this.engine.assetManager`.
 * @property {import('../input/InputManager.js').InputManager} inputManager - Convenience accessor for `this.engine.inputManager`.
 * @property {import('../rendering/RenderingEngine.js').RenderingEngine} renderingEngine - Convenience accessor for `this.engine.renderingEngine`.
 * @property {import('./SceneManager.js').SceneManager} sceneManager - Convenience accessor for `this.engine.sceneManager`.
 * @property {import('../core/EventBus.js').EventBus} eventBus - Convenience accessor for `this.engine.eventBus`.
 */
class Scene {
    /**
     * Creates an instance of Scene.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - A reference to the HatchEngine instance.
     *        This provides access to all engine subsystems like AssetManager, InputManager, etc.
     * @throws {Error} If an `engine` instance is not provided to the constructor.
     */
    constructor(engine) {
        if (!engine) {
            // This error is critical for scene operation.
            throw new Error("Scene constructor: An 'engine' instance is required.");
        }
        /** @type {import('../core/HatchEngine.js').HatchEngine} */
        this.engine = engine;
        /** @type {import('../assets/AssetManager.js').AssetManager} */
        this.assetManager = engine.assetManager;
        /** @type {import('../input/InputManager.js').InputManager} */
        this.inputManager = engine.inputManager;
        /** @type {import('../rendering/RenderingEngine.js').RenderingEngine} */
        this.renderingEngine = engine.renderingEngine;
        /** @type {import('./SceneManager.js').SceneManager} */
        this.sceneManager = engine.sceneManager;
        /** @type {import('../core/EventBus.js').EventBus} */
        this.eventBus = engine.eventBus;
    }

    /**
     * Convenience read-only accessor for the engine's main camera.
     * @type {import('../rendering/Camera.js').Camera | null}
     * @readonly
     */
    get camera() {
        return this.renderingEngine ? this.renderingEngine.camera : null;
    }

    /**
     * Convenience read-only accessor for the loaded project configuration object (`hatch.config.yaml`).
     * @type {object | null}
     * @readonly
     */
    get hatchConfig() {
        return this.engine ? this.engine.hatchConfig : null;
    }

    /**
     * Asynchronous method called by the SceneManager when this scene is about to become active,
     * before `init()` and `enter()`. Subclasses should override this to load any assets specific
     * to this scene using `this.assetManager.loadAsset()` or `this.assetManager.loadManifest()`.
     * The `SceneManager` will wait for the promise returned by this method to resolve
     * before proceeding with the scene transition.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when all scene-specific assets are loaded.
     *                          If an error occurs during loading, it should be thrown and will be
     *                          caught by the SceneManager, potentially halting the scene switch.
     * @example
     * async load() {
     *   await this.assetManager.loadAsset({ name: 'playerSprite', path: 'path/to/player.png', type: AssetTypes.IMAGE });
     * }
     */
    async load() {
        // Intended to be overridden by subclasses.
    }

    /**
     * Called by the SceneManager after `load()` has completed successfully and before `enter()`.
     * This method is intended for synchronous setup of the scene's initial state,
     * such as creating game objects, initializing variables, setting up UI elements, etc.,
     * based on loaded assets and any arguments passed during the scene switch.
     *
     * @param {...any} args - Arguments passed from `SceneManager.switchTo()` to this scene.
     * @example
     * init(levelData) {
     *   this.player = new Player(this.engine, levelData.playerStartPos);
     *   this.score = 0;
     * }
     */
    init(...args) {
        // Intended to be overridden by subclasses.
    }

    /**
     * Called by the SceneManager when this scene becomes the active scene and is about to be displayed,
     * after `load()` and `init()` have completed. This is the place for any final setup that might
     * involve starting animations, playing introductory music, or resetting UI states just before
     * the first `update()` and `render()` calls.
     * Can be asynchronous if needed (e.g., waiting for an intro animation to complete).
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when entry logic is complete.
     * @example
     * async enter() {
     *   this.uiManager.showHUD();
     *   await this.soundManager.playMusic('background_theme');
     * }
     */
    async enter() {
        // Intended to be overridden by subclasses.
    }

    /**
     * Called by the SceneManager when this scene is about to be deactivated (e.g., when switching
     * to another scene or when the engine is stopping). This method should be used for any cleanup
     * that needs to occur before the scene is no longer active, such as pausing animations,
     * saving state, or stopping scene-specific sounds.
     * Can be asynchronous if needed.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when exit logic is complete.
     * @example
     * async exit() {
     *   await this.soundManager.stopMusic();
     *   this.saveGameProgress();
     * }
     */
    async exit() {
        // Intended to be overridden by subclasses.
    }

    /**
     * Called every frame by the SceneManager for the active scene.
     * This is where game logic, physics updates, AI, input handling, and other
     * per-frame updates for the scene should occur.
     *
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     *                             This should be used for frame-rate independent calculations
     *                             (e.g., `velocity * deltaTime`).
     */
    update(deltaTime) {
        // Intended to be overridden by subclasses.
    }

    /**
     * Called every frame by the SceneManager for the active scene, after `update()`.
     * This method is responsible for preparing the scene to be drawn. Typically, this involves
     * adding drawable game objects (like Sprites, Tilemaps, UI elements) to the
     * `RenderingEngine`'s list of drawables for the current frame using
     * `renderingEngine.add(myDrawableObject)`. The actual drawing to the canvas
     * is then handled by `RenderingEngine.renderManagedDrawables()`.
     *
     * @param {import('../rendering/RenderingEngine.js').RenderingEngine} renderingEngine - The engine's rendering manager.
     *        The scene uses this to add its drawable objects to the current frame's render queue.
     */
    render(renderingEngine) {
        // Intended to be overridden by subclasses.
        // Example:
        // if (this.player) renderingEngine.add(this.player);
        // if (this.tileMap) renderingEngine.add(this.tileMap);
    }

    /**
     * Called by the SceneManager when the scene is being permanently removed (e.g., if a scene
     * instance is replaced via `SceneManager.add` with the same name) or when the game engine
     * is shutting down and needs to clean up all scenes.
     * This method should be used for final cleanup of all resources held by the scene,
     * such as detaching global event listeners, clearing object pools, or nullifying references
     * to prevent memory leaks.
     */
    destroy() {
        // Intended to be overridden by subclasses.
    }
}

export default Scene;
