/**
 * @file UIBuilderEnhanced.js
 * @description Enhanced fluent API for building UI components with minimal boilerplate
 */

/**
 * @class UIBuilder
 * @classdesc Enhanced fluent API for creating UI components with magic methods and smart defaults
 */
export class UIBuilder {
    constructor(uiManager, scene = null) {
        this.uiManager = uiManager;
        this.scene = scene;
        this.currentComponent = null;
        this.componentStack = [];
        this.autoLayout = true;
        this.currentTheme = 'default';
        this.autoWiring = true;
        this.smartDefaults = true;
        this.layoutContext = {
            nextX: 20,
            nextY: 20,
            columnWidth: 200,
            rowHeight: 40,
            padding: 10,
            currentRow: 0,
            currentColumn: 0,
            maxColumns: 3
        };
    }

    // ===== MAGIC COMPONENT CREATION =====
    
    // Component creation methods with smart defaults
    button(text = 'Button', options = {}) {
        this.currentComponent = this.uiManager.createComponent('button', { text, ...options });
        if (this.autoLayout) this._applyAutoLayout();
        if (this.autoWiring) this._applyAutoWiring(text);
        return this;
    }

    label(text = 'Label', options = {}) {
        this.currentComponent = this.uiManager.createComponent('label', { text, ...options });
        if (this.autoLayout) this._applyAutoLayout();
        return this;
    }

    input(placeholder = '', options = {}) {
        this.currentComponent = this.uiManager.createComponent('input', { placeholder, ...options });
        if (this.autoLayout) this._applyAutoLayout();
        if (this.autoWiring && placeholder) this._applyAutoWiring(placeholder);
        return this;
    }

    container(options = {}) {
        this.currentComponent = this.uiManager.createComponent('container', options);
        if (this.autoLayout) this._applyAutoLayout();
        return this;
    }

    modal(title = 'Modal', options = {}) {
        this.currentComponent = this.uiManager.createComponent('modal', { title, ...options });
        return this; // Modals don't use auto layout
    }

    progressBar(value = 0, max = 100, options = {}) {
        this.currentComponent = this.uiManager.createComponent('progressbar', { value, max, ...options });
        if (this.autoLayout) this._applyAutoLayout();
        return this;
    }

    // ===== MAGIC TEMPLATE METHODS =====
    
    loginForm(options = {}) {
        return this._createTemplate('loginForm', options);
    }

    mainMenu(options = {}) {
        return this._createTemplate('mainMenu', options);
    }

    settingsPanel(options = {}) {
        return this._createTemplate('settingsPanel', options);
    }

    gameHUD(options = {}) {
        return this._createTemplate('gameHUD', options);
    }

    dialog(message = 'Dialog', options = {}) {
        return this._createTemplate('dialog', { message, ...options });
    }

    loadingScreen(message = 'Loading...', options = {}) {
        return this._createTemplate('loadingScreen', { message, ...options });
    }

    // ===== SMART COMPOSITE COMPONENTS =====
    
    formField(label, type = 'text', options = {}) {
        this.container()
            .layout('flex', { direction: 'column', gap: 5 });
        
        this.label(label)
            .fontSize(14)
            .textColor('#666');
        
        this.input('', { type, ...options })
            .width(200)
            .padding(8)
            .border('1px solid #ccc')
            .rounded(4);
            
        return this.end(); // Return to parent container
    }

    buttonGroup(buttons = [], options = {}) {
        this.container()
            .layout('flex', { direction: 'row', gap: 10, ...options });
        
        buttons.forEach((buttonData, index) => {
            const text = typeof buttonData === 'string' ? buttonData : buttonData.text;
            const opts = typeof buttonData === 'object' ? buttonData : {};
            
            this.button(text, opts);
            if (index === 0 && this.smartDefaults) {
                this.variant('primary');
            }
        });
        
        return this.end();
    }

    dataList(items = [], options = {}) {
        const { renderItem = (item) => String(item) } = options;
        
        this.container()
            .layout('flex', { direction: 'column', gap: 2 });
        
        items.forEach(item => {
            this.label(renderItem(item))
                .padding(8)
                .width('100%')
                .hover(() => this.color('#f0f0f0'));
        });
        
        return this.end();
    }

    // ===== ENHANCED POSITIONING =====
    
    at(x, y) {
        if (this.currentComponent) {
            this.currentComponent.setPosition(x, y);
        }
        return this;
    }

    // Smart positioning methods
    nextTo(component, direction = 'right', gap = 10) {
        if (!this.currentComponent || !component) return this;
        
        const bounds = component.getBounds();
        let x, y;
        
        switch (direction) {
            case 'right':
                x = bounds.x + bounds.width + gap;
                y = bounds.y;
                break;
            case 'left':
                x = bounds.x - this.currentComponent.width - gap;
                y = bounds.y;
                break;
            case 'below':
                x = bounds.x;
                y = bounds.y + bounds.height + gap;
                break;
            case 'above':
                x = bounds.x;
                y = bounds.y - this.currentComponent.height - gap;
                break;
        }
        
        return this.at(x, y);
    }

    // Auto layout methods
    autoNext() {
        if (this.autoLayout) {
            this._applyAutoLayout();
        }
        return this;
    }

    newRow() {
        this.layoutContext.currentRow++;
        this.layoutContext.currentColumn = 0;
        this.layoutContext.nextY = 20 + (this.layoutContext.currentRow * (this.layoutContext.rowHeight + this.layoutContext.padding));
        this.layoutContext.nextX = 20;
        return this;
    }

    newColumn() {
        this.layoutContext.currentColumn++;
        if (this.layoutContext.currentColumn >= this.layoutContext.maxColumns) {
            return this.newRow();
        }
        this.layoutContext.nextX = 20 + (this.layoutContext.currentColumn * (this.layoutContext.columnWidth + this.layoutContext.padding));
        return this;
    }

    // Layout configuration
    gridLayout(columns = 3, rowHeight = 40, columnWidth = 200, padding = 10) {
        this.layoutContext.maxColumns = columns;
        this.layoutContext.rowHeight = rowHeight;
        this.layoutContext.columnWidth = columnWidth;
        this.layoutContext.padding = padding;
        return this;
    }

    // Positioning presets
    topLeft() {
        return this.at(20, 20);
    }

    topRight() {
        const canvas = this.scene?.canvas || { width: 800 };
        return this.at(canvas.width - (this.currentComponent?.width || 200) - 20, 20);
    }

    bottomLeft() {
        const canvas = this.scene?.canvas || { height: 600 };
        return this.at(20, canvas.height - (this.currentComponent?.height || 40) - 20);
    }

    bottomRight() {
        const canvas = this.scene?.canvas || { width: 800, height: 600 };
        return this.at(
            canvas.width - (this.currentComponent?.width || 200) - 20,
            canvas.height - (this.currentComponent?.height || 40) - 20
        );
    }

    centerScreen() {
        const canvas = this.scene?.canvas || { width: 800, height: 600 };
        return this.at(
            (canvas.width - (this.currentComponent?.width || 200)) / 2,
            (canvas.height - (this.currentComponent?.height || 40)) / 2
        );
    }

    size(width, height) {
        if (this.currentComponent) {
            this.currentComponent.setSize(width, height);
        }
        return this;
    }

    width(w) {
        if (this.currentComponent) {
            this.currentComponent.width = w;
        }
        return this;
    }

    height(h) {
        if (this.currentComponent) {
            this.currentComponent.height = h;
        }
        return this;
    }

    bounds(x, y, width, height) {
        if (this.currentComponent) {
            this.currentComponent.setBounds(x, y, width, height);
        }
        return this;
    }

    // ===== STYLING WITH SMART DEFAULTS =====
    
    color(backgroundColor) {
        if (this.currentComponent) {
            this.currentComponent.backgroundColor = backgroundColor;
        }
        return this;
    }

    textColor(color) {
        if (this.currentComponent) {
            this.currentComponent.textColor = color;
        }
        return this;
    }

    font(font) {
        if (this.currentComponent) {
            this.currentComponent.font = font;
        }
        return this;
    }

    fontSize(size) {
        if (this.currentComponent) {
            this.currentComponent.fontSize = size;
        }
        return this;
    }

    border(border) {
        if (this.currentComponent) {
            this.currentComponent.border = border;
        }
        return this;
    }

    rounded(radius) {
        if (this.currentComponent) {
            this.currentComponent.borderRadius = radius;
        }
        return this;
    }

    padding(padding) {
        if (this.currentComponent) {
            this.currentComponent.padding = padding;
        }
        return this;
    }

    margin(margin) {
        if (this.currentComponent) {
            this.currentComponent.margin = margin;
        }
        return this;
    }

    // Style presets
    card() {
        return this.color('#fff')
            .border('1px solid #ddd')
            .rounded(8)
            .padding(16);
    }

    panel() {
        return this.color('#f8f9fa')
            .border('1px solid #e9ecef')
            .rounded(4)
            .padding(12);
    }

    // ===== EVENT HANDLING WITH AUTO-WIRING =====
    
    onClick(handler) {
        if (this.currentComponent) {
            this.uiManager.addEventListener(this.currentComponent, 'click', handler);
        }
        return this;
    }

    onHover(enterHandler, leaveHandler = null) {
        if (this.currentComponent) {
            this.uiManager.addEventListener(this.currentComponent, 'mouseenter', enterHandler);
            if (leaveHandler) {
                this.uiManager.addEventListener(this.currentComponent, 'mouseleave', leaveHandler);
            }
        }
        return this;
    }

    onChange(handler) {
        if (this.currentComponent) {
            this.uiManager.addEventListener(this.currentComponent, 'change', handler);
        }
        return this;
    }

    onFocus(handler) {
        if (this.currentComponent) {
            this.uiManager.addEventListener(this.currentComponent, 'focus', handler);
        }
        return this;
    }

    // ===== STATE MANAGEMENT =====
    
    disabled(isDisabled = true) {
        if (this.currentComponent) {
            this.currentComponent.disabled = isDisabled;
        }
        return this;
    }

    hidden(isHidden = true) {
        if (this.currentComponent) {
            this.currentComponent.visible = !isHidden;
        }
        return this;
    }

    focusable(canFocus = true) {
        if (this.currentComponent) {
            this.currentComponent.focusable = canFocus;
        }
        return this;
    }

    draggable(isDraggable = true) {
        if (this.currentComponent) {
            this.currentComponent.draggable = isDraggable;
        }
        return this;
    }

    // ===== LAYOUT MANAGEMENT =====
    
    layout(type, options = {}) {
        if (this.currentComponent) {
            this.uiManager.setLayout(this.currentComponent, type, options);
        }
        return this;
    }

    flex(options = {}) {
        return this.layout('flex', options);
    }

    grid(options = {}) {
        return this.layout('grid', options);
    }

    // ===== ANIMATION SHORTCUTS =====
    
    fadeIn(duration = 300) {
        if (this.currentComponent) {
            this.currentComponent.opacity = 0;
            return this.animate({ opacity: 1 }, duration);
        }
        return this;
    }

    slideIn(direction = 'left', duration = 300) {
        if (this.currentComponent) {
            const originalX = this.currentComponent.x;
            const originalY = this.currentComponent.y;
            
            switch (direction) {
                case 'left':
                    this.currentComponent.x = -this.currentComponent.width;
                    break;
                case 'right':
                    this.currentComponent.x = (this.scene?.canvas?.width || 800);
                    break;
                case 'top':
                    this.currentComponent.y = -this.currentComponent.height;
                    break;
                case 'bottom':
                    this.currentComponent.y = (this.scene?.canvas?.height || 600);
                    break;
            }
            
            return this.animate({ x: originalX, y: originalY }, duration);
        }
        return this;
    }

    animate(properties, duration = 300, easing = 'easeInOut') {
        if (this.currentComponent) {
            return this.uiManager.animate(this.currentComponent, properties, duration, easing);
        }
        return this;
    }

    // ===== CONTAINER MANAGEMENT =====
    
    beginContainer() {
        if (this.currentComponent) {
            this.componentStack.push(this.currentComponent);
        }
        return this;
    }

    end() {
        if (this.componentStack.length > 0) {
            this.currentComponent = this.componentStack.pop();
        }
        return this;
    }

    // ===== TOOLTIP SHORTCUTS =====
    
    tooltip(text, options = {}) {
        if (this.currentComponent) {
            this.uiManager.addEventListener(this.currentComponent, 'mouseenter', () => {
                this.uiManager.showTooltip(this.currentComponent, text, options);
            });
            this.uiManager.addEventListener(this.currentComponent, 'mouseleave', () => {
                this.uiManager.hideTooltip(this.currentComponent);
            });
        }
        return this;
    }

    // ===== THEME APPLICATION =====
    
    theme(themeName) {
        this.currentTheme = themeName;
        const theme = this.uiManager.getTheme(themeName);
        if (this.currentComponent && theme) {
            // Apply theme colors and styles
            if (theme.colors) {
                this.currentComponent.backgroundColor = theme.colors.background;
                this.currentComponent.textColor = theme.colors.text;
            }
            if (theme.typography) {
                this.currentComponent.font = theme.typography.font;
                this.currentComponent.fontSize = theme.typography.size;
            }
        }
        return this;
    }

    variant(variantName) {
        if (this.currentComponent && this.currentComponent.setVariant) {
            this.currentComponent.setVariant(variantName);
        }
        return this;
    }

    // ===== UTILITY AND FINALIZATION =====
    
    build() {
        const component = this.currentComponent;
        this.currentComponent = null;
        return component;
    }

    // Static helper methods for quick component creation
    static button(uiManager, text) {
        return new UIBuilder(uiManager).button(text);
    }

    static label(uiManager, text) {
        return new UIBuilder(uiManager).label(text);
    }

    static modal(uiManager, title) {
        return new UIBuilder(uiManager).modal(title);
    }

    // ===== INTERNAL HELPER METHODS =====
    
    _applyAutoLayout() {
        if (this.currentComponent) {
            this.currentComponent.setPosition(this.layoutContext.nextX, this.layoutContext.nextY);
            this.newColumn();
        }
    }

    _applyAutoWiring(identifier) {
        if (!this.scene || !this.autoWiring) return;
        
        // Convert identifier to method name (e.g., "Login Button" -> "onLoginButton")
        const methodName = 'on' + identifier.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
        
        if (typeof this.scene[methodName] === 'function') {
            this.onClick(this.scene[methodName].bind(this.scene));
        }
    }

    _createTemplate(templateName, options = {}) {
        // Delegate to UITemplate system
        if (this.uiManager.createTemplate) {
            this.currentComponent = this.uiManager.createTemplate(templateName, options);
        }
        return this;
    }
}

/**
 * @class DeclarativeUIBuilder
 * @classdesc JSON-based UI builder for complex layouts with minimal code
 */
export class DeclarativeUIBuilder {
    constructor(uiManager, scene = null) {
        this.uiManager = uiManager;
        this.scene = scene;
        this.builder = new UIBuilder(uiManager, scene);
    }

    // Build UI from JSON definition
    fromJSON(definition) {
        return this._buildFromDefinition(definition);
    }

    // Build UI from template
    fromTemplate(templateName, data = {}) {
        const template = this._getTemplate(templateName);
        if (template) {
            return this._buildFromDefinition(template, data);
        }
        return null;
    }

    _buildFromDefinition(def, data = {}) {
        if (!def || !def.type) return null;

        // Create the component
        let component;
        switch (def.type) {
            case 'button':
                component = this.builder.button(this._resolveValue(def.text, data), def.options);
                break;
            case 'label':
                component = this.builder.label(this._resolveValue(def.text, data), def.options);
                break;
            case 'input':
                component = this.builder.input(this._resolveValue(def.placeholder, data), def.options);
                break;
            case 'container':
                component = this.builder.container(def.options);
                break;
            default:
                return null;
        }

        // Apply styling
        if (def.style) {
            this._applyStyles(component, def.style, data);
        }

        // Apply positioning
        if (def.position) {
            this._applyPosition(component, def.position, data);
        }

        // Apply events
        if (def.events) {
            this._applyEvents(component, def.events, data);
        }

        // Build children
        if (def.children && Array.isArray(def.children)) {
            this.builder.beginContainer();
            def.children.forEach(child => {
                this._buildFromDefinition(child, data);
            });
            this.builder.end();
        }

        return component.build();
    }

    _applyStyles(component, styles, data) {
        Object.entries(styles).forEach(([key, value]) => {
            const resolvedValue = this._resolveValue(value, data);
            if (component[key]) {
                component[key](resolvedValue);
            }
        });
    }

    _applyPosition(component, position, data) {
        if (position.x !== undefined && position.y !== undefined) {
            component.at(
                this._resolveValue(position.x, data),
                this._resolveValue(position.y, data)
            );
        }
        if (position.preset) {
            const preset = this._resolveValue(position.preset, data);
            if (component[preset]) {
                component[preset]();
            }
        }
    }

    _applyEvents(component, events, data) {
        Object.entries(events).forEach(([event, handler]) => {
            if (typeof handler === 'string' && this.scene && this.scene[handler]) {
                const eventMethod = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
                if (component[eventMethod]) {
                    component[eventMethod](this.scene[handler].bind(this.scene));
                }
            }
        });
    }

    _resolveValue(value, data) {
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const key = value.slice(2, -2).trim();
            return data[key] || value;
        }
        return value;
    }

    _getTemplate(templateName) {
        const templates = {
            loginForm: {
                type: 'container',
                style: { card: true },
                position: { preset: 'centerScreen' },
                children: [
                    {
                        type: 'label',
                        text: '{{title}}',
                        style: { fontSize: 24, textColor: '#333' }
                    },
                    {
                        type: 'input',
                        placeholder: 'Username',
                        options: { type: 'text' },
                        style: { width: 250, margin: '10px 0' }
                    },
                    {
                        type: 'input',
                        placeholder: 'Password',
                        options: { type: 'password' },
                        style: { width: 250, margin: '10px 0' }
                    },
                    {
                        type: 'button',
                        text: 'Login',
                        style: { variant: 'primary' },
                        events: { click: 'onLogin' }
                    }
                ]
            }
        };
        
        return templates[templateName];
    }
}
