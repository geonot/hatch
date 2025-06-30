# Hatch Engine: Boilerplate Reduction Guide

The Hatch Engine has been enhanced with comprehensive boilerplate reduction features that dramatically simplify game development. This guide shows you how to build games with minimal configuration and maximum productivity.

## Table of Contents

1. [Scene Templates](#scene-templates)
2. [Enhanced UI Builder](#enhanced-ui-builder)
3. [Auto-Wiring System](#auto-wiring-system)
4. [Declarative UI](#declarative-ui)
5. [Smart Asset Management](#smart-asset-management)
6. [Input Binding Presets](#input-binding-presets)
7. [Performance Monitoring](#performance-monitoring)
8. [Complete Examples](#complete-examples)

## Scene Templates

Scene templates provide pre-configured scene types with smart defaults and automatic setup.

### Available Templates

- **MenuScene**: Pre-built menu with navigation, animations, and theming
- **GameScene**: Gameplay scene with HUD, pause menu, and input handling
- **LoadingScene**: Loading screen with progress tracking and tips
- **DialogScene**: Conversation scenes with typewriter effects

### Usage

```javascript
import { MenuScene, GameScene } from '../engine/ui/SceneTemplates.js';

// Create a menu scene with minimal configuration
class MainMenu extends MenuScene {
    constructor(engine) {
        super('MainMenu', {
            gameTitle: 'My Awesome Game',
            version: '1.0.0',
            animateEntrance: true,
            showLogo: true
        });
    }

    init() {
        super.init();
        
        // Add menu items - auto-wired to methods
        this.addMenuItem('Start Game', this.startGame);
        this.addMenuItem('Settings', this.showSettings);
        this.addMenuItem('Exit', this.exitGame);
    }

    // Methods are automatically called based on menu item text
    startGame() {
        this.sceneManager.switchTo('GameplayScene');
    }
}

// Create a gameplay scene with automatic HUD
class GameplayScene extends GameScene {
    constructor(engine) {
        super('Gameplay', {
            showHUD: true,        // Automatic score/lives/level display
            showPauseMenu: true,  // ESC key pause menu
            autoSave: true        // Automatic save game state
        });
    }

    init() {
        super.init();
        
        // Game controls are automatically bound based on game type
        this.bindGameControls('platformer');
    }

    // Update game logic - HUD updates automatically
    updateGame(deltaTime) {
        // Your game logic here
        this.score += 10;
        this.addScore(10); // Automatically updates HUD
    }
}
```

## Enhanced UI Builder

The enhanced UI builder provides fluent API with magic methods and smart positioning.

### Magic Component Creation

```javascript
// Create complex UI with minimal code
this.ui
    .loginForm()                    // Pre-built login form
    .centerScreen()                 // Smart positioning
    .theme('dark')                  // Auto-apply theme
    .onSubmit(this.handleLogin);    // Auto-wire events

// Button groups with smart defaults
this.ui.buttonGroup(['Play', 'Settings', 'Exit'])
    .bottomCenter()
    .spacing(20);

// Data-driven lists
this.ui.dataList(this.highScores, {
    renderItem: (score) => `${score.name}: ${score.points}`
});

// Form fields with validation
this.ui.formField('Email', 'email', {
    required: true,
    validation: { pattern: /.+@.+\..+/ }
});
```

### Smart Positioning

```javascript
// Automatic layout management
this.ui.button('Start')
    .autoNext()          // Automatically position next to previous component
    .primaryButton();    // Apply primary button styling

// Relative positioning
this.ui.button('Cancel')
    .nextTo(startButton, 'right', 10)  // Position relative to other components
    .secondaryButton();

// Preset positions
this.ui.label('Score: 0')
    .topRight()          // Predefined positions
    .padding(20);

this.ui.modal('Settings')
    .centerScreen()      // Perfect centering
    .fadeIn();           // Built-in animations
```

## Auto-Wiring System

Automatically bind UI events to scene methods based on naming conventions.

### Naming Conventions

- Button text "Start Game" → `onStartGame()` method
- Button text "Save" → `onSave()` method  
- Input field "Username" → `onUsernameChange()` method
- Modal with title "Settings" → `onSettingsClose()` method

### Example

```javascript
class MenuScene extends Scene {
    init() {
        // These buttons are automatically wired to methods below
        this.ui.button('Start Game').build();
        this.ui.button('Load Game').build();
        this.ui.button('Settings').build();
        this.ui.button('Exit Game').build();
    }

    // Auto-wired methods (no manual event binding needed!)
    onStartGame() {
        this.sceneManager.switchTo('GameplayScene');
    }

    onLoadGame() {
        this.showLoadGameDialog();
    }

    onSettings() {
        this.sceneManager.pushScene('SettingsScene');
    }

    onExitGame() {
        this.confirmExit();
    }
}
```

### Custom Wiring Rules

```javascript
// Add custom auto-wiring patterns
this.autoWiring.addConvention('^Play (.*)$', (match) => `onPlay${match[1]}`);
this.autoWiring.addConvention('^Go to (.*)$', (match) => `goTo${match[1]}`);

// Global event handlers for common patterns
this.autoWiring.addGlobalHandler('save', this.handleSave);
this.autoWiring.addGlobalHandler('cancel', this.handleCancel);
```

## Declarative UI

Create complex UIs using JSON definitions instead of imperative code.

### JSON UI Definition

```javascript
const uiDefinition = {
    type: 'container',
    style: { 
        layout: 'flex', 
        direction: 'column', 
        padding: 20,
        centerScreen: true 
    },
    children: [
        {
            type: 'label',
            text: 'Welcome {{playerName}}!',
            style: { fontSize: 24, textAlign: 'center' }
        },
        {
            type: 'container',
            style: { layout: 'flex', direction: 'row', gap: 15 },
            children: [
                {
                    type: 'button',
                    text: 'New Game',
                    style: { variant: 'primary' },
                    events: { click: 'onNewGame' }
                },
                {
                    type: 'button',
                    text: 'Continue',
                    events: { click: 'onContinueGame' }
                }
            ]
        },
        {
            type: 'input',
            placeholder: 'Enter your name',
            events: { change: 'onNameChange' }
        }
    ]
};

// Create UI from definition
const builder = new DeclarativeUIBuilder(this.uiManager, this);
this.mainUI = builder.fromJSON(uiDefinition);
```

### Templates with Data Binding

```javascript
// Use templates with dynamic data
const loginTemplate = {
    type: 'modal',
    title: '{{title}}',
    children: [
        {
            type: 'input',
            placeholder: '{{usernamePlaceholder}}',
            events: { change: 'onUsernameChange' }
        },
        {
            type: 'input',
            placeholder: '{{passwordPlaceholder}}',
            options: { type: 'password' },
            events: { change: 'onPasswordChange' }
        },
        {
            type: 'button',
            text: '{{submitText}}',
            style: { variant: 'primary' },
            events: { click: 'onLogin' }
        }
    ]
};

// Apply template with data
const loginUI = builder.fromTemplate('loginForm', {
    title: 'Please Login',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    submitText: 'Login'
});
```

## Smart Asset Management

Automatic asset discovery and loading with minimal configuration.

### Auto-Discovery

```javascript
class GameScene extends Scene {
    async init() {
        // Assets are automatically discovered from:
        // ./assets/scenes/gamescene/
        // No need to manually specify asset paths!
        
        await this.loadAssets(); // Discovers and loads automatically
        
        // Access loaded assets
        const background = this.getAsset('background');
        const music = this.getAsset('music');
        const sprites = this.getAsset('sprites');
    }
}
```

### Asset Manifests

```javascript
// Override auto-discovery with custom manifest
const customAssets = {
    images: ['player.png', 'enemies.png', 'tiles.png'],
    audio: ['bgm.mp3', 'sfx/jump.wav', 'sfx/shoot.wav'],
    data: ['level1.json', 'config.json']
};

await this.loadAssets(customAssets);
```

### Performance-Aware Loading

```javascript
// Preload common assets
await this.assetManager.preloadCommonAssets();

// Load with progress tracking
await this.loadAssets(manifest, (progress, assetName) => {
    this.updateLoadingBar(progress);
    console.log(`Loading: ${assetName} (${(progress * 100).toFixed(1)}%)`);
});
```

## Input Binding Presets

Pre-configured input schemes for different game types and contexts.

### Game Type Presets

```javascript
// Automatically bind controls for different game genres
this.bindGameControls('platformer');    // Arrow keys + Space/Z/X
this.bindGameControls('shooter');       // WASD + Space + Shift
this.bindGameControls('puzzle');        // Arrow keys + Space + Z + R
this.bindGameControls('rpg');           // WASD + E + I + M + Tab
this.bindGameControls('racing');        // Arrow keys + Space + Shift

// UI navigation presets
this.bindUINavigation();                // Tab, Enter, Escape, arrows
```

### Context-Aware Bindings

```javascript
// Different bindings for different contexts
this.inputBindings
    .pushContext('menu')
    .bindMap({
        'ArrowUp': 'menuUp',
        'ArrowDown': 'menuDown',
        'Enter': 'menuSelect'
    })
    .pushContext('game')
    .bindMap({
        'W': 'moveUp',
        'A': 'moveLeft',
        'S': 'moveDown',
        'D': 'moveRight'
    });
```

### Custom Action System

```javascript
// Define reusable actions
const jumpAction = new InputAction('jump', 'Make player jump', ['Space', 'W']);
const attackAction = new InputAction('attack', 'Attack enemies', ['X', 'LeftClick']);

// Register and apply actions
this.inputActionManager.registerAction(jumpAction);
this.inputActionManager.registerAction(attackAction);
this.inputActionManager.applyToBindings(this.inputBindings);
```

## Performance Monitoring

Automatic performance monitoring with optimization suggestions.

### Auto-Monitoring Setup

```javascript
class GameScene extends Scene {
    constructor(engine) {
        super(engine, {
            enablePerformanceMonitoring: true,
            autoOptimize: true  // Automatically apply optimizations
        });
    }

    init() {
        super.init();
        
        // Performance monitoring starts automatically
        // Shows overlay in debug mode
        if (this.engine.debug) {
            this.showPerformanceOverlay();
        }
    }
}
```

### Performance Budgets

```javascript
// Set performance budgets
this.performanceBudget.setBudget('frameTime', 16.67); // 60 FPS
this.performanceBudget.setBudget('particles', 1000);
this.performanceBudget.setBudget('drawCalls', 100);

// Monitor usage
this.performanceBudget.updateUsage('particles', this.particles.length);

// Get warnings when over budget
const warnings = this.performanceBudget.getWarnings();
```

### Auto-Optimization

```javascript
// Enable automatic optimizations
this.performanceMonitor.enableAutoOptimization({
    reduceFX: true,        // Reduce visual effects when FPS drops
    limitParticles: true,  // Limit particle count
    lowerResolution: true, // Reduce rendering resolution
    cullOffscreen: true    // Cull off-screen objects
});
```

## Complete Examples

### Minimal Platformer Game

```javascript
import { GameScene } from '../engine/ui/SceneTemplates.js';

class PlatformerScene extends GameScene {
    constructor(engine) {
        super('Platformer', {
            showHUD: true,
            autoSave: true
        });
    }

    init() {
        super.init();
        
        // Game controls auto-configured
        this.bindGameControls('platformer');
        
        // Assets auto-loaded from ./assets/scenes/platformer/
        // HUD automatically shows score, lives, level
        
        this.setupPlayer();
    }

    setupPlayer() {
        this.player = {
            x: 100, y: 300,
            health: 100,
            score: 0
        };
        
        // Data binding automatically updates HUD
        this.bindData('player.health', this.healthBar, 'value');
        this.bindData('player.score', this.scoreLabel, 'text');
    }

    updateGame(deltaTime) {
        this.updatePlayer(deltaTime);
        this.updateEnemies(deltaTime);
        
        // UI updates automatically via data binding
        this.updateData('player.score', this.player.score);
    }

    // Input methods auto-wired by game controls
    onMoveLeft() { this.player.x -= 200 * this.engine.deltaTime; }
    onMoveRight() { this.player.x += 200 * this.engine.deltaTime; }
    onJump() { /* jump logic */ }
}
```

### Settings Menu with Forms

```javascript
import { Scene } from '../engine/scenes/Scene.js';

class SettingsScene extends Scene {
    init() {
        super.init();
        
        // Create settings form with automatic validation
        this.createForm([
            { name: 'volume', label: 'Volume', type: 'range', required: true },
            { name: 'quality', label: 'Graphics', type: 'select', 
              options: ['low', 'medium', 'high'] },
            { name: 'fullscreen', label: 'Fullscreen', type: 'checkbox' }
        ], {
            onSubmit: (values) => this.applySettings(values)
        });
    }

    applySettings(settings) {
        this.engine.audio.setVolume(settings.volume);
        this.engine.renderer.setQuality(settings.quality);
        this.showNotification('Settings saved!', 'success');
    }
}
```

### Data-Driven UI Example

```javascript
// Define entire game menu structure in data
const gameMenuData = {
    title: 'Epic Adventure',
    version: '2.1.0',
    menu: [
        { text: 'New Game', icon: '🎮', action: 'newGame' },
        { text: 'Continue', icon: '💾', action: 'continueGame', 
          enabled: '{{hasSaveGame}}' },
        { text: 'Settings', icon: '⚙️', action: 'settings' },
        { text: 'Credits', icon: '👥', action: 'credits' },
        { text: 'Exit', icon: '🚪', action: 'exit' }
    ]
};

class DataDrivenMenu extends MenuScene {
    init() {
        super.init();
        
        // Generate entire menu from data
        this.generateMenuFromData(gameMenuData);
    }

    generateMenuFromData(data) {
        // Title
        this.ui.label(data.title)
            .fontSize(48)
            .centerScreen()
            .at(null, 100);

        // Menu items
        data.menu.forEach((item, index) => {
            this.ui.button(`${item.icon} ${item.text}`)
                .centerScreen()
                .at(null, 200 + index * 60)
                .onClick(() => this[item.action]?.())
                .disabled(!this.evaluateCondition(item.enabled));
        });
    }
}
```

## Migration Guide

### From Manual UI Creation

**Before (lots of boilerplate):**
```javascript
// Old way - lots of manual setup
const button = document.createElement('button');
button.textContent = 'Start Game';
button.style.position = 'absolute';
button.style.left = '50%';
button.style.top = '300px';
button.style.transform = 'translateX(-50%)';
button.addEventListener('click', () => {
    this.sceneManager.switchTo('GameScene');
});
this.container.appendChild(button);
```

**After (minimal boilerplate):**
```javascript
// New way - one line with auto-wiring
this.ui.button('Start Game').centerScreen().at(null, 300).build();

// Method is automatically called due to button text
onStartGame() {
    this.sceneManager.switchTo('GameScene');
}
```

### From Manual Asset Loading

**Before:**
```javascript
// Old way - manual asset management
const assets = [
    'images/player.png',
    'images/background.png',
    'audio/music.mp3',
    'data/level1.json'
];

for (const assetPath of assets) {
    await this.assetManager.load(assetPath);
}
```

**After:**
```javascript
// New way - automatic discovery and loading
await this.loadAssets(); // Finds and loads all scene assets automatically
```

### From Manual Input Handling

**Before:**
```javascript
// Old way - manual key binding
this.inputManager.on('ArrowLeft', () => this.player.moveLeft());
this.inputManager.on('ArrowRight', () => this.player.moveRight());
this.inputManager.on('Space', () => this.player.jump());
this.inputManager.on('X', () => this.player.attack());
```

**After:**
```javascript
// New way - automatic binding based on game type
this.bindGameControls('platformer');

// Methods automatically called by naming convention
onMoveLeft() { this.player.moveLeft(); }
onMoveRight() { this.player.moveRight(); }
onJump() { this.player.jump(); }
onAttack() { this.player.attack(); }
```

## Best Practices

1. **Use Scene Templates**: Start with scene templates and customize as needed
2. **Leverage Auto-Wiring**: Follow naming conventions for automatic event binding
3. **Embrace Declarative UI**: Use JSON definitions for complex UIs
4. **Enable Auto-Assets**: Let the engine discover and load assets automatically
5. **Use Input Presets**: Leverage pre-configured input schemes
6. **Monitor Performance**: Enable automatic performance monitoring
7. **Data Binding**: Use reactive data binding instead of manual UI updates

## Summary

The enhanced Hatch Engine dramatically reduces boilerplate code through:

- **Scene Templates**: Pre-configured scene types with smart defaults
- **Enhanced UI Builder**: Fluent API with magic methods and smart positioning
- **Auto-Wiring**: Automatic event binding based on naming conventions
- **Declarative UI**: JSON-based UI definitions
- **Smart Asset Management**: Automatic discovery and loading
- **Input Presets**: Pre-configured input schemes for different game types
- **Performance Monitoring**: Automatic monitoring with optimization suggestions

These features allow developers to focus on game logic rather than boilerplate setup, resulting in faster development and cleaner code.
