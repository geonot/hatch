/**
 * @file Scene.js
 * @description Enhanced base class for all game scenes in the HatchEngine with integrated UI system.
 * A scene represents a distinct part of the game, like a main menu, a level, or a game over screen.
 * It manages its own assets, game objects, UI components, and logic for updates and rendering.
 */

import { UIManager } from '../ui/UIManager.js';
import { UIBuilder } from '../ui/UIBuilder.js';
import { FormValidator } from '../ui/FormValidator.js';

/**
 * @class Scene
 * @classdesc Enhanced base class for creating game scenes with integrated UI system. 
 * Defines the lifecycle methods that are called by the `SceneManager` during the game. 
 * Subclasses should override these methods to implement scene-specific behavior, such as 
 * loading assets, initializing game objects, handling updates, and rendering.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance, providing access to all core systems.
 * @property {import('../assets/AssetManager.js').AssetManager} assetManager - Convenience accessor for `this.engine.assetManager`.
 * @property {import('../input/InputManager.js').InputManager} inputManager - Convenience accessor for `this.engine.inputManager`.
 * @property {import('../rendering/RenderingEngine.js').RenderingEngine} renderingEngine - Convenience accessor for `this.engine.renderingEngine`.
 * @property {import('./SceneManager.js').SceneManager} sceneManager - Convenience accessor for `this.engine.sceneManager`.
 * @property {import('../core/EventBus.js').EventBus} eventBus - Convenience accessor for `this.engine.eventBus`.
 * @property {UIManager} uiManager - Scene-specific UI manager for handling UI components and interactions.
 * @property {UIBuilder} ui - Fluent UI builder for creating UI components with minimal boilerplate.
 * @property {FormValidator} formValidator - Form validation system for handling input validation.
 */
class Scene {
    /**
     * Creates an instance of Scene.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - A reference to the HatchEngine instance.
     *        This provides access to all engine subsystems like AssetManager, InputManager, etc.
     * @param {Object} config - Scene configuration options
     * @param {boolean} [config.enableUI=true] - Whether to enable the UI system for this scene
     * @param {string} [config.uiTheme='default'] - UI theme to use for this scene
     * @param {Object} [config.uiConfig] - Additional UI configuration
     * @throws {Error} If an `engine` instance is not provided to the constructor.
     */
    constructor(engine, config = {}) {
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
        
        // Scene configuration
        this.config = {
            enableUI: true,
            enableAutoWiring: true,
            enableSmartDefaults: true,
            enablePerformanceMonitoring: true,
            enableAutoAssets: true,
            enableInputBindings: true,
            uiTheme: 'default',
            ...config
        };

        // Import enhanced systems
        this._setupEnhancedSystems();
        
        // Object lifecycle management
        this.managedObjects = new Set();
        this.eventListeners = new Map();
        this.intervals = new Set();
        this.timeouts = new Set();
        this.animationFrames = new Set();
        
        // UI System Integration
        this.uiComponents = new Map(); // component name -> component instance
        this.uiLayouts = new Map(); // layout name -> layout instance
        this.uiAnimations = new Set(); // active UI animations
        
        // Data and state management
        this.data = {};
        this.state = 'uninitialized';
        this.hooks = new Map();
        this.timers = new Map();
        this.animations = new Map();
        
        // Performance tracking
        this.performanceMonitor = null;
        this.performanceBudget = null;
        
        // Input bindings
        this.inputBindings = null;
        this.inputActions = new Map();
        
        // Asset management
        this.sceneAssets = new Map();
        this.assetManifest = null;
        
        // Initialize UI system if enabled
        if (this.config.enableUI) {
            this._initializeUISystem();
        }
        
        // Track this scene in memory leak detector if available
        if (this.engine.memoryLeakDetector) {
            this.engine.memoryLeakDetector.trackObject(this, 'Scene', this.constructor.name);
        }
    }

    /**
     * Initialize the UI system for this scene
     * @private
     */
    _initializeUISystem() {
        // Create scene-specific UI manager
        this.uiManager = new UIManager({
            theme: this.config.uiTheme,
            canvas: this.renderingEngine?.canvas,
            context: this.renderingEngine?.context,
            inputManager: this.inputManager,
            eventBus: this.eventBus,
            ...this.config.uiConfig
        });
        
        // Create fluent UI builder
        this.ui = new UIBuilder(this.uiManager);
        
        // Create form validator
        this.formValidator = new FormValidator({
            onValidation: (result) => this.onFormValidation?.(result),
            onSubmit: (values, validator) => this.onFormSubmit?.(values, validator)
        });
        
        // Set up UI event handling
        this._setupUIEventHandling();
        
        // Add UI manager to managed objects for cleanup
        this.addManagedObject(this.uiManager, () => this.uiManager.destroy());
    }

    /**
     * Set up UI event handling integration
     * @private
     */
    _setupUIEventHandling() {
        if (!this.uiManager) return;
        
        // Integrate with input manager for UI events
        if (this.inputManager) {
            // Mouse events
            this.addEventListener(this.renderingEngine?.canvas || document, 'mousedown', (e) => {
                this.uiManager.handleMouseDown(e);
            });
            
            this.addEventListener(this.renderingEngine?.canvas || document, 'mouseup', (e) => {
                this.uiManager.handleMouseUp(e);
            });
            
            this.addEventListener(this.renderingEngine?.canvas || document, 'mousemove', (e) => {
                this.uiManager.handleMouseMove(e);
            });
            
            this.addEventListener(this.renderingEngine?.canvas || document, 'wheel', (e) => {
                this.uiManager.handleWheel(e);
            });
            
            // Keyboard events
            this.addEventListener(document, 'keydown', (e) => {
                this.uiManager.handleKeyDown(e);
            });
            
            this.addEventListener(document, 'keyup', (e) => {
                this.uiManager.handleKeyUp(e);
            });
            
            // Touch events for mobile support
            this.addEventListener(this.renderingEngine?.canvas || document, 'touchstart', (e) => {
                this.uiManager.handleTouchStart(e);
            });
            
            this.addEventListener(this.renderingEngine?.canvas || document, 'touchend', (e) => {
                this.uiManager.handleTouchEnd(e);
            });
            
            this.addEventListener(this.renderingEngine?.canvas || document, 'touchmove', (e) => {
                this.uiManager.handleTouchMove(e);
            });
        }
        
        // Handle window resize for responsive UI
        this.addEventListener(window, 'resize', () => {
            this.uiManager.handleResize();
        });
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

    // UI Convenience Methods

    /**
     * Create a UI component and add it to the scene
     * @param {string} name - Component name for later reference
     * @param {string} type - Component type ('button', 'label', 'input', etc.)
     * @param {Object} config - Component configuration
     * @returns {UIComponent} Created component
     */
    createUIComponent(name, type, config = {}) {
        if (!this.uiManager) {
            console.warn('UI system not enabled for this scene');
            return null;
        }
        
        const component = this.uiManager.createComponent(type, {
            ...config,
            uiManager: this.uiManager
        });
        
        if (component) {
            this.uiComponents.set(name, component);
            this.uiManager.addComponent(component);
        }
        
        return component;
    }

    /**
     * Get a UI component by name
     * @param {string} name - Component name
     * @returns {UIComponent|null} Component instance or null if not found
     */
    getUIComponent(name) {
        return this.uiComponents.get(name) || null;
    }

    /**
     * Remove a UI component by name
     * @param {string} name - Component name
     * @returns {boolean} True if component was removed
     */
    removeUIComponent(name) {
        const component = this.uiComponents.get(name);
        if (component) {
            this.uiManager.removeComponent(component);
            this.uiComponents.delete(name);
            return true;
        }
        return false;
    }

    /**
     * Create a layout and add it to the scene
     * @param {string} name - Layout name for later reference
     * @param {string} type - Layout type ('flex', 'grid', 'absolute', 'stack')
     * @param {Object} config - Layout configuration
     * @returns {Layout} Created layout
     */
    createUILayout(name, type, config = {}) {
        if (!this.uiManager) {
            console.warn('UI system not enabled for this scene');
            return null;
        }
        
        const layout = this.uiManager.createLayout(type, config);
        if (layout) {
            this.uiLayouts.set(name, layout);
        }
        
        return layout;
    }

    /**
     * Get a UI layout by name
     * @param {string} name - Layout name
     * @returns {Layout|null} Layout instance or null if not found
     */
    getUILayout(name) {
        return this.uiLayouts.get(name) || null;
    }

    /**
     * Show a modal dialog
     * @param {Object} config - Modal configuration
     * @returns {Promise} Promise that resolves when modal is closed
     */
    showModal(config) {
        if (!this.uiManager) {
            console.warn('UI system not enabled for this scene');
            return Promise.resolve();
        }
        
        return this.uiManager.showModal(config);
    }

    /**
     * Show a notification/toast
     * @param {string} message - Notification message
     * @param {Object} config - Notification configuration
     */
    showNotification(message, config = {}) {
        if (!this.uiManager) {
            console.warn('UI system not enabled for this scene');
            return;
        }
        
        this.uiManager.showNotification(message, config);
    }

    /**
     * Create a form with validation
     * @param {string} name - Form name for later reference
     * @param {Object} fields - Field definitions
     * @returns {FormValidator} Form validator instance
     */
    createForm(name, fields) {
        const form = new FormValidator({
            onValidation: (result) => this.onFormValidation?.(name, result),
            onSubmit: (values, validator) => this.onFormSubmit?.(name, values, validator)
        });
        
        // Add fields to the form
        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
            form.addField(fieldName, fieldConfig);
        }
        
        return form;
    }

    /**
     * Set UI theme for this scene
     * @param {string} themeName - Theme name
     */
    setUITheme(themeName) {
        if (this.uiManager) {
            this.uiManager.setTheme(themeName);
        }
    }

    /**
     * Animate a UI component
     * @param {UIComponent} component - Component to animate
     * @param {Object} animation - Animation configuration
     * @returns {Promise} Promise that resolves when animation completes
     */
    animateUI(component, animation) {
        if (!this.uiManager) {
            return Promise.resolve();
        }
        
        const animationPromise = this.uiManager.animateComponent(component, animation);
        this.uiAnimations.add(animationPromise);
        
        animationPromise.finally(() => {
            this.uiAnimations.delete(animationPromise);
        });
        
        return animationPromise;
    }

    /**
     * Build UI using fluent API
     * @returns {UIBuilder} UI builder instance
     */
    buildUI() {
        return this.ui;
    }

    // Event Hooks for UI

    /**
     * Called when form validation occurs
     * @param {string} formName - Name of the form
     * @param {Object} result - Validation result
     */
    onFormValidation(formName, result) {
        // Override in subclasses
    }

    /**
     * Called when form is submitted
     * @param {string} formName - Name of the form
     * @param {Object} values - Form values
     * @param {FormValidator} validator - Form validator instance
     */
    onFormSubmit(formName, values, validator) {
        // Override in subclasses
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
        // Load UI assets if needed
        if (this.uiManager) {
            await this.uiManager.loadAssets();
        }
        
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
     *   this.setupUI();
     * }
     */
    init(...args) {
        // Initialize UI layout if needed
        if (this.uiManager) {
            this.uiManager.initialize();
        }
        
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
        // Show UI components
        if (this.uiManager) {
            this.uiManager.show();
        }
        
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
        // Hide UI components
        if (this.uiManager) {
            this.uiManager.hide();
        }
        
        // Cancel any active UI animations
        for (const animation of this.uiAnimations) {
            if (animation.cancel) {
                animation.cancel();
            }
        }
        this.uiAnimations.clear();
        
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
        // Update UI system
        if (this.uiManager) {
            this.uiManager.update(deltaTime);
        }
        
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
        
        // Render UI system (this is handled automatically by UIManager)
        if (this.uiManager) {
            this.uiManager.render(renderingEngine.context);
        }
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
        // Clean up UI system
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
            this.ui = null;
        }
        
        // Clean up form validator
        if (this.formValidator) {
            this.formValidator = null;
        }
        
        // Clear UI collections
        this.uiComponents.clear();
        this.uiLayouts.clear();
        this.uiAnimations.clear();
        
        // Clean up managed objects
        this.cleanupManagedObjects();
        
        // Clean up event listeners
        this.removeAllEventListeners();
        
        // Clean up timers
        this.clearAllTimers();
        
        // Clear references
        this.managedObjects.clear();
        this.eventListeners.clear();
        this.intervals.clear();
        this.timeouts.clear();
        this.animationFrames.clear();
        
        // Intended to be overridden by subclasses for additional cleanup
    }

    /**
     * Register an object for automatic cleanup when scene is destroyed
     * @param {Object} obj - Object to manage
     * @param {Function} [cleanupFn] - Optional cleanup function
     */
    addManagedObject(obj, cleanupFn = null) {
        this.managedObjects.add({ object: obj, cleanup: cleanupFn });
        
        // Track in memory leak detector
        if (this.engine.memoryLeakDetector && obj.constructor) {
            this.engine.memoryLeakDetector.trackObject(obj, obj.constructor.name);
        }
    }

    /**
     * Add an event listener that will be automatically removed on scene destroy
     * @param {Object} target - Event target
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} [options] - Event options
     */
    addEventListener(target, event, handler, options = {}) {
        target.addEventListener(event, handler, options);
        
        const key = `${target.constructor.name}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ target, event, handler, options });
    }

    /**
     * Set a timeout that will be automatically cleared on scene destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        this.timeouts.add(id);
        return id;
    }

    /**
     * Set an interval that will be automatically cleared on scene destroy
     * @param {Function} callback - Callback function
     * @param {number} interval - Interval in milliseconds
     * @returns {number} Interval ID
     */
    setInterval(callback, interval) {
        const id = setInterval(callback, interval);
        this.intervals.add(id);
        return id;
    }

    /**
     * Request animation frame that will be automatically cancelled on scene destroy
     * @param {Function} callback - Callback function
     * @returns {number} Animation frame ID
     */
    requestAnimationFrame(callback) {
        const id = requestAnimationFrame(callback);
        this.animationFrames.add(id);
        return id;
    }

    /**
     * Clean up all managed objects
     * @private
     */
    cleanupManagedObjects() {
        for (const managed of this.managedObjects) {
            try {
                if (managed.cleanup && typeof managed.cleanup === 'function') {
                    managed.cleanup();
                } else if (managed.object && typeof managed.object.destroy === 'function') {
                    managed.object.destroy();
                }
            } catch (error) {
                console.warn('Error cleaning up managed object:', error);
            }
        }
    }

    /**
     * Remove all registered event listeners
     * @private
     */
    removeAllEventListeners() {
        for (const [key, listeners] of this.eventListeners) {
            for (const listener of listeners) {
                try {
                    listener.target.removeEventListener(listener.event, listener.handler, listener.options);
                } catch (error) {
                    console.warn('Error removing event listener:', error);
                }
            }
        }
    }

    /**
     * Clear all timers and animation frames
     * @private
     */
    clearAllTimers() {
        // Clear timeouts
        for (const id of this.timeouts) {
            clearTimeout(id);
        }
        
        // Clear intervals
        for (const id of this.intervals) {
            clearInterval(id);
        }
        
        // Cancel animation frames
        for (const id of this.animationFrames) {
            cancelAnimationFrame(id);
        }
    }

    /**
     * Setup enhanced systems for boilerplate reduction
     * @private
     */
    async _setupEnhancedSystems() {
        try {
            // Dynamic imports to avoid circular dependencies
            if (this.config.enableAutoWiring) {
                const { AutoWiring } = await import('../ui/AutoWiring.js');
                this.autoWiring = new AutoWiring(this.uiManager);
                this.autoWiring.registerScene(this);
            }

            if (this.config.enableInputBindings) {
                const { InputBindings } = await import('../input/InputBindings.js');
                this.inputBindings = new InputBindings(this.inputManager);
            }

            if (this.config.enablePerformanceMonitoring) {
                const { PerformanceMonitor, PerformanceBudget } = await import('../performance/PerformanceMonitor.js');
                this.performanceMonitor = new PerformanceMonitor(this.engine);
                this.performanceBudget = new PerformanceBudget();
            }
        } catch (error) {
            console.warn('Failed to load enhanced systems:', error);
        }
    }

    // ===== ENHANCED LIFECYCLE METHODS =====

    /**
     * Enhanced init with automatic asset loading and system setup
     */
    async init() {
        this.state = 'initializing';
        this.runHooks('beforeInit');

        // Auto-discover and load scene assets
        if (this.config.enableAutoAssets) {
            await this._autoLoadAssets();
        }

        // Setup performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.start({
                autoOptimize: this.config.autoOptimize || false
            });
        }

        // Setup input bindings
        if (this.inputBindings) {
            this._setupInputBindings();
        }

        // Initialize UI system
        if (this.config.enableUI) {
            this._initializeUISystem();
        }

        this.state = 'initialized';
        this.runHooks('afterInit');
    }

    /**
     * Enhanced update with performance monitoring
     */
    update(deltaTime) {
        if (this.state !== 'active') return;

        this.runHooks('beforeUpdate', deltaTime);

        // Update performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.update(deltaTime);
        }

        // Update UI system
        if (this.uiManager) {
            this.uiManager.update(deltaTime);
        }

        // Update timers
        this._updateTimers(deltaTime);

        // Update animations
        this._updateAnimations(deltaTime);

        this.runHooks('afterUpdate', deltaTime);
    }

    /**
     * Enhanced render with UI rendering
     */
    render(context) {
        this.runHooks('beforeRender', context);

        // Render UI
        if (this.uiManager) {
            this.uiManager.render(context);
        }

        this.runHooks('afterRender', context);
    }

    /**
     * Enhanced cleanup with automatic resource management
     */
    destroy() {
        this.state = 'destroying';
        this.runHooks('beforeDestroy');

        // Stop performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }

        // Clear input bindings
        if (this.inputBindings) {
            this.inputBindings.clear();
        }

        // Clear timers
        this._clearTimers();

        // Clear animations
        this._clearAnimations();

        // Cleanup UI system
        if (this.uiManager) {
            this.uiManager.destroy();
        }

        // Unload scene assets
        this._unloadSceneAssets();

        this.state = 'destroyed';
        this.runHooks('afterDestroy');
    }

    /**
     * Create a scene with pre-configured UI
     * @param {Object} engine - Engine instance
     * @param {Object} config - Scene configuration
     * @returns {Scene} Configured scene instance
     */
    static withUI(engine, config = {}) {
        return new Scene(engine, {
            enableUI: true,
            ...config
        });
    }

    /**
     * Create a scene without UI system
     * @param {Object} engine - Engine instance
     * @param {Object} config - Scene configuration
     * @returns {Scene} Scene instance without UI
     */
    static withoutUI(engine, config = {}) {
        return new Scene(engine, {
            enableUI: false,
            ...config
        });
    }

    // ===== ENHANCED UTILITY METHODS =====

    /**
     * Quick UI component creation with auto-wiring
     */
    quickButton(text, options = {}) {
        const button = this.ui.button(text, options);
        if (this.autoWiring) {
            this.autoWiring.wireComponent(button.build());
        }
        return button;
    }

    quickInput(placeholder, options = {}) {
        const input = this.ui.input(placeholder, options);
        if (this.autoWiring) {
            this.autoWiring.wireComponent(input.build());
        }
        return input;
    }

    quickModal(title, content, options = {}) {
        const modal = this.ui.modal(title, options);
        if (typeof content === 'string') {
            modal.content(content);
        } else if (typeof content === 'function') {
            content(modal);
        }
        return modal;
    }

    /**
     * Create a complete form with validation
     */
    createForm(fields, options = {}) {
        const form = this.ui.container()
            .layout('flex', { direction: 'column', gap: 10 });

        const formData = {};
        const validationRules = {};

        fields.forEach(field => {
            const { name, label, type = 'text', required = false, validation = {} } = field;
            
            // Create form field
            this.ui.formField(label, type, {
                name,
                required,
                ...field.options
            });

            // Setup validation
            if (required || Object.keys(validation).length > 0) {
                validationRules[name] = {
                    required,
                    ...validation
                };
            }
        });

        // Add submit button
        const submitButton = this.ui.button(options.submitText || 'Submit')
            .variant('primary')
            .onClick(() => {
                const values = this._collectFormValues(form);
                const isValid = this.formValidator.validate(values, validationRules);
                
                if (isValid) {
                    this.runHooks('formSubmit', values);
                    if (options.onSubmit) {
                        options.onSubmit(values);
                    }
                } else {
                    this.runHooks('formValidationFailed', values);
                }
            });

        return form.build();
    }

    /**
     * Bind input keys with automatic context management
     */
    bindKeys(keyMap, context = null) {
        if (!this.inputBindings) return;

        if (context) {
            this.inputBindings.pushContext(context);
        }

        this.inputBindings.bindMap(keyMap);
        return this;
    }

    /**
     * Bind game-specific input controls
     */
    bindGameControls(gameType = 'platformer') {
        if (!this.inputBindings) return;

        this.inputBindings.bindGameType(gameType);
        return this;
    }

    /**
     * Bind UI navigation controls
     */  
    bindUINavigation(handlers = {}) {
        if (!this.inputBindings) return;

        this.inputBindings.bindUINavigation(handlers);
        return this;
    }

    /**
     * Load assets with automatic discovery
     */
    async loadAssets(manifest = null) {
        if (manifest) {
            this.assetManifest = manifest;
        }

        const sceneName = this.constructor.name.replace('Scene', '').toLowerCase();
        const assets = await this.assetManager.loadSceneAssets(sceneName, this.assetManifest);
        
        // Store loaded assets
        Object.entries(assets).forEach(([name, asset]) => {
            this.sceneAssets.set(name, asset);
        });

        this.runHooks('assetsLoaded', assets);
        return assets;
    }

    /**
     * Get a loaded asset
     */
    getAsset(name) {
        return this.sceneAssets.get(name) || this.assetManager.get(name);
    }

    /**
     * Add lifecycle hook
     */
    addHook(event, handler) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event).push(handler);
        return this;
    }

    /**
     * Run lifecycle hooks
     */
    runHooks(event, ...args) {
        if (this.hooks.has(event)) {
            this.hooks.get(event).forEach(handler => {
                try {
                    handler.call(this, ...args);
                } catch (error) {
                    console.error(`Hook error in ${event}:`, error);
                }
            });
        }
        return this;
    }

    /**
     * Create a timer
     */
    createTimer(name, duration, callback, options = {}) {
        const timer = {
            name,
            duration,
            callback,
            elapsed: 0,
            repeat: options.repeat || false,
            repeatCount: options.repeatCount || -1,
            currentRepeats: 0,
            paused: false,
            ...options
        };

        this.timers.set(name, timer);
        return timer;
    }

    /**
     * Create an animation
     */
    createAnimation(name, target, properties, duration, options = {}) {
        const animation = {
            name,
            target,
            properties,
            duration,
            elapsed: 0,
            startValues: {},
            endValues: properties,
            easing: options.easing || 'linear',
            callback: options.callback,
            paused: false
        };

        // Store start values
        Object.keys(properties).forEach(prop => {
            animation.startValues[prop] = target[prop];
        });

        this.animations.set(name, animation);
        return animation;
    }

    /**
     * Data binding helper
     */
    bindData(path, component, property = 'text') {
        const value = this._getNestedValue(this.data, path);
        if (value !== undefined) {
            component[property] = value;
        }
        
        // Setup reactive updates
        this._watchData(path, (newValue) => {
            component[property] = newValue;
        });
        
        return this;
    }

    /**
     * Update data with reactive notifications
     */
    updateData(path, value) {
        this._setNestedValue(this.data, path, value);
        this._notifyDataChange(path, value);
        return this;
    }

    /**
     * Show loading screen
     */
    showLoading(message = 'Loading...', options = {}) {
        const loading = this.ui.loadingScreen(message, options);
        this.runHooks('loadingShown', loading);
        return loading;
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        // Implementation would depend on how loading screens are managed
        this.runHooks('loadingHidden');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = this.ui.dialog(message, {
            type,
            autoClose: duration > 0,
            duration
        });
        
        this.runHooks('notificationShown', notification);
        return notification;
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        return this.performanceMonitor ? this.performanceMonitor.getSnapshot() : null;
    }

    /**
     * Enable performance overlay
     */
    showPerformanceOverlay() {
        if (this.performanceMonitor) {
            return this.performanceMonitor.createOverlay();
        }
        return null;
    }

    // ===== PRIVATE HELPER METHODS =====

    async _autoLoadAssets() {
        const sceneName = this.constructor.name.replace('Scene', '').toLowerCase();
        const assets = await this.assetManager.discoverAssets(`./assets/scenes/${sceneName}/`);
        
        if (assets && (assets.images.length || assets.audio.length || assets.data.length)) {
            await this.loadAssets(assets);
        }
    }

    _setupInputBindings() {
        // Setup default input context
        this.inputBindings.pushContext(`scene_${this.constructor.name}`);
        
        // Auto-bind common scene controls
        this.inputBindings.bindMap({
            'Escape': () => this.onEscape?.(),
            'F1': () => this.onHelp?.(),
            'F3': () => this.onToggleDebug?.(),
            'F11': () => this.onToggleFullscreen?.()
        });
    }

    _updateTimers(deltaTime) {
        for (const [name, timer] of this.timers.entries()) {
            if (timer.paused) continue;
            
            timer.elapsed += deltaTime;
            
            if (timer.elapsed >= timer.duration) {
                timer.callback();
                
                if (timer.repeat && (timer.repeatCount === -1 || timer.currentRepeats < timer.repeatCount)) {
                    timer.elapsed = 0;
                    timer.currentRepeats++;
                } else {
                    this.timers.delete(name);
                }
            }
        }
    }

    _updateAnimations(deltaTime) {
        for (const [name, anim] of this.animations.entries()) {
            if (anim.paused) continue;
            
            anim.elapsed += deltaTime;
            const progress = Math.min(anim.elapsed / anim.duration, 1);
            
            // Apply easing
            const easedProgress = this._applyEasing(progress, anim.easing);
            
            // Update properties
            Object.keys(anim.properties).forEach(prop => {
                const start = anim.startValues[prop];
                const end = anim.endValues[prop];
                anim.target[prop] = start + (end - start) * easedProgress;
            });
            
            if (progress >= 1) {
                if (anim.callback) {
                    anim.callback();
                }
                this.animations.delete(name);
            }
        }
    }

    _clearTimers() {
        this.timers.clear();
    }

    _clearAnimations() {
        this.animations.clear();
    }

    _unloadSceneAssets() {
        const sceneName = this.constructor.name.replace('Scene', '').toLowerCase();
        this.assetManager.unloadSceneAssets?.(sceneName);
        this.sceneAssets.clear();
    }

    _collectFormValues(form) {
        // Implementation would collect form values from UI components
        return {};
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => o && o[k], obj);
    }

    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        target[lastKey] = value;
    }

    _watchData(path, callback) {
        // Simple data watching implementation
        if (!this._dataWatchers) {
            this._dataWatchers = new Map();
        }
        
        if (!this._dataWatchers.has(path)) {
            this._dataWatchers.set(path, []);
        }
        
        this._dataWatchers.get(path).push(callback);
    }

    _notifyDataChange(path, value) {
        if (this._dataWatchers && this._dataWatchers.has(path)) {
            this._dataWatchers.get(path).forEach(callback => callback(value));
        }
    }

    _applyEasing(progress, easing) {
        switch (easing) {
            case 'easeIn':
                return progress * progress;
            case 'easeOut':
                return 1 - (1 - progress) * (1 - progress);
            case 'easeInOut':
                return progress < 0.5 ? 
                    2 * progress * progress : 
                    1 - Math.pow(-2 * progress + 2, 2) / 2;
            default:
                return progress;
        }
    }
}

export default Scene;
