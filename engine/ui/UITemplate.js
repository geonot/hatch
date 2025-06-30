/**
 * @file UITemplate.js
 * @description Pre-built UI templates for common patterns to reduce boilerplate
 */

/**
 * @class UITemplate
 * @classdesc Provides pre-built templates for common UI patterns
 */
export class UITemplate {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.templates = new Map();
        this._registerBuiltInTemplates();
    }

    /**
     * Register built-in templates
     */
    _registerBuiltInTemplates() {
        // Login form template
        this.addTemplate('loginForm', {
            type: 'form',
            title: 'Login',
            fields: [
                { name: 'username', type: 'input', label: 'Username', required: true },
                { name: 'password', type: 'password', label: 'Password', required: true }
            ],
            actions: [
                { text: 'Cancel', variant: 'secondary', action: 'cancel' },
                { text: 'Login', variant: 'primary', action: 'submit' }
            ]
        });

        // Registration form template
        this.addTemplate('registrationForm', {
            type: 'form',
            title: 'Create Account',
            fields: [
                { name: 'email', type: 'email', label: 'Email', required: true, validators: ['email'] },
                { name: 'username', type: 'input', label: 'Username', required: true, minLength: 3 },
                { name: 'password', type: 'password', label: 'Password', required: true, validators: ['password'] },
                { name: 'confirmPassword', type: 'password', label: 'Confirm Password', required: true, matches: 'password' }
            ],
            actions: [
                { text: 'Cancel', variant: 'secondary', action: 'cancel' },
                { text: 'Register', variant: 'primary', action: 'submit' }
            ]
        });

        // Main menu template
        this.addTemplate('mainMenu', {
            type: 'menu',
            title: 'Game Title',
            subtitle: 'Version 1.0',
            items: [
                { text: 'New Game', action: 'newGame', icon: '🎮' },
                { text: 'Load Game', action: 'loadGame', icon: '📁' },
                { text: 'Settings', action: 'settings', icon: '⚙️' },
                { text: 'Exit', action: 'exit', icon: '🚪', variant: 'secondary' }
            ]
        });

        // Settings menu template
        this.addTemplate('settingsMenu', {
            type: 'settings',
            title: 'Settings',
            sections: [
                {
                    title: 'Audio',
                    settings: [
                        { name: 'masterVolume', type: 'slider', label: 'Master Volume', min: 0, max: 100, value: 80 },
                        { name: 'musicVolume', type: 'slider', label: 'Music Volume', min: 0, max: 100, value: 70 },
                        { name: 'sfxVolume', type: 'slider', label: 'Sound Effects', min: 0, max: 100, value: 90 }
                    ]
                },
                {
                    title: 'Graphics',
                    settings: [
                        { name: 'resolution', type: 'dropdown', label: 'Resolution', options: ['1920x1080', '1280x720', '800x600'] },
                        { name: 'fullscreen', type: 'checkbox', label: 'Fullscreen', value: false },
                        { name: 'vsync', type: 'checkbox', label: 'V-Sync', value: true }
                    ]
                }
            ],
            actions: [
                { text: 'Cancel', variant: 'secondary', action: 'cancel' },
                { text: 'Apply', variant: 'primary', action: 'apply' }
            ]
        });

        // Game HUD template
        this.addTemplate('gameHUD', {
            type: 'hud',
            layout: 'overlay',
            elements: [
                { name: 'score', type: 'label', text: 'Score: 0', position: 'top-left' },
                { name: 'health', type: 'progressbar', label: 'Health', value: 100, position: 'top-right' },
                { name: 'minimap', type: 'container', position: 'bottom-right', size: { width: 150, height: 150 } },
                { name: 'inventory', type: 'button', text: 'Inventory', position: 'bottom-left', hotkey: 'I' }
            ]
        });

        // Confirmation dialog template
        this.addTemplate('confirmDialog', {
            type: 'dialog',
            icon: '⚠️',
            title: 'Confirm Action',
            message: 'Are you sure you want to continue?',
            actions: [
                { text: 'Cancel', variant: 'secondary', action: 'cancel' },
                { text: 'Confirm', variant: 'danger', action: 'confirm' }
            ]
        });

        // Loading screen template
        this.addTemplate('loadingScreen', {
            type: 'loading',
            title: 'Loading...',
            subtitle: 'Please wait while the game loads',
            showProgress: true,
            showTips: true,
            tips: [
                'Tip: Use WASD keys to move around',
                'Tip: Press ESC to open the menu',
                'Tip: Right-click for context actions'
            ]
        });

        // Inventory template
        this.addTemplate('inventory', {
            type: 'inventory',
            title: 'Inventory',
            gridSize: { rows: 6, columns: 8 },
            categories: ['All', 'Weapons', 'Armor', 'Items', 'Quest'],
            showStats: true,
            allowDragDrop: true
        });

        // Character sheet template
        this.addTemplate('characterSheet', {
            type: 'character',
            title: 'Character',
            sections: [
                {
                    title: 'Stats',
                    type: 'stats',
                    stats: [
                        { name: 'level', label: 'Level', value: 1 },
                        { name: 'health', label: 'Health', value: 100, max: 100 },
                        { name: 'mana', label: 'Mana', value: 50, max: 50 },
                        { name: 'experience', label: 'Experience', value: 0, max: 1000 }
                    ]
                },
                {
                    title: 'Equipment',
                    type: 'equipment',
                    slots: ['helmet', 'armor', 'weapon', 'shield', 'boots', 'gloves']
                }
            ]
        });

        // Leaderboard template
        this.addTemplate('leaderboard', {
            type: 'leaderboard',
            title: 'High Scores',
            columns: ['Rank', 'Player', 'Score', 'Date'],
            maxEntries: 10,
            showPlayerRank: true
        });
    }

    /**
     * Add a custom template
     */
    addTemplate(name, config) {
        this.templates.set(name, config);
        return this;
    }

    /**
     * Create a component from template
     */
    create(templateName, customConfig = {}) {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        // Merge template with custom config
        const config = this._mergeConfig(template, customConfig);

        // Create component based on template type
        switch (template.type) {
            case 'form':
                return this._createForm(config);
            case 'menu':
                return this._createMenu(config);
            case 'settings':
                return this._createSettings(config);
            case 'hud':
                return this._createHUD(config);
            case 'dialog':
                return this._createDialog(config);
            case 'loading':
                return this._createLoadingScreen(config);
            case 'inventory':
                return this._createInventory(config);
            case 'character':
                return this._createCharacterSheet(config);
            case 'leaderboard':
                return this._createLeaderboard(config);
            default:
                throw new Error(`Unknown template type: ${template.type}`);
        }
    }

    /**
     * Merge template config with custom config
     */
    _mergeConfig(template, custom) {
        return {
            ...template,
            ...custom,
            fields: custom.fields ? [...(template.fields || []), ...custom.fields] : template.fields,
            actions: custom.actions ? [...(template.actions || []), ...custom.actions] : template.actions,
            items: custom.items ? [...(template.items || []), ...custom.items] : template.items
        };
    }

    /**
     * Create form from template
     */
    _createForm(config) {
        const container = this.uiManager.createComponent('container', {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: { top: 30, right: 30, bottom: 30, left: 30 },
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            width: config.width || 400,
            autoHeight: true
        });

        const layout = this.uiManager.createLayout('flex', {
            direction: 'column',
            gap: 20,
            alignItems: 'stretch'
        });

        // Title
        if (config.title) {
            const title = this.uiManager.createComponent('label', {
                text: config.title,
                textType: 'heading2',
                textAlign: 'center',
                marginBottom: 10
            });
            layout.addChild(title);
        }

        // Form fields
        const fieldLayout = this.uiManager.createLayout('flex', {
            direction: 'column',
            gap: 15
        });

        config.fields?.forEach(field => {
            const fieldContainer = this._createFormField(field);
            fieldLayout.addChild(fieldContainer);
        });

        layout.addChild(fieldLayout);

        // Actions
        if (config.actions?.length > 0) {
            const actionLayout = this.uiManager.createLayout('flex', {
                direction: 'row',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 20
            });

            config.actions.forEach(action => {
                const button = this.uiManager.createComponent('button', {
                    text: action.text,
                    variant: action.variant || 'primary',
                    onClick: () => this._handleAction(action.action, config)
                });
                actionLayout.addChild(button);
            });

            layout.addChild(actionLayout);
        }

        layout.updateContainer(container.getBounds());
        return { container, layout, config };
    }

    /**
     * Create form field
     */
    _createFormField(field) {
        const fieldContainer = this.uiManager.createComponent('container', {
            width: '100%',
            autoHeight: true
        });

        const fieldLayout = this.uiManager.createLayout('flex', {
            direction: 'column',
            gap: 5
        });

        // Label
        if (field.label) {
            const label = this.uiManager.createComponent('label', {
                text: field.label + (field.required ? ' *' : ''),
                textType: 'body',
                textColor: field.required ? '#dc3545' : '#333333'
            });
            fieldLayout.addChild(label);
        }

        // Input
        const input = this.uiManager.createComponent('input', {
            type: field.type || 'text',
            placeholder: field.placeholder || field.label,
            required: field.required || false,
            width: '100%',
            height: 40,
            name: field.name
        });

        // Add validators
        if (field.validators) {
            field.validators.forEach(validator => {
                if (typeof validator === 'string') {
                    input.addValidator(validator);
                } else {
                    input.addValidator(validator.name, validator.params);
                }
            });
        }

        fieldLayout.addChild(input);
        fieldLayout.updateContainer(fieldContainer.getBounds());
        
        return fieldContainer;
    }

    /**
     * Create menu from template
     */
    _createMenu(config) {
        const container = this.uiManager.createComponent('container', {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            width: '100%',
            height: '100%'
        });

        const layout = this.uiManager.createLayout('flex', {
            direction: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 30
        });

        // Title section
        if (config.title || config.subtitle) {
            const titleContainer = this.uiManager.createComponent('container', {
                autoSize: true
            });

            const titleLayout = this.uiManager.createLayout('flex', {
                direction: 'column',
                alignItems: 'center',
                gap: 10
            });

            if (config.title) {
                const title = this.uiManager.createComponent('label', {
                    text: config.title,
                    textType: 'heading1',
                    textColor: '#ffffff',
                    textAlign: 'center'
                });
                titleLayout.addChild(title);
            }

            if (config.subtitle) {
                const subtitle = this.uiManager.createComponent('label', {
                    text: config.subtitle,
                    textType: 'body',
                    textColor: '#cccccc',
                    textAlign: 'center'
                });
                titleLayout.addChild(subtitle);
            }

            titleLayout.updateContainer(titleContainer.getBounds());
            layout.addChild(titleContainer);
        }

        // Menu items
        const menuLayout = this.uiManager.createLayout('flex', {
            direction: 'column',
            gap: 15,
            alignItems: 'center'
        });

        config.items?.forEach(item => {
            const button = this.uiManager.createComponent('button', {
                text: `${item.icon || ''} ${item.text}`.trim(),
                variant: item.variant || 'primary',
                size: 'large',
                width: 200,
                onClick: () => this._handleAction(item.action, config)
            });
            menuLayout.addChild(button);
        });

        layout.addChild(menuLayout);
        layout.updateContainer(container.getBounds());

        return { container, layout, config };
    }

    /**
     * Create HUD from template
     */
    _createHUD(config) {
        const container = this.uiManager.createComponent('container', {
            width: '100%',
            height: '100%',
            interactive: false
        });

        const layout = this.uiManager.createLayout('absolute');

        config.elements?.forEach(element => {
            const component = this.uiManager.createComponent(element.type, {
                ...element,
                text: element.text || element.label
            });

            const position = this._parsePosition(element.position);
            layout.addChild(component, {
                ...position,
                width: element.size?.width || component.width,
                height: element.size?.height || component.height
            });
        });

        layout.updateContainer(container.getBounds());
        return { container, layout, config };
    }

    /**
     * Parse position string (e.g., 'top-left', 'center', 'bottom-right')
     */
    _parsePosition(position) {
        const positions = {
            'top-left': { anchor: { horizontal: 'left', vertical: 'top' }, offsetX: 20, offsetY: 20 },
            'top-center': { anchor: { horizontal: 'center', vertical: 'top' }, offsetX: 0, offsetY: 20 },
            'top-right': { anchor: { horizontal: 'right', vertical: 'top' }, offsetX: -20, offsetY: 20 },
            'center-left': { anchor: { horizontal: 'left', vertical: 'middle' }, offsetX: 20, offsetY: 0 },
            'center': { anchor: { horizontal: 'center', vertical: 'middle' }, offsetX: 0, offsetY: 0 },
            'center-right': { anchor: { horizontal: 'right', vertical: 'middle' }, offsetX: -20, offsetY: 0 },
            'bottom-left': { anchor: { horizontal: 'left', vertical: 'bottom' }, offsetX: 20, offsetY: -20 },
            'bottom-center': { anchor: { horizontal: 'center', vertical: 'bottom' }, offsetX: 0, offsetY: -20 },
            'bottom-right': { anchor: { horizontal: 'right', vertical: 'bottom' }, offsetX: -20, offsetY: -20 }
        };

        return positions[position] || positions['center'];
    }

    /**
     * Create dialog from template
     */
    _createDialog(config) {
        return this.uiManager.showModal({
            title: config.title,
            message: config.message,
            icon: config.icon,
            buttons: config.actions?.map(action => action.text) || ['OK'],
            onClose: (result) => {
                const action = config.actions?.find(a => a.text === result);
                if (action) {
                    this._handleAction(action.action, config);
                }
            }
        });
    }

    /**
     * Handle template actions
     */
    _handleAction(action, config) {
        // Emit event for custom handling
        if (config.onAction) {
            config.onAction(action, config);
        } else {
            // Default handling
            this.uiManager.trigger('templateAction', { action, config });
        }
    }

    /**
     * Quick creation methods for common templates
     */
    static quick = {
        loginForm: (uiManager, onLogin) => {
            const template = new UITemplate(uiManager);
            return template.create('loginForm', {
                onAction: (action, config) => {
                    if (action === 'submit' && onLogin) {
                        onLogin(config);
                    }
                }
            });
        },

        mainMenu: (uiManager, actions) => {
            const template = new UITemplate(uiManager);
            return template.create('mainMenu', {
                onAction: (action, config) => {
                    if (actions[action]) {
                        actions[action](config);
                    }
                }
            });
        },

        confirmDialog: (uiManager, message, onConfirm) => {
            const template = new UITemplate(uiManager);
            return template.create('confirmDialog', {
                message,
                onAction: (action, config) => {
                    if (action === 'confirm' && onConfirm) {
                        onConfirm(config);
                    }
                }
            });
        },

        gameHUD: (uiManager, elements) => {
            const template = new UITemplate(uiManager);
            return template.create('gameHUD', {
                elements: elements || []
            });
        }
    };
}
