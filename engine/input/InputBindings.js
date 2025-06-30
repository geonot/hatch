/**
 * @file InputBindings.js
 * @description Simplified input handling with declarative bindings and context-aware management
 */

/**
 * @class InputBindings
 * @classdesc Provides declarative input binding with context management and smart defaults
 */
export class InputBindings {
    constructor(inputManager) {
        this.inputManager = inputManager;
        this.bindings = new Map();
        this.contexts = new Map();
        this.currentContext = 'global';
        this.contextStack = ['global'];
        this.actionMap = new Map();
        this.comboMap = new Map();
        this.repeatMap = new Map();
        
        // Setup default contexts
        this._setupDefaultContexts();
    }

    /**
     * Bind a key to an action with context awareness
     * @param {string} key - Key to bind
     * @param {string|Function} action - Action name or function
     * @param {Object} options - Binding options
     * @returns {InputBindings} This instance for chaining
     */
    bind(key, action, options = {}) {
        const {
            context = this.currentContext,
            preventDefault = true,
            repeat = false,
            combo = false,
            description = ''
        } = options;

        const binding = {
            key: key.toLowerCase(),
            action,
            context,
            preventDefault,
            repeat,
            combo,
            description,
            enabled: true
        };

        // Store binding
        const bindingKey = `${context}:${key.toLowerCase()}`;
        this.bindings.set(bindingKey, binding);

        // Register with input manager
        this._registerBinding(binding);

        return this;
    }

    /**
     * Bind multiple keys at once using an object
     * @param {Object} keyMap - Object mapping keys to actions
     * @param {Object} options - Default options for all bindings
     * @returns {InputBindings} This instance for chaining
     */
    bindMap(keyMap, options = {}) {
        Object.entries(keyMap).forEach(([key, action]) => {
            this.bind(key, action, options);
        });
        return this;
    }

    /**
     * Create a game-specific binding set
     * @param {string} gameType - Type of game (platformer, shooter, puzzle, etc.)
     * @returns {InputBindings} This instance for chaining
     */
    bindGameType(gameType) {
        const gameBindings = this._getGameTypeBindings(gameType);
        return this.bindMap(gameBindings.keys, { context: 'game' });
    }

    /**
     * Bind standard UI navigation keys
     * @param {Object} handlers - Object with handler methods
     * @returns {InputBindings} This instance for chaining
     */
    bindUINavigation(handlers = {}) {
        const uiBindings = {
            'Tab': handlers.nextElement || 'focusNext',
            'Shift+Tab': handlers.prevElement || 'focusPrev',
            'Enter': handlers.activate || 'activate',
            'Space': handlers.activate || 'activate',
            'Escape': handlers.cancel || 'cancel',
            'ArrowUp': handlers.up || 'navigateUp',
            'ArrowDown': handlers.down || 'navigateDown',
            'ArrowLeft': handlers.left || 'navigateLeft',
            'ArrowRight': handlers.right || 'navigateRight'
        };

        return this.bindMap(uiBindings, { context: 'ui' });
    }

    /**
     * Bind action sequences (key combos)
     * @param {Array} sequence - Array of keys in sequence
     * @param {string|Function} action - Action to trigger
     * @param {Object} options - Binding options
     * @returns {InputBindings} This instance for chaining
     */
    bindSequence(sequence, action, options = {}) {
        const sequenceKey = sequence.join('+');
        const binding = {
            sequence,
            action,
            timeout: options.timeout || 1000,
            context: options.context || this.currentContext,
            description: options.description || `Sequence: ${sequenceKey}`
        };

        this.comboMap.set(sequenceKey, binding);
        return this;
    }

    /**
     * Bind an action that repeats while key is held
     * @param {string} key - Key to bind
     * @param {string|Function} action - Action to repeat
     * @param {Object} options - Repeat options
     * @returns {InputBindings} This instance for chaining
     */
    bindRepeat(key, action, options = {}) {
        const {
            delay = 500,
            interval = 100,
            context = this.currentContext
        } = options;

        const repeatBinding = {
            key: key.toLowerCase(),
            action,
            delay,
            interval,
            context,
            active: false,
            timeout: null,
            intervalId: null
        };

        this.repeatMap.set(`${context}:${key.toLowerCase()}`, repeatBinding);
        this._registerRepeatBinding(repeatBinding);
        return this;
    }

    /**
     * Push a new input context
     * @param {string} context - Context name
     * @returns {InputBindings} This instance for chaining
     */
    pushContext(context) {
        if (!this.contexts.has(context)) {
            this.contexts.set(context, {
                name: context,
                bindings: new Map(),
                enabled: true
            });
        }

        this.contextStack.push(context);
        this.currentContext = context;
        return this;
    }

    /**
     * Pop the current input context
     * @returns {InputBindings} This instance for chaining
     */
    popContext() {
        if (this.contextStack.length > 1) {
            this.contextStack.pop();
            this.currentContext = this.contextStack[this.contextStack.length - 1];
        }
        return this;
    }

    /**
     * Set the current input context
     * @param {string} context - Context name
     * @returns {InputBindings} This instance for chaining
     */
    setContext(context) {
        this.currentContext = context;
        return this;
    }

    /**
     * Enable or disable a context
     * @param {string} context - Context name
     * @param {boolean} enabled - Whether to enable the context
     */
    setContextEnabled(context, enabled) {
        if (this.contexts.has(context)) {
            this.contexts.get(context).enabled = enabled;
        }
    }

    /**
     * Remove a binding
     * @param {string} key - Key to unbind
     * @param {string} context - Context to unbind from
     */
    unbind(key, context = this.currentContext) {
        const bindingKey = `${context}:${key.toLowerCase()}`;
        const binding = this.bindings.get(bindingKey);
        
        if (binding) {
            this._unregisterBinding(binding);
            this.bindings.delete(bindingKey);
        }
    }

    /**
     * Clear all bindings for a context
     * @param {string} context - Context to clear
     */
    clearContext(context) {
        const bindingsToRemove = [];
        
        for (const [key, binding] of this.bindings.entries()) {
            if (binding.context === context) {
                bindingsToRemove.push(key);
                this._unregisterBinding(binding);
            }
        }
        
        bindingsToRemove.forEach(key => this.bindings.delete(key));
    }

    /**
     * Get all bindings for a context
     * @param {string} context - Context name
     * @returns {Array} Array of bindings
     */
    getBindings(context = this.currentContext) {
        return Array.from(this.bindings.values())
            .filter(binding => binding.context === context);
    }

    /**
     * Create a help display for current bindings
     * @param {string} context - Context to show help for
     * @returns {string} Formatted help text
     */
    getHelp(context = this.currentContext) {
        const bindings = this.getBindings(context);
        let help = `\n=== ${context.toUpperCase()} CONTROLS ===\n`;
        
        bindings.forEach(binding => {
            const action = typeof binding.action === 'string' ? binding.action : 'Custom Action';
            const description = binding.description || action;
            help += `${binding.key.toUpperCase()}: ${description}\n`;
        });
        
        return help;
    }

    /**
     * Save current bindings to localStorage
     * @param {string} key - Storage key
     */
    saveBindings(key = 'hatch_input_bindings') {
        const bindingsData = {
            bindings: Array.from(this.bindings.entries()),
            contexts: Array.from(this.contexts.entries()),
            version: '1.0.0'
        };
        
        localStorage.setItem(key, JSON.stringify(bindingsData));
    }

    /**
     * Load bindings from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if loaded successfully
     */
    loadBindings(key = 'hatch_input_bindings') {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return false;
            
            const bindingsData = JSON.parse(stored);
            
            // Clear existing bindings
            this.clear();
            
            // Restore bindings
            bindingsData.bindings.forEach(([bindingKey, binding]) => {
                this.bindings.set(bindingKey, binding);
                this._registerBinding(binding);
            });
            
            // Restore contexts
            bindingsData.contexts.forEach(([contextName, context]) => {
                this.contexts.set(contextName, context);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to load input bindings:', error);
            return false;
        }
    }

    /**
     * Clear all bindings
     */
    clear() {
        // Unregister all bindings
        for (const binding of this.bindings.values()) {
            this._unregisterBinding(binding);
        }
        
        this.bindings.clear();
        this.comboMap.clear();
        this.repeatMap.clear();
        this.contexts.clear();
        this.contextStack = ['global'];
        this.currentContext = 'global';
        
        this._setupDefaultContexts();
    }

    // ===== PRIVATE METHODS =====

    _setupDefaultContexts() {
        this.contexts.set('global', { name: 'global', enabled: true });
        this.contexts.set('ui', { name: 'ui', enabled: true });
        this.contexts.set('game', { name: 'game', enabled: true });
        this.contexts.set('menu', { name: 'menu', enabled: true });
        this.contexts.set('dialog', { name: 'dialog', enabled: true });
    }

    _registerBinding(binding) {
        const handler = (event) => {
            // Check if context is enabled
            const context = this.contexts.get(binding.context);
            if (!context || !context.enabled) return;
            
            // Check if this context is active
            if (!this.contextStack.includes(binding.context) && binding.context !== 'global') {
                return;
            }

            if (binding.preventDefault) {
                event.preventDefault();
            }

            // Execute action
            this._executeAction(binding.action, event, binding);
        };

        // Register with input manager
        this.inputManager.on(binding.key, handler, {
            repeat: binding.repeat,
            context: binding.context
        });
    }

    _unregisterBinding(binding) {
        // Remove from input manager
        this.inputManager.off(binding.key, binding.context);
    }

    _registerRepeatBinding(repeatBinding) {
        // Register keydown handler
        this.inputManager.on(repeatBinding.key, (event) => {
            if (repeatBinding.active) return;
            
            repeatBinding.active = true;
            
            // Initial delay
            repeatBinding.timeout = setTimeout(() => {
                // Start repeating
                repeatBinding.intervalId = setInterval(() => {
                    if (repeatBinding.active) {
                        this._executeAction(repeatBinding.action, event, repeatBinding);
                    }
                }, repeatBinding.interval);
            }, repeatBinding.delay);
            
        }, { type: 'keydown', context: repeatBinding.context });

        // Register keyup handler
        this.inputManager.on(repeatBinding.key, () => {
            repeatBinding.active = false;
            
            if (repeatBinding.timeout) {
                clearTimeout(repeatBinding.timeout);
                repeatBinding.timeout = null;
            }
            
            if (repeatBinding.intervalId) {
                clearInterval(repeatBinding.intervalId);
                repeatBinding.intervalId = null;
            }
        }, { type: 'keyup', context: repeatBinding.context });
    }

    _executeAction(action, event, binding) {
        if (typeof action === 'function') {
            action(event, binding);
        } else if (typeof action === 'string') {
            // Try to find action in action map
            if (this.actionMap.has(action)) {
                this.actionMap.get(action)(event, binding);
            } else {
                // Dispatch custom event
                document.dispatchEvent(new CustomEvent(`hatch:${action}`, {
                    detail: { event, binding }
                }));
            }
        }
    }

    _getGameTypeBindings(gameType) {
        const gameBindings = {
            platformer: {
                keys: {
                    'ArrowLeft': 'moveLeft',
                    'ArrowRight': 'moveRight',
                    'ArrowUp': 'jump',
                    'ArrowDown': 'duck',
                    'Space': 'jump',
                    'X': 'run',
                    'Z': 'action',
                    'C': 'attack'
                }
            },
            shooter: {
                keys: {
                    'W': 'moveUp',
                    'A': 'moveLeft',
                    'S': 'moveDown',
                    'D': 'moveRight',
                    'Space': 'shoot',
                    'Shift': 'boost',
                    'R': 'reload',
                    'E': 'interact'
                }
            },
            puzzle: {
                keys: {
                    'ArrowUp': 'moveUp',
                    'ArrowDown': 'moveDown',
                    'ArrowLeft': 'moveLeft',
                    'ArrowRight': 'moveRight',
                    'Space': 'select',
                    'Z': 'undo',
                    'R': 'reset',
                    'H': 'hint'
                }
            },
            rpg: {
                keys: {
                    'W': 'moveUp',
                    'A': 'moveLeft',
                    'S': 'moveDown',
                    'D': 'moveRight',
                    'E': 'interact',
                    'I': 'inventory',
                    'M': 'map',
                    'Tab': 'menu',
                    'Space': 'attack',
                    'Shift': 'run'
                }
            },
            racing: {
                keys: {
                    'ArrowUp': 'accelerate',
                    'ArrowDown': 'brake',
                    'ArrowLeft': 'turnLeft',
                    'ArrowRight': 'turnRight',
                    'Space': 'handbrake',
                    'Shift': 'boost',
                    'R': 'reset',
                    'C': 'camera'
                }
            }
        };

        return gameBindings[gameType] || gameBindings.platformer;
    }
}

/**
 * @class InputPresets
 * @classdesc Provides common input presets for different game scenarios
 */
export class InputPresets {
    static getMenuPreset() {
        return {
            'ArrowUp': 'menuUp',
            'ArrowDown': 'menuDown',
            'ArrowLeft': 'menuLeft',
            'ArrowRight': 'menuRight',
            'Enter': 'menuSelect',
            'Space': 'menuSelect',
            'Escape': 'menuBack',
            'Backspace': 'menuBack'
        };
    }

    static getDialogPreset() {
        return {
            'Space': 'dialogNext',
            'Enter': 'dialogNext',
            'Escape': 'dialogSkip',
            'Tab': 'dialogSkip'
        };
    }

    static getUIPreset() {
        return {
            'Tab': 'focusNext',
            'Shift+Tab': 'focusPrev',
            'Enter': 'activate',
            'Space': 'activate',
            'Escape': 'cancel',
            'F1': 'help'
        };
    }

    static getDebugPreset() {
        return {
            'F3': 'toggleDebug',
            'F4': 'togglePerformance',
            'F5': 'reload',
            'F11': 'toggleFullscreen',
            'Ctrl+Shift+I': 'openDevTools',
            '`': 'toggleConsole'
        };
    }

    static getCameraPreset() {
        return {
            'Q': 'cameraUp',
            'E': 'cameraDown',
            'W': 'cameraForward',
            'S': 'cameraBack',
            'A': 'cameraLeft',
            'D': 'cameraRight',
            'R': 'cameraReset',
            'Mouse': 'cameraLook'
        };
    }
}

/**
 * @class InputAction
 * @classdesc Represents a bindable input action with metadata
 */
export class InputAction {
    constructor(name, description = '', defaultKeys = []) {
        this.name = name;
        this.description = description;
        this.defaultKeys = defaultKeys;
        this.currentKeys = [...defaultKeys];
        this.enabled = true;
        this.category = 'general';
    }

    addKey(key) {
        if (!this.currentKeys.includes(key)) {
            this.currentKeys.push(key);
        }
        return this;
    }

    removeKey(key) {
        this.currentKeys = this.currentKeys.filter(k => k !== key);
        return this;
    }

    reset() {
        this.currentKeys = [...this.defaultKeys];
        return this;
    }

    setCategory(category) {
        this.category = category;
        return this;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        return this;
    }
}

/**
 * @class InputActionManager
 * @classdesc Manages input actions with customization support
 */
export class InputActionManager {
    constructor() {
        this.actions = new Map();
        this.categories = new Set();
        this.bindings = null;
    }

    /**
     * Register an input action
     * @param {InputAction} action - Action to register
     */
    registerAction(action) {
        this.actions.set(action.name, action);
        this.categories.add(action.category);
    }

    /**
     * Create and register a new action
     * @param {string} name - Action name
     * @param {string} description - Action description
     * @param {Array} defaultKeys - Default key bindings
     * @param {string} category - Action category
     * @returns {InputAction} Created action
     */
    createAction(name, description, defaultKeys, category = 'general') {
        const action = new InputAction(name, description, defaultKeys);
        action.setCategory(category);
        this.registerAction(action);
        return action;
    }

    /**
     * Get an action by name
     * @param {string} name - Action name
     * @returns {InputAction} The action
     */
    getAction(name) {
        return this.actions.get(name);
    }

    /**
     * Get all actions in a category
     * @param {string} category - Category name
     * @returns {Array} Actions in category
     */
    getActionsInCategory(category) {
        return Array.from(this.actions.values())
            .filter(action => action.category === category);
    }

    /**
     * Apply actions to input bindings
     * @param {InputBindings} bindings - Input bindings instance
     */
    applyToBindings(bindings) {
        this.bindings = bindings;
        
        for (const action of this.actions.values()) {
            if (action.enabled) {
                action.currentKeys.forEach(key => {
                    bindings.bind(key, action.name, {
                        description: action.description
                    });
                });
            }
        }
    }

    /**
     * Save action customizations
     */
    saveCustomizations() {
        const customizations = {};
        
        for (const [name, action] of this.actions.entries()) {
            if (JSON.stringify(action.currentKeys) !== JSON.stringify(action.defaultKeys)) {
                customizations[name] = {
                    currentKeys: action.currentKeys,
                    enabled: action.enabled
                };
            }
        }
        
        localStorage.setItem('hatch_input_customizations', JSON.stringify(customizations));
    }

    /**
     * Load action customizations
     */
    loadCustomizations() {
        try {
            const stored = localStorage.getItem('hatch_input_customizations');
            if (!stored) return;
            
            const customizations = JSON.parse(stored);
            
            for (const [name, custom] of Object.entries(customizations)) {
                const action = this.actions.get(name);
                if (action) {
                    action.currentKeys = custom.currentKeys;
                    action.enabled = custom.enabled;
                }
            }
        } catch (error) {
            console.error('Failed to load input customizations:', error);
        }
    }
}
