/**
 * @file UIBuilder.js
 * @description Fluent API for building UI components with minimal boilerplate
 */

/**
 * @class UIBuilder
 * @classdesc Provides a fluent API for creating UI components with method chaining
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

    // Magic component methods - create components with smart defaults
    loginForm() {
        return this._createTemplate('loginForm');
    }

    mainMenu() {
        return this._createTemplate('mainMenu');
    }

    settingsPanel() {
        return this._createTemplate('settingsPanel');
    }

    gameHUD() {
        return this._createTemplate('gameHUD');
    }

    dialog(message = 'Dialog', options = {}) {
        return this._createTemplate('dialog', { message, ...options });
    }

    loadingScreen(message = 'Loading...') {
        return this._createTemplate('loadingScreen', { message });
    }

    // Smart component creation based on data
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

    // Enhanced positioning methods with smart defaults
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

    bounds(x, y, width, height) {
        if (this.currentComponent) {
            this.currentComponent.setBounds(x, y, width, height);
        }
        return this;
    }

    // Styling methods
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

    border(color, width = 1) {
        if (this.currentComponent) {
            this.currentComponent.borderColor = color;
            this.currentComponent.borderWidth = width;
        }
        return this;
    }

    rounded(radius = 4) {
        if (this.currentComponent) {
            this.currentComponent.borderRadius = radius;
        }
        return this;
    }

    padding(top, right = top, bottom = top, left = right) {
        if (this.currentComponent) {
            this.currentComponent.padding = { top, right, bottom, left };
        }
        return this;
    }

    margin(top, right = top, bottom = top, left = right) {
        if (this.currentComponent) {
            this.currentComponent.margin = { top, right, bottom, left };
        }
        return this;
    }

    // Layout methods
    center() {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            const x = (canvas.width - this.currentComponent.width) / 2;
            const y = (canvas.height - this.currentComponent.height) / 2;
            this.currentComponent.setPosition(x, y);
        }
        return this;
    }

    centerHorizontally() {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            const x = (canvas.width - this.currentComponent.width) / 2;
            this.currentComponent.x = x;
        }
        return this;
    }

    centerVertically() {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            const y = (canvas.height - this.currentComponent.height) / 2;
            this.currentComponent.y = y;
        }
        return this;
    }

    alignLeft(offset = 0) {
        if (this.currentComponent) {
            this.currentComponent.x = offset;
        }
        return this;
    }

    alignRight(offset = 0) {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            this.currentComponent.x = canvas.width - this.currentComponent.width - offset;
        }
        return this;
    }

    alignTop(offset = 0) {
        if (this.currentComponent) {
            this.currentComponent.y = offset;
        }
        return this;
    }

    alignBottom(offset = 0) {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            this.currentComponent.y = canvas.height - this.currentComponent.height - offset;
        }
        return this;
    }

    // Event handling methods
    onClick(handler) {
        if (this.currentComponent) {
            this.currentComponent.onClick = handler;
        }
        return this;
    }

    onHover(enterHandler, leaveHandler) {
        if (this.currentComponent) {
            this.currentComponent.onMouseEnter = enterHandler;
            this.currentComponent.onMouseLeave = leaveHandler;
        }
        return this;
    }

    onFocus(handler) {
        if (this.currentComponent) {
            this.currentComponent.onFocus = handler;
        }
        return this;
    }

    onBlur(handler) {
        if (this.currentComponent) {
            this.currentComponent.onBlur = handler;
        }
        return this;
    }

    onChange(handler) {
        if (this.currentComponent) {
            this.currentComponent.onChange = handler;
        }
        return this;
    }

    // State methods
    disabled(disabled = true) {
        if (this.currentComponent) {
            this.currentComponent.enabled = !disabled;
        }
        return this;
    }

    hidden(hidden = true) {
        if (this.currentComponent) {
            this.currentComponent.visible = !hidden;
        }
        return this;
    }

    focusable(focusable = true) {
        if (this.currentComponent) {
            this.currentComponent.focusable = focusable;
        }
        return this;
    }

    draggable(draggable = true) {
        if (this.currentComponent) {
            this.currentComponent.draggable = draggable;
        }
        return this;
    }

    // Data binding methods
    bindTo(dataSource, property) {
        if (this.currentComponent) {
            this.uiManager.bindData(this.currentComponent, dataSource, property);
        }
        return this;
    }

    // Animation methods
    animate(properties, duration = 1000, easing = 'ease-out') {
        if (this.currentComponent) {
            return this.uiManager.animate(this.currentComponent, properties, duration, easing);
        }
        return null;
    }

    fadeIn(duration = 500) {
        if (this.currentComponent) {
            this.currentComponent.opacity = 0;
            return this.uiManager.animate(this.currentComponent, { opacity: 1 }, duration);
        }
        return null;
    }

    fadeOut(duration = 500) {
        if (this.currentComponent) {
            return this.uiManager.animate(this.currentComponent, { opacity: 0 }, duration);
        }
        return null;
    }

    slideIn(direction = 'left', duration = 500) {
        if (this.currentComponent && this.uiManager.engine.canvas) {
            const canvas = this.uiManager.engine.canvas;
            const originalX = this.currentComponent.x;
            const originalY = this.currentComponent.y;
            
            switch (direction) {
                case 'left':
                    this.currentComponent.x = -this.currentComponent.width;
                    break;
                case 'right':
                    this.currentComponent.x = canvas.width;
                    break;
                case 'top':
                    this.currentComponent.y = -this.currentComponent.height;
                    break;
                case 'bottom':
                    this.currentComponent.y = canvas.height;
                    break;
            }
            
            return this.uiManager.animate(this.currentComponent, 
                { x: originalX, y: originalY }, duration);
        }
        return null;
    }

    // Hierarchy methods
    beginContainer() {
        if (this.currentComponent) {
            this.componentStack.push(this.currentComponent);
        }
        return this.container();
    }

    endContainer() {
        const container = this.currentComponent;
        this.currentComponent = this.componentStack.pop() || null;
        return container;
    }

    addChild() {
        const child = this.currentComponent;
        if (this.componentStack.length > 0) {
            const parent = this.componentStack[this.componentStack.length - 1];
            parent.addChild(child);
        }
        return this;
    }

    // Tooltip methods
    tooltip(text, options = {}) {
        if (this.currentComponent) {
            this.currentComponent.onMouseEnter = () => {
                this.uiManager.showTooltip(this.currentComponent, text, options);
            };
            this.currentComponent.onMouseLeave = () => {
                this.uiManager.hideTooltip(this.currentComponent);
            };
        }
        return this;
    }

    // Theme methods
    useTheme(theme) {
        if (this.currentComponent && typeof theme === 'object') {
            if (theme.colors) {
                if (theme.colors.primary) this.currentComponent.backgroundColor = theme.colors.primary;
                if (theme.colors.text) this.currentComponent.textColor = theme.colors.text;
                if (theme.colors.border) this.currentComponent.borderColor = theme.colors.border;
            }
            if (theme.fonts && theme.fonts.primary) {
                this.currentComponent.font = theme.fonts.primary;
            }
            if (theme.spacing) {
                this.padding(theme.spacing.md);
            }
            if (theme.borderRadius) {
                this.rounded(theme.borderRadius.md);
            }
        }
        return this;
    }

    // Responsive methods
    responsive(breakpoints) {
        if (this.currentComponent) {
            this.currentComponent.responsive = breakpoints;
        }
        return this;
    }

    // Build methods
    build() {
        const component = this.currentComponent;
        this.currentComponent = null;
        this.componentStack = [];
        return component;
    }

    // Quick creation methods with common patterns
    static createButton(uiManager, text, x, y, onClick) {
        return new UIBuilder(uiManager)
            .button(text)
            .at(x, y)
            .onClick(onClick)
            .build();
    }

    static createLabel(uiManager, text, x, y) {
        return new UIBuilder(uiManager)
            .label(text)
            .at(x, y)
            .build();
    }

    static createModal(uiManager, title, content) {
        return new UIBuilder(uiManager)
            .modal(title)
            .center()
            .size(400, 300)
            .build();
    }

    static createForm(uiManager, x, y, width) {
        return new UIBuilder(uiManager)
            .container()
            .at(x, y)
            .size(width, 0) // Height will be calculated based on content
            .build();
    }

    // Preset component styles
    primaryButton(text) {
        const theme = this.uiManager.getTheme();
        return this.button(text)
            .color(theme.colors.primary)
            .textColor('#ffffff')
            .rounded(theme.borderRadius.md)
            .padding(theme.spacing.sm, theme.spacing.md);
    }

    secondaryButton(text) {
        const theme = this.uiManager.getTheme();
        return this.button(text)
            .color(theme.colors.light)
            .textColor(theme.colors.text)
            .border(theme.colors.border)
            .rounded(theme.borderRadius.md)
            .padding(theme.spacing.sm, theme.spacing.md);
    }

    dangerButton(text) {
        const theme = this.uiManager.getTheme();
        return this.button(text)
            .color(theme.colors.danger)
            .textColor('#ffffff')
            .rounded(theme.borderRadius.md)
            .padding(theme.spacing.sm, theme.spacing.md);
    }

    card() {
        const theme = this.uiManager.getTheme();
        return this.container()
            .color(theme.colors.surface)
            .border(theme.colors.border)
            .rounded(theme.borderRadius.lg)
            .padding(theme.spacing.lg);
    }
}

export default UIBuilder;
