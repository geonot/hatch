/**
 * @file AutoWiring.js
 * @description Automatic event binding system based on naming conventions
 */

/**
 * @class AutoWiring
 * @classdesc Automatically wires UI component events to scene methods based on naming conventions
 */
export class AutoWiring {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.conventions = new Map();
        this.globalHandlers = new Map();
        
        // Setup default naming conventions
        this._setupDefaultConventions();
    }

    /**
     * Register a scene for auto-wiring
     * @param {Object} scene - The scene object with event handler methods
     */
    registerScene(scene) {
        this.currentScene = scene;
        
        // Auto-discover handler methods
        this._discoverHandlers(scene);
        
        // Wire existing components
        this._wireExistingComponents();
    }

    /**
     * Wire a component automatically based on its properties
     * @param {Object} component - The UI component to wire
     */
    wireComponent(component) {
        if (!this.currentScene) return;

        // Wire based on component ID
        if (component.id) {
            this._wireById(component);
        }

        // Wire based on component text/content
        if (component.text) {
            this._wireByText(component);
        }

        // Wire based on component type and context
        this._wireByType(component);

        // Wire based on data attributes
        this._wireByDataAttributes(component);
    }

    /**
     * Add a custom wiring convention
     * @param {string} pattern - RegExp pattern to match component identifiers
     * @param {Function} handler - Function to generate handler method name
     */
    addConvention(pattern, handler) {
        this.conventions.set(new RegExp(pattern, 'i'), handler);
    }

    /**
     * Add a global event handler
     * @param {string} eventType - The event type to handle
     * @param {Function} handler - The handler function
     */
    addGlobalHandler(eventType, handler) {
        this.globalHandlers.set(eventType, handler);
    }

    /**
     * Wire components with form validation
     * @param {Object} formContainer - Container with form elements
     * @param {Object} validationRules - Validation rules for form fields
     */
    wireForm(formContainer, validationRules = {}) {
        const inputs = this._findInputs(formContainer);
        const submitButton = this._findSubmitButton(formContainer);

        // Wire input validation
        inputs.forEach(input => {
            const fieldName = input.name || input.id || input.placeholder;
            const rules = validationRules[fieldName];

            if (rules) {
                this._wireFieldValidation(input, rules);
            }

            // Auto-wire to scene methods
            this.wireComponent(input);
        });

        // Wire form submission
        if (submitButton) {
            this._wireFormSubmission(submitButton, formContainer, validationRules);
        }
    }

    /**
     * Wire navigation components automatically
     * @param {Array} navigationItems - Array of navigation components
     */
    wireNavigation(navigationItems) {
        navigationItems.forEach(item => {
            if (item.text) {
                const sceneName = this._textToSceneName(item.text);
                const handlerName = `goTo${sceneName}`;
                
                if (this.currentScene[handlerName]) {
                    this.uiManager.addEventListener(item, 'click', 
                        this.currentScene[handlerName].bind(this.currentScene));
                }
            }
        });
    }

    /**
     * Wire data binding automatically
     * @param {Object} component - Component to bind
     * @param {string} dataPath - Path to data property
     */
    wireDataBinding(component, dataPath) {
        if (!this.currentScene.data) return;

        const value = this._getNestedValue(this.currentScene.data, dataPath);
        if (value !== undefined) {
            this._updateComponentData(component, value);
        }

        // Setup two-way binding for inputs
        if (component.type === 'input') {
            this.uiManager.addEventListener(component, 'change', (event) => {
                this._setNestedValue(this.currentScene.data, dataPath, event.target.value);
            });
        }
    }

    // ===== PRIVATE METHODS =====

    _setupDefaultConventions() {
        // Button conventions
        this.addConvention('^(.*) Button$', (match) => `on${match[1].replace(/\s+/g, '')}`);
        this.addConvention('^(Start|Play|Begin)$', () => 'onStart');
        this.addConvention('^(Stop|End|Quit)$', () => 'onStop');
        this.addConvention('^(Save|Submit)$', () => 'onSave');
        this.addConvention('^(Cancel|Close)$', () => 'onCancel');
        this.addConvention('^(Back|Return)$', () => 'onBack');
        this.addConvention('^(Next|Continue)$', () => 'onNext');
        this.addConvention('^(Settings|Options)$', () => 'onSettings');
        this.addConvention('^(Help|About)$', () => 'onHelp');

        // Input conventions
        this.addConvention('^(.*)Input$', (match) => `on${match[1]}Change`);
        this.addConvention('^(.*)Field$', (match) => `on${match[1]}Change`);

        // Navigation conventions
        this.addConvention('^Go to (.*)$', (match) => `goTo${match[1].replace(/\s+/g, '')}`);
        this.addConvention('^(.*)Menu$', (match) => `show${match[1]}Menu`);
    }

    _discoverHandlers(scene) {
        this.discoveredHandlers = {};
        
        // Find all methods that look like event handlers
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(scene))
            .concat(Object.getOwnPropertyNames(scene))
            .filter(name => typeof scene[name] === 'function');

        methods.forEach(method => {
            if (method.startsWith('on') || method.startsWith('handle') || method.startsWith('goTo')) {
                this.discoveredHandlers[method.toLowerCase()] = method;
            }
        });
    }

    _wireExistingComponents() {
        // Wire components that are already created
        const components = this.uiManager.getAllComponents();
        components.forEach(component => {
            this.wireComponent(component);
        });
    }

    _wireById(component) {
        const id = component.id.toLowerCase();
        
        // Try direct ID mapping
        if (this.discoveredHandlers[`on${id}`]) {
            this._bindEvent(component, 'click', this.discoveredHandlers[`on${id}`]);
        }

        // Try ID with event suffix
        if (this.discoveredHandlers[`${id}click`]) {
            this._bindEvent(component, 'click', this.discoveredHandlers[`${id}click`]);
        }
    }

    _wireByText(component) {
        const text = component.text;
        
        // Try conventions
        for (const [pattern, handler] of this.conventions) {
            const match = text.match(pattern);
            if (match) {
                const methodName = handler(match);
                if (this.currentScene[methodName]) {
                    this._bindEvent(component, 'click', methodName);
                    return;
                }
            }
        }

        // Try direct text mapping
        const normalizedText = text.toLowerCase().replace(/\s+/g, '');
        if (this.discoveredHandlers[`on${normalizedText}`]) {
            this._bindEvent(component, 'click', this.discoveredHandlers[`on${normalizedText}`]);
        }
    }

    _wireByType(component) {
        const type = component.type || component.constructor.name.toLowerCase();
        
        // Type-specific wiring
        switch (type) {
            case 'button':
                this._wireButton(component);
                break;
            case 'input':
                this._wireInput(component);
                break;
            case 'modal':
                this._wireModal(component);
                break;
        }
    }

    _wireByDataAttributes(component) {
        if (component.dataset) {
            // Wire data-action attributes
            if (component.dataset.action) {
                const actionMethod = component.dataset.action;
                if (this.currentScene[actionMethod]) {
                    this._bindEvent(component, 'click', actionMethod);
                }
            }

            // Wire data-handler attributes
            Object.keys(component.dataset).forEach(key => {
                if (key.startsWith('on') && this.currentScene[component.dataset[key]]) {
                    const eventType = key.substring(2).toLowerCase();
                    this._bindEvent(component, eventType, component.dataset[key]);
                }
            });
        }
    }

    _wireButton(component) {
        // Auto-wire based on button context
        if (component.variant === 'primary' && !component._wired) {
            // Primary buttons often trigger main actions
            if (this.currentScene.onPrimaryAction) {
                this._bindEvent(component, 'click', 'onPrimaryAction');
            }
        }
    }

    _wireInput(component) {
        // Auto-wire input changes
        const placeholder = component.placeholder || '';
        const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '');
        
        if (this.discoveredHandlers[`on${normalizedPlaceholder}change`]) {
            this._bindEvent(component, 'change', this.discoveredHandlers[`on${normalizedPlaceholder}change`]);
        }

        // Auto-wire validation
        if (component.type === 'email' && this.currentScene.validateEmail) {
            this._bindEvent(component, 'blur', 'validateEmail');
        }
    }

    _wireModal(component) {
        // Auto-wire modal close
        if (this.currentScene.onModalClose) {
            this._bindEvent(component, 'close', 'onModalClose');
        }
    }

    _wireFieldValidation(input, rules) {
        // Real-time validation
        this.uiManager.addEventListener(input, 'input', (event) => {
            const value = event.target.value;
            const isValid = this._validateField(value, rules);
            
            // Update field appearance
            input.classList.toggle('invalid', !isValid);
            
            // Show/hide error message
            this._toggleFieldError(input, !isValid, rules.errorMessage);
        });
    }

    _wireFormSubmission(submitButton, formContainer, validationRules) {
        this.uiManager.addEventListener(submitButton, 'click', (event) => {
            event.preventDefault();
            
            const formData = this._collectFormData(formContainer);
            const isValid = this._validateForm(formData, validationRules);
            
            if (isValid) {
                if (this.currentScene.onFormSubmit) {
                    this.currentScene.onFormSubmit(formData);
                }
            } else {
                if (this.currentScene.onFormValidationFailed) {
                    this.currentScene.onFormValidationFailed(formData);
                }
            }
        });
    }

    _bindEvent(component, eventType, methodName) {
        if (component._wired) return; // Prevent double-wiring
        
        const handler = this.currentScene[methodName];
        if (handler) {
            this.uiManager.addEventListener(component, eventType, handler.bind(this.currentScene));
            component._wired = true;
        }
    }

    _textToSceneName(text) {
        return text.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    }

    _findInputs(container) {
        // Find all input components in container
        return this._findComponentsByType(container, 'input');
    }

    _findSubmitButton(container) {
        // Find submit button in container
        const buttons = this._findComponentsByType(container, 'button');
        return buttons.find(btn => 
            btn.type === 'submit' || 
            btn.text?.toLowerCase().includes('submit') ||
            btn.text?.toLowerCase().includes('save')
        );
    }

    _findComponentsByType(container, type) {
        const components = [];
        
        // Recursively find components of specified type
        const search = (comp) => {
            if (comp.type === type || comp.constructor.name.toLowerCase() === type) {
                components.push(comp);
            }
            if (comp.children) {
                comp.children.forEach(search);
            }
        };
        
        search(container);
        return components;
    }

    _validateField(value, rules) {
        // Simple validation implementation
        if (rules.required && !value) return false;
        if (rules.minLength && value.length < rules.minLength) return false;
        if (rules.maxLength && value.length > rules.maxLength) return false;
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) return false;
        return true;
    }

    _validateForm(formData, validationRules) {
        return Object.keys(validationRules).every(field => {
            const value = formData[field];
            const rules = validationRules[field];
            return this._validateField(value, rules);
        });
    }

    _collectFormData(container) {
        const data = {};
        const inputs = this._findInputs(container);
        
        inputs.forEach(input => {
            const name = input.name || input.id || input.placeholder;
            if (name) {
                data[name] = input.value;
            }
        });
        
        return data;
    }

    _toggleFieldError(input, showError, errorMessage) {
        // Implementation would depend on UI framework
        // This is a placeholder for error display logic
        if (showError && errorMessage) {
            console.warn(`Validation error for ${input.name}: ${errorMessage}`);
        }
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

    _updateComponentData(component, value) {
        if (component.setText) {
            component.setText(String(value));
        } else if (component.value !== undefined) {
            component.value = value;
        }
    }
}

/**
 * @class SmartDefaults
 * @classdesc Provides intelligent defaults for UI components based on context
 */
export class SmartDefaults {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.contextStack = [];
        this.defaultRules = new Map();
        
        this._setupDefaultRules();
    }

    pushContext(context) {
        this.contextStack.push(context);
    }

    popContext() {
        return this.contextStack.pop();
    }

    getCurrentContext() {
        return this.contextStack[this.contextStack.length - 1] || 'default';
    }

    applyDefaults(component, options = {}) {
        const context = this.getCurrentContext();
        const componentType = component.type || component.constructor.name.toLowerCase();
        
        // Apply context-specific defaults
        const contextDefaults = this.defaultRules.get(`${context}.${componentType}`);
        if (contextDefaults) {
            this._applyRules(component, contextDefaults, options);
        }

        // Apply general defaults
        const generalDefaults = this.defaultRules.get(componentType);
        if (generalDefaults) {
            this._applyRules(component, generalDefaults, options);
        }

        // Apply smart positioning
        this._applySmartPositioning(component, context);
    }

    addRule(selector, rules) {
        this.defaultRules.set(selector, rules);
    }

    _setupDefaultRules() {
        // Button defaults
        this.addRule('button', {
            width: 120,
            height: 32,
            backgroundColor: '#007bff',
            textColor: '#ffffff',
            borderRadius: 4,
            padding: '8px 16px'
        });

        // Form context buttons
        this.addRule('form.button', {
            width: 100,
            height: 36,
            margin: '8px 4px'
        });

        // Modal context buttons
        this.addRule('modal.button', {
            width: 80,
            height: 32,
            margin: '0 4px'
        });

        // Input defaults
        this.addRule('input', {
            width: 200,
            height: 32,
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 4,
            backgroundColor: '#ffffff'
        });

        // Label defaults
        this.addRule('label', {
            fontSize: 14,
            textColor: '#333333',
            margin: '4px 0'
        });

        // Container defaults
        this.addRule('container', {
            padding: 16,
            backgroundColor: 'transparent'
        });

        // Modal context containers
        this.addRule('modal.container', {
            padding: 24,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });
    }

    _applyRules(component, rules, options) {
        Object.entries(rules).forEach(([property, value]) => {
            // Don't override explicitly set options
            if (options[property] === undefined) {
                if (component[property] !== undefined) {
                    component[property] = value;
                } else if (component.setProperty) {
                    component.setProperty(property, value);
                }
            }
        });
    }

    _applySmartPositioning(component, context) {
        // Auto-positioning based on context
        if (!component.x && !component.y) {
            switch (context) {
                case 'modal':
                    this._centerInModal(component);
                    break;
                case 'form':
                    this._positionInForm(component);
                    break;
                case 'hud':
                    this._positionInHUD(component);
                    break;
                default:
                    this._positionDefault(component);
                    break;
            }
        }
    }

    _centerInModal(component) {
        // Center component in modal
        const modal = this._findModalContainer();
        if (modal) {
            const modalBounds = modal.getBounds();
            component.x = modalBounds.x + (modalBounds.width - component.width) / 2;
            component.y = modalBounds.y + (modalBounds.height - component.height) / 2;
        }
    }

    _positionInForm(component) {
        // Position component in form layout
        const formContainer = this._findFormContainer();
        if (formContainer && formContainer.layout) {
            // Let the layout system handle positioning
            return;
        }
        
        // Default form positioning
        const siblings = this._getSiblingComponents(component);
        const lastSibling = siblings[siblings.length - 1];
        
        if (lastSibling) {
            component.x = lastSibling.x;
            component.y = lastSibling.y + lastSibling.height + 8;
        }
    }

    _positionInHUD(component) {
        // Position component in HUD
        const hudType = component.hudType || 'topLeft';
        const canvas = this.uiManager.canvas;
        
        switch (hudType) {
            case 'topLeft':
                component.x = 20;
                component.y = 20;
                break;
            case 'topRight':
                component.x = canvas.width - component.width - 20;
                component.y = 20;
                break;
            case 'bottomLeft':
                component.x = 20;
                component.y = canvas.height - component.height - 20;
                break;
            case 'bottomRight':
                component.x = canvas.width - component.width - 20;
                component.y = canvas.height - component.height - 20;
                break;
        }
    }

    _positionDefault(component) {
        // Default positioning with auto-layout
        const siblings = this._getSiblingComponents(component);
        const spacing = 10;
        
        if (siblings.length === 0) {
            component.x = 20;
            component.y = 20;
        } else {
            const lastSibling = siblings[siblings.length - 1];
            component.x = lastSibling.x + lastSibling.width + spacing;
            component.y = lastSibling.y;
            
            // Wrap to next row if needed
            const canvas = this.uiManager.canvas;
            if (component.x + component.width > canvas.width - 20) {
                component.x = 20;
                component.y = lastSibling.y + lastSibling.height + spacing;
            }
        }
    }

    _findModalContainer() {
        return this.uiManager.getActiveModal();
    }

    _findFormContainer() {
        return this.contextStack.find(ctx => ctx.type === 'form');
    }

    _getSiblingComponents(component) {
        const parent = component.parent || this.uiManager.getRootContainer();
        return parent.children ? parent.children.filter(c => c !== component) : [];
    }
}
