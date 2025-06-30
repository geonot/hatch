/**
 * @file SceneTemplates.js
 * @description Pre-configured scene templates for rapid development
 */

import { Scene } from '../scenes/Scene.js';
import { UIBuilder } from './UIBuilderEnhanced.js';
import { AutoWiring } from './AutoWiring.js';

/**
 * @class SceneTemplate
 * @classdesc Base class for scene templates with automatic setup
 */
export class SceneTemplate extends Scene {
    constructor(name, options = {}) {
        super(name);
        
        this.templateOptions = {
            autoUI: true,
            autoWiring: true,
            autoAssets: true,
            autoInput: true,
            ...options
        };
        
        this.ui = null;
        this.autoWiring = null;
        this.data = {};
        this.hooks = new Map();
        
        if (this.templateOptions.autoUI) {
            this._setupAutoUI();
        }
        
        if (this.templateOptions.autoWiring) {
            this._setupAutoWiring();
        }
    }

    // Template lifecycle hooks
    onTemplateInit() {}
    onTemplateReady() {}
    onTemplateDestroy() {}

    // Quick UI creation methods
    quickButton(text, handler, options = {}) {
        const button = this.ui.button(text, options);
        if (handler) {
            button.onClick(handler.bind(this));
        }
        return button.build();
    }

    quickInput(placeholder, handler, options = {}) {
        const input = this.ui.input(placeholder, options);
        if (handler) {
            input.onChange(handler.bind(this));
        }
        return input.build();
    }

    quickLabel(text, options = {}) {
        return this.ui.label(text, options).build();
    }

    quickModal(title, content, options = {}) {
        const modal = this.ui.modal(title, options);
        if (typeof content === 'string') {
            modal.content(content);
        } else if (typeof content === 'function') {
            content(modal);
        }
        return modal.build();
    }

    // Data binding helpers
    bindData(path, component, property = 'text') {
        const value = this._getNestedValue(this.data, path);
        if (value !== undefined) {
            component[property] = value;
        }
        
        // Setup reactive updates
        this._watchData(path, (newValue) => {
            component[property] = newValue;
        });
    }

    updateData(path, value) {
        this._setNestedValue(this.data, path, value);
        this._notifyDataChange(path, value);
    }

    // Hook system
    addHook(event, handler) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event).push(handler);
    }

    runHooks(event, ...args) {
        if (this.hooks.has(event)) {
            this.hooks.get(event).forEach(handler => {
                handler.call(this, ...args);
            });
        }
    }

    // Asset loading helpers
    async loadAssets(manifest) {
        if (Array.isArray(manifest)) {
            // Simple array of asset paths
            return Promise.all(manifest.map(path => this.assetLoader.load(path)));
        } else if (typeof manifest === 'object') {
            // Object with named assets
            const results = {};
            await Promise.all(Object.entries(manifest).map(async ([name, path]) => {
                results[name] = await this.assetLoader.load(path);
            }));
            return results;
        }
    }

    // Input binding helpers
    bindKey(key, handler, options = {}) {
        this.inputManager.on(key, handler.bind(this), options);
    }

    bindKeys(keyMap) {
        Object.entries(keyMap).forEach(([key, handler]) => {
            this.bindKey(key, handler);
        });
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        this._performanceMonitor = {
            frameCount: 0,
            startTime: performance.now(),
            lastFrameTime: performance.now(),
            averageFPS: 0
        };
        
        this.addHook('update', this._updatePerformanceStats.bind(this));
    }

    getPerformanceStats() {
        return this._performanceMonitor;
    }

    // Private methods
    _setupAutoUI() {
        this.ui = new UIBuilder(this.uiManager, this);
        this.ui.scene = this;
    }

    _setupAutoWiring() {
        this.autoWiring = new AutoWiring(this.uiManager);
        this.autoWiring.registerScene(this);
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

    _updatePerformanceStats(deltaTime) {
        if (!this._performanceMonitor) return;
        
        const now = performance.now();
        this._performanceMonitor.frameCount++;
        
        const elapsed = now - this._performanceMonitor.startTime;
        if (elapsed >= 1000) {
            this._performanceMonitor.averageFPS = (this._performanceMonitor.frameCount * 1000) / elapsed;
            this._performanceMonitor.frameCount = 0;
            this._performanceMonitor.startTime = now;
        }
        
        this._performanceMonitor.lastFrameTime = now;
    }
}

/**
 * @class MenuScene
 * @classdesc Template for main menu scenes
 */
export class MenuScene extends SceneTemplate {
    constructor(name, options = {}) {
        super(name, {
            backgroundColor: '#1e1e1e',
            showLogo: true,
            showVersion: true,
            animateEntrance: true,
            ...options
        });
        
        this.menuItems = [];
    }

    init() {
        super.init();
        
        if (this.templateOptions.showLogo) {
            this._createLogo();
        }
        
        this._createMenuItems();
        
        if (this.templateOptions.showVersion) {
            this._createVersionInfo();
        }
        
        if (this.templateOptions.animateEntrance) {
            this._animateEntrance();
        }
        
        this.runHooks('menuReady');
    }

    addMenuItem(text, handler, options = {}) {
        this.menuItems.push({ text, handler, options });
        return this;
    }

    removeMenuItem(text) {
        this.menuItems = this.menuItems.filter(item => item.text !== text);
        return this;
    }

    _createLogo() {
        this.logo = this.ui.label(this.templateOptions.gameTitle || 'Game Title')
            .fontSize(48)
            .textColor('#ffffff')
            .centerScreen()
            .at(null, 100) // Keep centered X, set Y to 100
            .build();
    }

    _createMenuItems() {
        const startY = 250;
        const spacing = 60;
        
        this.menuItems.forEach((item, index) => {
            const button = this.ui.button(item.text, item.options)
                .variant('ghost')
                .fontSize(18)
                .width(200)
                .centerScreen()
                .at(null, startY + (index * spacing))
                .onClick(item.handler.bind(this))
                .hover(
                    () => this._onMenuItemHover(button),
                    () => this._onMenuItemLeave(button)
                )
                .build();
            
            item.component = button;
        });
    }

    _createVersionInfo() {
        this.versionLabel = this.ui.label(`v${this.templateOptions.version || '1.0.0'}`)
            .fontSize(12)
            .textColor('#666')
            .bottomRight()
            .build();
    }

    _animateEntrance() {
        // Animate logo
        if (this.logo) {
            this.logo.fadeIn(800);
        }
        
        // Animate menu items with stagger
        this.menuItems.forEach((item, index) => {
            if (item.component) {
                setTimeout(() => {
                    item.component.slideIn('left', 400);
                }, index * 100);
            }
        });
    }

    _onMenuItemHover(button) {
        button.animate({ scale: 1.1, textColor: '#ffffff' }, 200);
    }

    _onMenuItemLeave(button) {
        button.animate({ scale: 1.0, textColor: '#cccccc' }, 200);
    }

    // Default handlers that can be overridden
    onStart() {
        console.log('Start game');
    }

    onSettings() {
        console.log('Show settings');
    }

    onExit() {
        console.log('Exit game');
    }
}

/**
 * @class GameScene
 * @classdesc Template for gameplay scenes with HUD
 */
export class GameScene extends SceneTemplate {
    constructor(name, options = {}) {
        super(name, {
            showHUD: true,
            showPauseMenu: true,
            autoSave: false,
            ...options
        });
        
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
    }

    init() {
        super.init();
        
        if (this.templateOptions.showHUD) {
            this._createHUD();
        }
        
        if (this.templateOptions.showPauseMenu) {
            this._setupPauseMenu();
        }
        
        // Bind common game keys
        this.bindKeys({
            'Escape': this.togglePause,
            'P': this.togglePause,
            'Space': this.handleAction
        });
        
        this.runHooks('gameReady');
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.gameState === 'playing') {
            this.updateGame(deltaTime);
            this._updateHUD();
        }
    }

    // Override in subclasses
    updateGame(deltaTime) {}

    pause() {
        this.gameState = 'paused';
        this.runHooks('gamePaused');
    }

    resume() {
        this.gameState = 'playing';
        this.runHooks('gameResumed');
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.pause();
        } else if (this.gameState === 'paused') {
            this.resume();
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.runHooks('gameOver', this.score);
        this._showGameOverScreen();
    }

    addScore(points) {
        this.score += points;
        this.runHooks('scoreChanged', this.score);
    }

    loseLife() {
        this.lives--;
        this.runHooks('livesChanged', this.lives);
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    nextLevel() {
        this.level++;
        this.runHooks('levelChanged', this.level);
    }

    _createHUD() {
        // Score display
        this.scoreLabel = this.ui.label(`Score: ${this.score}`)
            .topLeft()
            .fontSize(18)
            .textColor('#ffffff')
            .build();
        
        // Lives display
        this.livesLabel = this.ui.label(`Lives: ${this.lives}`)
            .topLeft()
            .at(null, 50)
            .fontSize(18)
            .textColor('#ffffff')
            .build();
        
        // Level display
        this.levelLabel = this.ui.label(`Level: ${this.level}`)
            .topLeft()
            .at(null, 80)
            .fontSize(18)
            .textColor('#ffffff')
            .build();
    }

    _updateHUD() {
        if (this.scoreLabel) {
            this.scoreLabel.text = `Score: ${this.score}`;
        }
        if (this.livesLabel) {
            this.livesLabel.text = `Lives: ${this.lives}`;
        }
        if (this.levelLabel) {
            this.levelLabel.text = `Level: ${this.level}`;
        }
    }

    _setupPauseMenu() {
        this.pauseMenu = null; // Created on demand
    }

    _showPauseMenu() {
        if (this.pauseMenu) return;
        
        this.pauseMenu = this.ui.modal('Paused')
            .centerScreen()
            .color('#000000aa')
            .build();
        
        // Add pause menu buttons
        this.ui.button('Resume')
            .onClick(() => {
                this.resume();
                this._hidePauseMenu();
            })
            .build();
        
        this.ui.button('Settings')
            .onClick(this.onPauseSettings.bind(this))
            .build();
        
        this.ui.button('Main Menu')
            .onClick(this.onPauseMainMenu.bind(this))
            .build();
    }

    _hidePauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.destroy();
            this.pauseMenu = null;
        }
    }

    _showGameOverScreen() {
        const gameOverModal = this.ui.modal('Game Over')
            .centerScreen()
            .build();
        
        this.ui.label(`Final Score: ${this.score}`)
            .fontSize(24)
            .centerScreen()
            .build();
        
        this.ui.buttonGroup(['Play Again', 'Main Menu'])
            .build();
    }

    // Default handlers
    handleAction() {
        // Override in subclasses
    }

    onPauseSettings() {
        console.log('Show pause settings');
    }

    onPauseMainMenu() {
        console.log('Return to main menu');
    }

    onPlayAgain() {
        console.log('Restart game');
    }
}

/**
 * @class LoadingScene
 * @classdesc Template for loading screens
 */
export class LoadingScene extends SceneTemplate {
    constructor(name, options = {}) {
        super(name, {
            showProgressBar: true,
            showTips: true,
            animatedBackground: true,
            ...options
        });
        
        this.loadingProgress = 0;
        this.loadingTasks = [];
        this.currentTip = 0;
        this.tips = options.tips || ['Loading...', 'Please wait...'];
    }

    init() {
        super.init();
        
        this._createLoadingUI();
        this._startTipRotation();
        
        if (this.templateOptions.animatedBackground) {
            this._startBackgroundAnimation();
        }
    }

    addLoadingTask(name, task) {
        this.loadingTasks.push({ name, task, completed: false });
    }

    async executeLoadingTasks() {
        const totalTasks = this.loadingTasks.length;
        
        for (let i = 0; i < this.loadingTasks.length; i++) {
            const task = this.loadingTasks[i];
            
            this._updateLoadingText(`Loading ${task.name}...`);
            
            try {
                await task.task();
                task.completed = true;
            } catch (error) {
                console.error(`Failed to load ${task.name}:`, error);
            }
            
            this.loadingProgress = (i + 1) / totalTasks;
            this._updateProgress();
        }
        
        this.runHooks('loadingComplete');
    }

    _createLoadingUI() {
        // Loading title
        this.titleLabel = this.ui.label('Loading')
            .fontSize(36)
            .textColor('#ffffff')
            .centerScreen()
            .at(null, 200)
            .build();
        
        // Progress bar
        if (this.templateOptions.showProgressBar) {
            this.progressBar = this.ui.progressBar(0, 100)
                .width(400)
                .height(20)
                .centerScreen()
                .at(null, 300)
                .build();
        }
        
        // Loading text
        this.loadingText = this.ui.label('Initializing...')
            .fontSize(16)
            .textColor('#cccccc')
            .centerScreen()
            .at(null, 350)
            .build();
        
        // Tips
        if (this.templateOptions.showTips && this.tips.length > 0) {
            this.tipLabel = this.ui.label(this.tips[0])
                .fontSize(14)
                .textColor('#999999')
                .centerScreen()
                .at(null, 450)
                .build();
        }
    }

    _updateProgress() {
        if (this.progressBar) {
            this.progressBar.value = this.loadingProgress * 100;
        }
    }

    _updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.text = text;
        }
    }

    _startTipRotation() {
        if (!this.tipLabel || this.tips.length <= 1) return;
        
        setInterval(() => {
            this.currentTip = (this.currentTip + 1) % this.tips.length;
            this.tipLabel.text = this.tips[this.currentTip];
        }, 3000);
    }

    _startBackgroundAnimation() {
        // Simple animated background effect
        let rotation = 0;
        const animate = () => {
            rotation += 0.5;
            // Apply background animation logic here
            requestAnimationFrame(animate);
        };
        animate();
    }
}

/**
 * @class DialogScene
 * @classdesc Template for dialog/conversation scenes
 */
export class DialogScene extends SceneTemplate {
    constructor(name, options = {}) {
        super(name, {
            typewriterEffect: true,
            showSpeakerName: true,
            allowSkip: true,
            ...options
        });
        
        this.dialogData = [];
        this.currentDialog = 0;
        this.isTyping = false;
    }

    init() {
        super.init();
        this._createDialogUI();
        
        if (this.templateOptions.allowSkip) {
            this.bindKey('Space', this.nextDialog);
            this.bindKey('Enter', this.nextDialog);
        }
    }

    setDialog(dialogData) {
        this.dialogData = dialogData;
        this.currentDialog = 0;
        this.showCurrentDialog();
    }

    nextDialog() {
        if (this.isTyping && this.templateOptions.typewriterEffect) {
            // Skip typing animation
            this._completeTyping();
            return;
        }
        
        this.currentDialog++;
        if (this.currentDialog >= this.dialogData.length) {
            this.runHooks('dialogComplete');
            return;
        }
        
        this.showCurrentDialog();
    }

    showCurrentDialog() {
        const dialog = this.dialogData[this.currentDialog];
        if (!dialog) return;
        
        if (this.templateOptions.showSpeakerName && dialog.speaker) {
            this.speakerLabel.text = dialog.speaker;
        }
        
        if (this.templateOptions.typewriterEffect) {
            this._typeText(dialog.text);
        } else {
            this.dialogText.text = dialog.text;
        }
        
        this.runHooks('dialogChanged', dialog, this.currentDialog);
    }

    _createDialogUI() {
        // Dialog box background
        this.dialogBox = this.ui.container()
            .bounds(50, 400, 700, 150)
            .color('#000000cc')
            .border('2px solid #ffffff')
            .rounded(8)
            .padding(20)
            .build();
        
        // Speaker name
        if (this.templateOptions.showSpeakerName) {
            this.speakerLabel = this.ui.label('')
                .at(70, 420)
                .fontSize(16)
                .textColor('#ffff00')
                .build();
        }
        
        // Dialog text
        this.dialogText = this.ui.label('')
            .at(70, 450)
            .width(660)
            .fontSize(14)
            .textColor('#ffffff')
            .build();
        
        // Continue indicator
        this.continueIndicator = this.ui.label('▼')
            .bottomRight()
            .at(750, 530)
            .fontSize(12)
            .textColor('#ffffff')
            .hidden(true)
            .build();
    }

    _typeText(text) {
        this.isTyping = true;
        this.dialogText.text = '';
        this.continueIndicator.hidden(true);
        
        let index = 0;
        const typeSpeed = 50; // ms per character
        
        const typeNextChar = () => {
            if (index < text.length) {
                this.dialogText.text += text[index];
                index++;
                setTimeout(typeNextChar, typeSpeed);
            } else {
                this._completeTyping();
            }
        };
        
        typeNextChar();
    }

    _completeTyping() {
        this.isTyping = false;
        this.continueIndicator.hidden(false);
        
        // Show blinking animation for continue indicator
        this._animateContinueIndicator();
    }

    _animateContinueIndicator() {
        if (this.continueIndicator && !this.isTyping) {
            this.continueIndicator.animate({ opacity: 0.3 }, 500)
                .then(() => {
                    if (!this.isTyping) {
                        this.continueIndicator.animate({ opacity: 1 }, 500)
                            .then(() => this._animateContinueIndicator());
                    }
                });
        }
    }
}

// Export scene template factory
export class SceneTemplateFactory {
    static create(type, name, options = {}) {
        switch (type) {
            case 'menu':
                return new MenuScene(name, options);
            case 'game':
                return new GameScene(name, options);
            case 'loading':
                return new LoadingScene(name, options);
            case 'dialog':
                return new DialogScene(name, options);
            default:
                return new SceneTemplate(name, options);
        }
    }

    static getAvailableTypes() {
        return ['menu', 'game', 'loading', 'dialog', 'template'];
    }
}
