import { UIComponent } from './UIComponent.js';
import { UIButton } from './UIButton.js';
import { UILabel } from './UILabel.js';
import { UIContainer } from './UIContainer.js';
import { UIModal } from './UIModal.js';
import { UIProgressBar } from './UIProgressBar.js';

export default class UIManager {
    constructor(engine) {
        this.engine = engine;
        
        // Legacy instruction system
        this.isInstructionsVisible = false;
        this.instructions = [];
        this.instructionsKey = 'KeyH';
        
        // Enhanced UI system
        this.components = new Map(); // All registered components by ID
        this.rootComponents = []; // Top-level components (no parent)
        this.focusedComponent = null;
        this.hoveredComponent = null;
        this.draggedComponent = null;
        
        // UI state management
        this.modalStack = [];
        this.tooltips = new Map();
        this.themes = new Map();
        this.currentTheme = 'default';
        
        // Layout system
        this.layouts = new Map();
        this.responsiveBreakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024
        };
        this.currentBreakpoint = 'desktop';
        
        // Data binding system
        this.dataBindings = new Map();
        this.watchedProperties = new Map();
        
        // Form handling
        this.forms = new Map();
        this.validators = new Map();
        
        // Animation system
        this.animations = new Map();
        this.tweens = [];
        
        this.loadInstructionsFromConfig();
        this.setupThemes();
        this.setupEventListeners();
        this.setupLayoutSystem();
    }

    loadInstructionsFromConfig() {
        const config = this.engine.hatchConfig;
        if (config.instructions && Array.isArray(config.instructions)) {
            this.instructions = config.instructions;
        }
        
        // Allow custom key for showing instructions
        if (config.instructionsKey) {
            this.instructionsKey = config.instructionsKey;
        }
    }

    setupThemes() {
        // Default theme
        this.themes.set('default', {
            colors: {
                primary: '#007bff',
                secondary: '#6c757d',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8',
                light: '#f8f9fa',
                dark: '#343a40',
                background: '#ffffff',
                surface: '#f8f9fa',
                text: '#333333',
                textSecondary: '#666666',
                border: '#dee2e6'
            },
            fonts: {
                primary: 'Arial, sans-serif',
                secondary: 'Georgia, serif',
                monospace: 'Courier New, monospace'
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32
            },
            borderRadius: {
                sm: 2,
                md: 4,
                lg: 8,
                xl: 16
            }
        });
        
        // Dark theme
        this.themes.set('dark', {
            colors: {
                primary: '#0d6efd',
                secondary: '#6c757d',
                success: '#198754',
                warning: '#fd7e14',
                danger: '#dc3545',
                info: '#0dcaf0',
                light: '#495057',
                dark: '#f8f9fa',
                background: '#212529',
                surface: '#343a40',
                text: '#ffffff',
                textSecondary: '#adb5bd',
                border: '#495057'
            },
            fonts: {
                primary: 'Arial, sans-serif',
                secondary: 'Georgia, serif',
                monospace: 'Courier New, monospace'
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32
            },
            borderRadius: {
                sm: 2,
                md: 4,
                lg: 8,
                xl: 16
            }
        });
    }

    setupEventListeners() {
        // Enhanced event handling for UI components
        if (this.engine.inputManager) {
            // Mouse events
            this.engine.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.engine.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.engine.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.engine.canvas.addEventListener('click', this.handleClick.bind(this));
            
            // Keyboard events  
            this.engine.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
            this.engine.canvas.addEventListener('keyup', this.handleKeyUp.bind(this));
            
            // Focus events
            this.engine.canvas.addEventListener('focus', this.handleFocus.bind(this));
            this.engine.canvas.addEventListener('blur', this.handleBlur.bind(this));
        }
    }

    setupLayoutSystem() {
        this.updateBreakpoint();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                this.updateBreakpoint();
                this.recalculateLayouts();
            });
        }
    }

    // Theme system
    setTheme(themeName) {
        if (this.themes.has(themeName)) {
            this.currentTheme = themeName;
            this.applyThemeToComponents();
        }
    }

    getTheme() {
        return this.themes.get(this.currentTheme);
    }

    applyThemeToComponents() {
        const theme = this.getTheme();
        this.components.forEach(component => {
            if (component.applyTheme) {
                component.applyTheme(theme);
            }
        });
    }

    // Component management
    createComponent(type, config = {}) {
        let component;
        
        switch (type.toLowerCase()) {
            case 'button':
                component = new UIButton(config);
                break;
            case 'label':
                component = new UILabel(config);
                break;
            case 'container':
                component = new UIContainer(config);
                break;
            case 'modal':
                component = new UIModal(config);
                break;
            case 'progressbar':
                component = new UIProgressBar(config);
                break;
            default:
                component = new UIComponent(type, config);
        }
        
        this.registerComponent(component);
        
        // Apply current theme
        const theme = this.getTheme();
        if (component.applyTheme) {
            component.applyTheme(theme);
        }
        
        return component;
    }

    registerComponent(component) {
        this.components.set(component.id, component);
        
        if (!component.parent) {
            this.rootComponents.push(component);
        }
        
        // Set up data binding if specified
        if (component.dataBinding) {
            this.setupDataBinding(component);
        }
        
        return component;
    }

    removeComponent(componentId) {
        const component = this.components.get(componentId);
        if (!component) return false;
        
        // Remove from parent
        if (component.parent) {
            component.parent.removeChild(component);
        } else {
            const index = this.rootComponents.indexOf(component);
            if (index > -1) {
                this.rootComponents.splice(index, 1);
            }
        }
        
        // Clean up data bindings
        this.cleanupDataBinding(component);
        
        // Destroy component
        component.destroy();
        this.components.delete(componentId);
        
        return true;
    }

    getComponent(componentId) {
        return this.components.get(componentId);
    }

    // Layout system
    createLayout(name, type, config = {}) {
        let layout;
        
        switch (type.toLowerCase()) {
            case 'flex':
                layout = new FlexLayout(config);
                break;
            case 'grid':
                layout = new GridLayout(config);
                break;
            case 'absolute':
                layout = new AbsoluteLayout(config);
                break;
            case 'stack':
                layout = new StackLayout(config);
                break;
            default:
                throw new Error(`Unknown layout type: ${type}`);
        }
        
        this.layouts.set(name, layout);
        return layout;
    }

    applyLayout(layoutName, containerComponent) {
        const layout = this.layouts.get(layoutName);
        if (layout && containerComponent) {
            layout.apply(containerComponent);
        }
    }

    updateBreakpoint() {
        const width = this.engine.canvas ? this.engine.canvas.width : window.innerWidth;
        
        if (width <= this.responsiveBreakpoints.mobile) {
            this.currentBreakpoint = 'mobile';
        } else if (width <= this.responsiveBreakpoints.tablet) {
            this.currentBreakpoint = 'tablet';
        } else {
            this.currentBreakpoint = 'desktop';
        }
    }

    // Data binding system
    bindData(component, dataSource, propertyPath) {
        const binding = {
            component: component,
            dataSource: dataSource,
            propertyPath: propertyPath,
            updateComponent: () => {
                const value = this.getNestedProperty(dataSource, propertyPath);
                if (component.setValue) {
                    component.setValue(value);
                } else if (component.text !== undefined) {
                    component.text = value;
                } else if (component.value !== undefined) {
                    component.value = value;
                }
                component._needsUpdate = true;
            },
            updateData: (value) => {
                this.setNestedProperty(dataSource, propertyPath, value);
            }
        };
        
        this.dataBindings.set(component.id, binding);
        
        // Initial update
        binding.updateComponent();
        
        // Watch for data changes
        this.watchProperty(dataSource, propertyPath, binding.updateComponent);
        
        return binding;
    }

    setupDataBinding(component) {
        if (component.dataBinding) {
            const { dataSource, property } = component.dataBinding;
            this.bindData(component, dataSource, property);
        }
    }

    cleanupDataBinding(component) {
        const binding = this.dataBindings.get(component.id);
        if (binding) {
            this.unwatchProperty(binding.dataSource, binding.propertyPath);
            this.dataBindings.delete(component.id);
        }
    }

    watchProperty(obj, path, callback) {
        const key = `${obj.constructor.name}_${path}`;
        if (!this.watchedProperties.has(key)) {
            this.watchedProperties.set(key, []);
        }
        this.watchedProperties.get(key).push(callback);
    }

    unwatchProperty(obj, path) {
        const key = `${obj.constructor.name}_${path}`;
        this.watchedProperties.delete(key);
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => current[key], obj);
        if (target && lastKey) {
            target[lastKey] = value;
            // Trigger watchers
            const watchKey = `${obj.constructor.name}_${path}`;
            const callbacks = this.watchedProperties.get(watchKey);
            if (callbacks) {
                callbacks.forEach(callback => callback(value));
            }
        }
    }

    // Form handling system
    createForm(name, config = {}) {
        const form = {
            name: name,
            fields: new Map(),
            validators: new Map(),
            data: {},
            errors: {},
            touched: {},
            valid: true,
            onSubmit: config.onSubmit || (() => {}),
            onValidate: config.onValidate || (() => true),
            onChange: config.onChange || (() => {})
        };
        
        this.forms.set(name, form);
        return form;
    }

    addFormField(formName, fieldName, component, config = {}) {
        const form = this.forms.get(formName);
        if (!form) return false;
        
        const field = {
            component: component,
            validators: config.validators || [],
            required: config.required || false,
            initialValue: config.initialValue,
            transform: config.transform
        };
        
        form.fields.set(fieldName, field);
        
        // Set initial value
        if (field.initialValue !== undefined) {
            this.setFieldValue(formName, fieldName, field.initialValue);
        }
        
        // Set up change listener
        if (component.onChange) {
            component.onChange = (value) => {
                this.setFieldValue(formName, fieldName, value);
                this.validateField(formName, fieldName);
                form.onChange(fieldName, value, form.data);
            };
        }
        
        return field;
    }

    setFieldValue(formName, fieldName, value) {
        const form = this.forms.get(formName);
        if (!form) return false;
        
        const field = form.fields.get(fieldName);
        if (!field) return false;
        
        // Apply transform if specified
        if (field.transform) {
            value = field.transform(value);
        }
        
        form.data[fieldName] = value;
        form.touched[fieldName] = true;
        
        // Update component
        if (field.component.setValue) {
            field.component.setValue(value);
        }
        
        return true;
    }

    validateField(formName, fieldName) {
        const form = this.forms.get(formName);
        if (!form) return false;
        
        const field = form.fields.get(fieldName);
        if (!field) return false;
        
        const value = form.data[fieldName];
        const errors = [];
        
        // Required validation
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push(`${fieldName} is required`);
        }
        
        // Custom validators
        field.validators.forEach(validator => {
            const result = validator(value, form.data);
            if (result !== true) {
                errors.push(result || `${fieldName} is invalid`);
            }
        });
        
        form.errors[fieldName] = errors;
        
        // Update form validity
        form.valid = Object.values(form.errors).every(fieldErrors => fieldErrors.length === 0);
        
        return errors.length === 0;
    }

    validateForm(formName) {
        const form = this.forms.get(formName);
        if (!form) return false;
        
        let isValid = true;
        form.fields.forEach((field, fieldName) => {
            if (!this.validateField(formName, fieldName)) {
                isValid = false;
            }
        });
        
        // Run form-level validation
        if (isValid && form.onValidate) {
            isValid = form.onValidate(form.data);
        }
        
        form.valid = isValid;
        return isValid;
    }

    submitForm(formName) {
        const form = this.forms.get(formName);
        if (!form) return false;
        
        if (this.validateForm(formName)) {
            form.onSubmit(form.data);
            return true;
        }
        
        return false;
    }

    // Animation system
    animate(component, properties, duration = 1000, easing = 'ease-out') {
        const animation = {
            id: `anim_${Date.now()}_${Math.random()}`,
            component: component,
            startTime: Date.now(),
            duration: duration,
            easing: this.getEasingFunction(easing),
            startValues: {},
            endValues: properties,
            completed: false,
            onComplete: null
        };
        
        // Store initial values
        Object.keys(properties).forEach(prop => {
            animation.startValues[prop] = component[prop];
        });
        
        this.animations.set(animation.id, animation);
        return animation;
    }

    getEasingFunction(easing) {
        const easingFunctions = {
            'linear': t => t,
            'ease-in': t => t * t,
            'ease-out': t => t * (2 - t),
            'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            'bounce': t => {
                if (t < 1/2.75) return 7.5625 * t * t;
                if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
                if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
                return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
            }
        };
        
        return easingFunctions[easing] || easingFunctions['ease-out'];
    }

    updateAnimations(deltaTime) {
        const currentTime = Date.now();
        
        this.animations.forEach((animation, id) => {
            if (animation.completed) {
                this.animations.delete(id);
                return;
            }
            
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            const easedProgress = animation.easing(progress);
            
            // Update component properties
            Object.keys(animation.endValues).forEach(prop => {
                const startValue = animation.startValues[prop];
                const endValue = animation.endValues[prop];
                const currentValue = startValue + (endValue - startValue) * easedProgress;
                animation.component[prop] = currentValue;
                animation.component._needsUpdate = true;
            });
            
            // Check if animation is complete
            if (progress >= 1) {
                animation.completed = true;
                if (animation.onComplete) {
                    animation.onComplete();
                }
            }
        });
    }

    // Event handling
    handleMouseMove(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hitComponent = this.getComponentAt(x, y);
        
        // Handle hover state changes
        if (this.hoveredComponent !== hitComponent) {
            if (this.hoveredComponent && this.hoveredComponent.onMouseLeave) {
                this.hoveredComponent.hovered = false;
                this.hoveredComponent.onMouseLeave(event);
                this.hoveredComponent._needsUpdate = true;
            }
            
            this.hoveredComponent = hitComponent;
            
            if (this.hoveredComponent && this.hoveredComponent.onMouseEnter) {
                this.hoveredComponent.hovered = true;
                this.hoveredComponent.onMouseEnter(event);
                this.hoveredComponent._needsUpdate = true;
            }
        }
        
        // Handle drag
        if (this.draggedComponent) {
            if (this.draggedComponent.onDrag) {
                this.draggedComponent.onDrag(event);
            }
            this.draggedComponent._needsUpdate = true;
        }
        
        // Update cursor
        this.updateCursor(hitComponent);
    }

    handleMouseDown(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hitComponent = this.getComponentAt(x, y);
        
        if (hitComponent) {
            // Focus component
            this.setFocus(hitComponent);
            
            // Handle press state
            hitComponent.pressed = true;
            hitComponent._needsUpdate = true;
            
            // Start drag if draggable
            if (hitComponent.draggable) {
                this.draggedComponent = hitComponent;
            }
            
            // Call component handler
            if (hitComponent.onMouseDown) {
                hitComponent.onMouseDown(event);
            }
        } else {
            // Clear focus if clicking outside all components
            this.setFocus(null);
        }
    }

    handleMouseUp(event) {
        if (this.draggedComponent) {
            if (this.draggedComponent.onDragEnd) {
                this.draggedComponent.onDragEnd(event);
            }
            this.draggedComponent = null;
        }
        
        // Clear pressed state for all components
        this.components.forEach(component => {
            if (component.pressed) {
                component.pressed = false;
                component._needsUpdate = true;
            }
        });
    }

    handleClick(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hitComponent = this.getComponentAt(x, y);
        
        if (hitComponent && hitComponent.enabled && hitComponent.onClick) {
            hitComponent.onClick(event);
        }
    }

    handleKeyDown(event) {
        // Legacy instructions handling
        if (event.key === this.instructionsKey || event.code === this.instructionsKey) {
            this.toggleInstructions();
            return;
        }
        
        if (event.key === 'Escape' && this.isInstructionsVisible) {
            this.hideInstructions();
            return;
        }
        
        // Modern component handling
        if (this.focusedComponent && this.focusedComponent.onKeyDown) {
            this.focusedComponent.onKeyDown(event);
        }
        
        // Tab navigation
        if (event.key === 'Tab') {
            event.preventDefault();
            this.navigateByTab(event.shiftKey);
        }
    }

    handleKeyUp(event) {
        if (this.focusedComponent && this.focusedComponent.onKeyUp) {
            this.focusedComponent.onKeyUp(event);
        }
    }

    handleFocus(event) {
        // Handle canvas focus
    }

    handleBlur(event) {
        // Clear focus when canvas loses focus
        this.setFocus(null);
    }

    getComponentAt(x, y) {
        // Check modals first (top to bottom)
        for (let i = this.modalStack.length - 1; i >= 0; i--) {
            const modal = this.modalStack[i];
            const hit = this.checkComponentHit(modal, x, y);
            if (hit) return hit;
        }
        
        // Check root components (top to bottom by z-index)
        const sortedComponents = [...this.rootComponents].sort((a, b) => b.z - a.z);
        for (const component of sortedComponents) {
            const hit = this.checkComponentHit(component, x, y);
            if (hit) return hit;
        }
        
        return null;
    }

    checkComponentHit(component, x, y) {
        if (!component.visible || !component.interactive) return null;
        
        const bounds = component.getBounds();
        const hit = x >= bounds.x && x <= bounds.x + bounds.width &&
                   y >= bounds.y && y <= bounds.y + bounds.height;
        
        if (hit) {
            // Check children first (they're on top)
            for (const child of component.children) {
                const childHit = this.checkComponentHit(child, x, y);
                if (childHit) return childHit;
            }
            return component;
        }
        
        return null;
    }

    updateCursor(component) {
        if (!this.engine.canvas) return;
        
        let cursor = 'default';
        
        if (component) {
            if (component.draggable) cursor = 'move';
            else if (component.type === 'button') cursor = 'pointer';
            else if (component.cursor) cursor = component.cursor;
        }
        
        this.engine.canvas.style.cursor = cursor;
    }

    setFocus(component) {
        if (this.focusedComponent === component) return;
        
        // Blur current focused component
        if (this.focusedComponent) {
            this.focusedComponent.focused = false;
            if (this.focusedComponent.onBlur) {
                this.focusedComponent.onBlur();
            }
            this.focusedComponent._needsUpdate = true;
        }
        
        this.focusedComponent = component;
        
        // Focus new component
        if (this.focusedComponent && this.focusedComponent.focusable) {
            this.focusedComponent.focused = true;
            if (this.focusedComponent.onFocus) {
                this.focusedComponent.onFocus();
            }
            this.focusedComponent._needsUpdate = true;
        }
    }

    navigateByTab(reverse = false) {
        const focusableComponents = [];
        
        const collectFocusable = (component) => {
            if (component.focusable && component.visible && component.enabled) {
                focusableComponents.push(component);
            }
            component.children.forEach(collectFocusable);
        };
        
        this.rootComponents.forEach(collectFocusable);
        
        if (focusableComponents.length === 0) return;
        
        const currentIndex = this.focusedComponent ? 
            focusableComponents.indexOf(this.focusedComponent) : -1;
        
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? focusableComponents.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= focusableComponents.length - 1 ? 0 : currentIndex + 1;
        }
        
        this.setFocus(focusableComponents[nextIndex]);
    }

    // Modal system
    showModal(modal) {
        if (this.modalStack.includes(modal)) return;
        
        this.modalStack.push(modal);
        modal.visible = true;
        modal.z = 1000 + this.modalStack.length;
        
        // Focus first focusable element in modal
        const focusable = this.findFirstFocusable(modal);
        if (focusable) {
            this.setFocus(focusable);
        }
        
        if (modal.onShow) {
            modal.onShow();
        }
    }

    hideModal(modal) {
        const index = this.modalStack.indexOf(modal);
        if (index === -1) return;
        
        this.modalStack.splice(index, 1);
        modal.visible = false;
        
        if (modal.onHide) {
            modal.onHide();
        }
        
        // Focus previous modal or clear focus
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            const focusable = this.findFirstFocusable(topModal);
            if (focusable) {
                this.setFocus(focusable);
            }
        } else {
            this.setFocus(null);
        }
    }

    findFirstFocusable(component) {
        if (component.focusable && component.visible && component.enabled) {
            return component;
        }
        
        for (const child of component.children) {
            const focusable = this.findFirstFocusable(child);
            if (focusable) return focusable;
        }
        
        return null;
    }

    // Tooltip system
    showTooltip(component, text, options = {}) {
        const tooltip = {
            component: component,
            text: text,
            x: options.x || component.x + component.width / 2,
            y: options.y || component.y - 30,
            delay: options.delay || 500,
            startTime: Date.now()
        };
        
        this.tooltips.set(component.id, tooltip);
    }

    hideTooltip(component) {
        this.tooltips.delete(component.id);
    }

    renderTooltips(ctx) {
        const currentTime = Date.now();
        
        this.tooltips.forEach(tooltip => {
            if (currentTime - tooltip.startTime >= tooltip.delay) {
                this.renderTooltip(ctx, tooltip);
            }
        });
    }

    renderTooltip(ctx, tooltip) {
        ctx.save();
        
        // Measure text
        ctx.font = '12px Arial';
        const metrics = ctx.measureText(tooltip.text);
        const padding = 8;
        const width = metrics.width + padding * 2;
        const height = 20;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltip.x - width / 2, tooltip.y - height, width, height);
        
        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltip.text, tooltip.x, tooltip.y - height / 2);
        
        ctx.restore();
    }

    handleKeyPress(event) {
        const { key } = event;
        
        // Toggle instructions visibility
        if (key === this.instructionsKey) {
            this.toggleInstructions();
        }
        
        // Close instructions with Escape
        if (key === 'Escape' && this.isInstructionsVisible) {
            this.hideInstructions();
        }
    }

    toggleInstructions() {
        this.isInstructionsVisible = !this.isInstructionsVisible;
    }

    showInstructions() {
        this.isInstructionsVisible = true;
    }

    hideInstructions() {
        this.isInstructionsVisible = false;
    }

    update(deltaTime) {
        // Check for instructions toggle input
        if (this.engine.inputManager) {
            // Toggle instructions with the configured key
            if (this.engine.inputManager.isKeyJustPressed(this.instructionsKey)) {
                this.toggleInstructions();
            }
            
            // Close instructions with Escape
            if (this.isInstructionsVisible && this.engine.inputManager.isKeyJustPressed('Escape')) {
                this.hideInstructions();
            }
        }
    }

    render(ctx) {
        if (this.isInstructionsVisible && this.instructions.length > 0) {
            this.renderInstructionsModal(ctx);
        }
    }

    renderInstructionsModal(ctx) {
        // Save context state
        ctx.save();
        
        // Modal overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        
        // Modal background
        const modalWidth = Math.min(500, this.engine.width - 100);
        const modalHeight = Math.min(400, this.engine.height - 100);
        const modalX = (this.engine.width - modalWidth) / 2;
        const modalY = (this.engine.height - modalHeight) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Modal border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
        
        // Title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Instructions', modalX + modalWidth / 2, modalY + 20);
        
        // Instructions content
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const lineHeight = 25;
        const startY = modalY + 70;
        const contentX = modalX + 30;
        
        this.instructions.forEach((instruction, index) => {
            const y = startY + index * lineHeight;
            if (y + lineHeight < modalY + modalHeight - 60) { // Leave space for close instruction
                ctx.fillText(instruction, contentX, y);
            }
        });
        
        // Close instruction
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Press H to close or ESC`, modalX + modalWidth / 2, modalY + modalHeight - 30);
        
        // Restore context state
        ctx.restore();
    }

    // Legacy instruction methods
    handleKeyPress(event) {
        const { key } = event;
        
        // Toggle instructions visibility
        if (key === this.instructionsKey) {
            this.toggleInstructions();
        }
        
        // Close instructions with Escape
        if (key === 'Escape' && this.isInstructionsVisible) {
            this.hideInstructions();
        }
    }

    toggleInstructions() {
        this.isInstructionsVisible = !this.isInstructionsVisible;
    }

    showInstructions() {
        this.isInstructionsVisible = true;
    }

    hideInstructions() {
        this.isInstructionsVisible = false;
    }

    // Main update method
    update(deltaTime) {
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update components
        this.components.forEach(component => {
            if (component.update) {
                component.update(deltaTime);
            }
        });
        
        // Legacy instruction handling
        if (this.engine.inputManager) {
            // Toggle instructions with the configured key
            if (this.engine.inputManager.isKeyJustPressed(this.instructionsKey)) {
                this.toggleInstructions();
            }
            
            // Close instructions with Escape
            if (this.isInstructionsVisible && this.engine.inputManager.isKeyJustPressed('Escape')) {
                this.hideInstructions();
            }
        }
    }

    // Main render method
    render(ctx) {
        // Render root components
        const sortedComponents = [...this.rootComponents].sort((a, b) => a.z - b.z);
        sortedComponents.forEach(component => {
            if (component.visible) {
                this.renderComponent(ctx, component);
            }
        });
        
        // Render modals
        this.modalStack.forEach(modal => {
            if (modal.visible) {
                this.renderComponent(ctx, modal);
            }
        });
        
        // Render tooltips
        this.renderTooltips(ctx);
        
        // Legacy instruction rendering
        if (this.isInstructionsVisible && this.instructions.length > 0) {
            this.renderInstructionsModal(ctx);
        }
    }

    renderComponent(ctx, component) {
        if (!component.visible) return;
        
        ctx.save();
        
        // Apply component transformations
        if (component.x || component.y) {
            ctx.translate(component.x, component.y);
        }
        
        if (component.opacity < 1) {
            ctx.globalAlpha = component.opacity;
        }
        
        // Render the component
        if (component.render) {
            component.render(ctx);
        } else {
            this.renderBasicComponent(ctx, component);
        }
        
        // Render children
        component.children.forEach(child => {
            this.renderComponent(ctx, child);
        });
        
        ctx.restore();
    }

    renderBasicComponent(ctx, component) {
        const bounds = component.getBounds();
        
        // Background
        if (component.backgroundColor) {
            ctx.fillStyle = component.backgroundColor;
            if (component.borderRadius > 0) {
                this.roundRect(ctx, 0, 0, bounds.width, bounds.height, component.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, bounds.width, bounds.height);
            }
        }
        
        // Border
        if (component.borderWidth > 0) {
            ctx.strokeStyle = component.borderColor;
            ctx.lineWidth = component.borderWidth;
            if (component.borderRadius > 0) {
                this.roundRect(ctx, 0, 0, bounds.width, bounds.height, component.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, bounds.width, bounds.height);
            }
        }
        
        // Text (for simple components)
        if (component.text) {
            ctx.fillStyle = component.textColor || '#333333';
            ctx.font = component.font || '14px Arial';
            ctx.textAlign = component.textAlign || 'left';
            ctx.textBaseline = component.textBaseline || 'top';
            
            const textX = component.padding ? component.padding.left : 0;
            const textY = component.padding ? component.padding.top : 0;
            
            ctx.fillText(component.text, textX, textY);
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    renderInstructionsModal(ctx) {
        // Save context state
        ctx.save();
        
        // Modal overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        
        // Modal background
        const modalWidth = Math.min(500, this.engine.width - 100);
        const modalHeight = Math.min(400, this.engine.height - 100);
        const modalX = (this.engine.width - modalWidth) / 2;
        const modalY = (this.engine.height - modalHeight) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Modal border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
        
        // Title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Instructions', modalX + modalWidth / 2, modalY + 20);
        
        // Instructions content
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const lineHeight = 25;
        const startY = modalY + 70;
        const contentX = modalX + 30;
        
        this.instructions.forEach((instruction, index) => {
            const y = startY + index * lineHeight;
            if (y + lineHeight < modalY + modalHeight - 60) { // Leave space for close instruction
                ctx.fillText(instruction, contentX, y);
            }
        });
        
        // Close instruction
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Press H to close or ESC`, modalX + modalWidth / 2, modalY + modalHeight - 30);
        
        // Restore context state
        ctx.restore();
    }

    // Utility methods
    createUIFromTemplate(template) {
        const components = new Map();
        
        const createComponentFromTemplate = (templateComponent, parent = null) => {
            const component = this.createComponent(templateComponent.type, templateComponent.config);
            
            if (parent) {
                parent.addChild(component);
            }
            
            components.set(templateComponent.id || component.id, component);
            
            if (templateComponent.children) {
                templateComponent.children.forEach(childTemplate => {
                    createComponentFromTemplate(childTemplate, component);
                });
            }
            
            return component;
        };
        
        const rootComponent = createComponentFromTemplate(template);
        return { root: rootComponent, components: components };
    }

    // Helper for quick UI creation with boilerplate reduction
    createQuickUI() {
        return new UIBuilder(this);
    }

    destroy() {
        // Clean up event listeners
        if (this.engine.canvas) {
            this.engine.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.engine.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.engine.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.engine.canvas.removeEventListener('click', this.handleClick);
            this.engine.canvas.removeEventListener('keydown', this.handleKeyDown);
            this.engine.canvas.removeEventListener('keyup', this.handleKeyUp);
            this.engine.canvas.removeEventListener('focus', this.handleFocus);
            this.engine.canvas.removeEventListener('blur', this.handleBlur);
        }
        
        // Destroy all components
        this.components.forEach(component => component.destroy());
        this.components.clear();
        this.rootComponents = [];
        
        // Clear all systems
        this.modalStack = [];
        this.tooltips.clear();
        this.animations.clear();
        this.dataBindings.clear();
        this.watchedProperties.clear();
        this.forms.clear();
        this.layouts.clear();
    }
}
