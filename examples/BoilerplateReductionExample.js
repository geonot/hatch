/**
 * @file BoilerplateReductionExample.js
 * @description Comprehensive example showing all boilerplate reduction features
 */

import { MenuScene, GameScene, DialogScene } from '../engine/ui/SceneTemplates.js';
import { UIBuilder, DeclarativeUIBuilder } from '../engine/ui/UIBuilderEnhanced.js';
import { InputPresets } from '../engine/input/InputBindings.js';

/**
 * @class ModernMenuScene
 * @classdesc Example of a modern menu scene with minimal boilerplate
 */
export class ModernMenuScene extends MenuScene {
    constructor(engine) {
        super('MainMenu', {
            gameTitle: 'My Awesome Game',
            version: '1.0.0',
            backgroundColor: '#2c3e50',
            showLogo: true,
            animateEntrance: true
        });

        // Define menu structure declaratively
        this.menuStructure = [
            { text: 'Start Game', action: 'startGame', variant: 'primary' },
            { text: 'Load Game', action: 'loadGame' },
            { text: 'Settings', action: 'showSettings' },
            { text: 'Credits', action: 'showCredits' },
            { text: 'Exit', action: 'exitGame', variant: 'danger' }
        ];
    }

    init() {
        super.init();

        // Create menu items with auto-wiring
        this.menuStructure.forEach(item => {
            this.addMenuItem(item.text, () => this[item.action]?.(), {
                variant: item.variant
            });
        });

        // Bind input with presets - no manual key binding needed
        this.bindKeys(InputPresets.getMenuPreset());
        this.bindKeys(InputPresets.getDebugPreset());

        // Auto-load assets - no manual asset management
        // Assets will be discovered from ./assets/scenes/mainmenu/
    }

    // Action methods - auto-wired by naming convention
    startGame() {
        this.sceneManager.switchTo('GameplayScene');
    }

    loadGame() {
        this.showNotification('Load game not implemented yet', 'info');
    }

    showSettings() {
        this.sceneManager.pushScene('SettingsScene');
    }

    showCredits() {
        this.sceneManager.pushScene('CreditsScene');
    }

    exitGame() {
        this.quickModal('Confirm Exit', modal => {
            modal.label('Are you sure you want to exit?')
                .buttonGroup(['Yes', 'No'])
                .onYes(() => window.close())
                .onNo(() => modal.close());
        });
    }
}

/**
 * @class SimpleGameplayScene
 * @classdesc Example of a gameplay scene with automatic HUD and controls
 */
export class SimpleGameplayScene extends GameScene {
    constructor(engine) {
        super('Gameplay', {
            showHUD: true,
            showPauseMenu: true,
            autoSave: true
        });

        this.player = null;
        this.enemies = [];
    }

    init() {
        super.init();

        // Bind game controls automatically based on game type
        this.bindGameControls('platformer');

        // Setup custom HUD elements with minimal code
        this.createCustomHUD();

        // Create game objects
        this.setupGameObjects();
    }

    createCustomHUD() {
        // Health bar
        this.healthBar = this.ui.progressBar(100, 100)
            .topLeft()
            .at(20, 100)
            .width(200)
            .color('#ff0000')
            .build();

        // Ammo counter
        this.ammoLabel = this.ui.label('Ammo: 30')
            .topLeft()
            .at(20, 130)
            .fontSize(16)
            .build();

        // Mini-map placeholder
        this.miniMap = this.ui.container()
            .topRight()
            .size(150, 150)
            .border('2px solid #fff')
            .color('rgba(0,0,0,0.5)')
            .build();
    }

    setupGameObjects() {
        // Player setup with minimal code
        this.player = {
            x: 100,
            y: 300,
            health: 100,
            ammo: 30,
            speed: 200
        };

        // Bind data to UI automatically
        this.bindData('player.health', this.healthBar, 'value');
        this.bindData('player.ammo', this.ammoLabel, 'text');
    }

    updateGame(deltaTime) {
        // Game logic here
        this.updatePlayer(deltaTime);
        this.updateEnemies(deltaTime);
        this.checkCollisions();

        // Data binding automatically updates UI
        this.updateData('player.health', this.player.health);
        this.updateData('player.ammo', `Ammo: ${this.player.ammo}`);
    }

    updatePlayer(deltaTime) {
        // Player movement logic
    }

    updateEnemies(deltaTime) {
        // Enemy logic
    }

    checkCollisions() {
        // Collision detection
    }

    // Input actions - auto-wired by naming convention
    onMoveLeft() {
        this.player.x -= this.player.speed * this.engine.deltaTime;
    }

    onMoveRight() {
        this.player.x += this.player.speed * this.engine.deltaTime;
    }

    onJump() {
        // Jump logic
    }

    onAttack() {
        if (this.player.ammo > 0) {
            this.player.ammo--;
            // Attack logic
        }
    }
}

/**
 * @class SettingsScene
 * @classdesc Example settings scene with automatic form handling
 */
export class SettingsScene extends DialogScene {
    constructor(engine) {
        super('Settings', {
            showBackground: true,
            allowEscape: true
        });

        this.settings = {
            volume: 0.8,
            graphics: 'high',
            fullscreen: false,
            language: 'en'
        };
    }

    init() {
        super.init();
        this.createSettingsUI();
    }

    createSettingsUI() {
        // Create settings form with automatic validation
        const settingsForm = this.createForm([
            {
                name: 'volume',
                label: 'Master Volume',
                type: 'range',
                options: { min: 0, max: 1, step: 0.1 },
                validation: { min: 0, max: 1 }
            },
            {
                name: 'graphics',
                label: 'Graphics Quality',
                type: 'select',
                options: { 
                    options: ['low', 'medium', 'high', 'ultra']
                }
            },
            {
                name: 'fullscreen',
                label: 'Fullscreen',
                type: 'checkbox'
            },
            {
                name: 'language',
                label: 'Language',
                type: 'select',
                options: {
                    options: ['en', 'es', 'fr', 'de', 'ja']
                }
            }
        ], {
            submitText: 'Apply Settings',
            onSubmit: (values) => this.applySettings(values)
        });

        // Add cancel button
        this.ui.button('Cancel')
            .nextTo(settingsForm, 'right', 20)
            .onClick(() => this.sceneManager.popScene())
            .build();

        // Populate form with current settings
        this.populateForm(settingsForm, this.settings);
    }

    populateForm(form, data) {
        // Auto-populate form fields
        Object.entries(data).forEach(([key, value]) => {
            this.bindData(`settings.${key}`, form[key], 'value');
        });
    }

    applySettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Apply settings to engine
        this.engine.audioManager.setVolume(this.settings.volume);
        this.engine.renderer.setQuality(this.settings.graphics);
        
        if (this.settings.fullscreen) {
            this.engine.renderer.enterFullscreen();
        }

        this.showNotification('Settings applied!', 'success');
        
        // Auto-save settings
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        
        // Return to previous scene
        this.sceneManager.popScene();
    }
}

/**
 * @class DeclarativeUIExample
 * @classdesc Example using declarative UI definition
 */
export class DeclarativeUIExample extends GameScene {
    constructor(engine) {
        super('DeclarativeExample');
        
        // Define UI structure in JSON
        this.uiDefinition = {
            type: 'container',
            style: { layout: 'flex', direction: 'column', padding: 20 },
            children: [
                {
                    type: 'label',
                    text: 'Welcome to {{playerName}}!',
                    style: { fontSize: 24, color: '#333' }
                },
                {
                    type: 'container',
                    style: { layout: 'flex', direction: 'row', gap: 10 },
                    children: [
                        {
                            type: 'button',
                            text: 'Start Adventure',
                            style: { variant: 'primary' },
                            events: { click: 'onStartAdventure' }
                        },
                        {
                            type: 'button',
                            text: 'View Inventory',
                            events: { click: 'onViewInventory' }
                        }
                    ]
                },
                {
                    type: 'input',
                    placeholder: 'Enter player name',
                    events: { change: 'onPlayerNameChange' }
                }
            ]
        };
    }

    init() {
        super.init();
        
        // Create UI from JSON definition
        const declarativeBuilder = new DeclarativeUIBuilder(this.uiManager, this);
        this.mainUI = declarativeBuilder.fromJSON(this.uiDefinition);
        
        // Data for template variables
        this.uiData = {
            playerName: 'Hero'
        };
    }

    // Event handlers referenced in UI definition
    onStartAdventure() {
        this.showNotification('Starting adventure!', 'success');
    }

    onViewInventory() {
        this.showInventory();
    }

    onPlayerNameChange(event) {
        this.uiData.playerName = event.target.value;
        // UI will automatically update due to data binding
    }

    showInventory() {
        // Create inventory modal using templates
        const inventory = this.ui.modal('Inventory')
            .centerScreen()
            .size(400, 300);

        // Use data list component for items
        const items = ['Sword', 'Shield', 'Potion', 'Key'];
        inventory.dataList(items, {
            renderItem: (item) => `🎒 ${item}`
        });

        inventory.build();
    }
}

/**
 * @class PerformanceOptimizedScene
 * @classdesc Example scene with automatic performance monitoring and optimization
 */
export class PerformanceOptimizedScene extends GameScene {
    constructor(engine) {
        super('PerformanceExample', {
            autoOptimize: true,
            showHUD: true
        });

        this.particles = [];
        this.effects = [];
    }

    init() {
        super.init();

        // Enable performance monitoring with auto-optimization
        this.performanceMonitor.start({
            autoOptimize: true,
            thresholds: {
                fps: { warning: 45, critical: 30 },
                memory: { warning: 0.7, critical: 0.9 }
            }
        });

        // Show performance overlay in debug mode
        if (this.engine.debug) {
            this.showPerformanceOverlay();
        }

        // Setup performance budget
        this.performanceBudget.setBudget('particles', 500);
        this.performanceBudget.setBudget('effects', 50);
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Update performance budgets
        this.performanceBudget.updateUsage('particles', this.particles.length);
        this.performanceBudget.updateUsage('effects', this.effects.length);

        // Performance monitoring will automatically suggest optimizations
        const stats = this.getPerformanceStats();
        if (stats && stats.status === 'Critical') {
            this.applyEmergencyOptimizations();
        }
    }

    applyEmergencyOptimizations() {
        // Reduce particle count
        this.particles = this.particles.slice(0, Math.floor(this.particles.length * 0.5));
        
        // Disable non-essential effects
        this.effects = this.effects.filter(effect => effect.essential);
        
        this.showNotification('Performance optimizations applied', 'warning');
    }

    addParticle() {
        // Check performance budget before adding
        const budget = this.performanceBudget.getStatus();
        if (budget.particles.status !== 'over') {
            this.particles.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100
            });
        }
    }
}

/**
 * Factory function to create scenes with minimal boilerplate
 */
export class SceneFactory {
    static createMenu(engine, options = {}) {
        return new ModernMenuScene(engine, options);
    }

    static createGameplay(engine, gameType = 'platformer', options = {}) {
        const scene = new SimpleGameplayScene(engine, options);
        scene.gameType = gameType;
        return scene;
    }

    static createSettings(engine, options = {}) {
        return new SettingsScene(engine, options);
    }

    static createDialog(engine, dialogData, options = {}) {
        const scene = new DialogScene('DialogScene', options);
        scene.setDialog(dialogData);
        return scene;
    }

    static createCustom(engine, template, options = {}) {
        // Create scene from template configuration
        const sceneConfig = {
            type: template.type || 'game',
            name: template.name || 'CustomScene',
            ...template,
            ...options
        };

        switch (sceneConfig.type) {
            case 'menu':
                return new MenuScene(sceneConfig.name, sceneConfig);
            case 'game':
                return new GameScene(sceneConfig.name, sceneConfig);
            case 'dialog':
                return new DialogScene(sceneConfig.name, sceneConfig);
            default:
                return new GameScene(sceneConfig.name, sceneConfig);
        }
    }
}

// Usage examples:

/*
// Create a complete menu scene with just a few lines
const mainMenu = SceneFactory.createMenu(engine, {
    gameTitle: 'My Game',
    menuItems: [
        { text: 'Play', action: 'startGame' },
        { text: 'Settings', action: 'showSettings' },
        { text: 'Exit', action: 'exitGame' }
    ]
});

// Create a gameplay scene with automatic controls and HUD
const gameplayScene = SceneFactory.createGameplay(engine, 'platformer', {
    showHUD: true,
    playerStats: ['health', 'score', 'lives']
});

// Create settings scene with automatic form generation
const settingsScene = SceneFactory.createSettings(engine, {
    settings: ['volume', 'graphics', 'controls']
});

// Use declarative UI for complex layouts
const complexScene = new DeclarativeUIExample(engine);

// Performance-optimized scene with automatic monitoring
const performanceScene = new PerformanceOptimizedScene(engine);
*/
