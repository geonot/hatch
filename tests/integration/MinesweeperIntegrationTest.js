/**
 * Integration test for the enhanced Minesweeper implementation
 * Validates that all enhanced features work together properly
 */

import { GameLauncher } from 'hatch-engine/core/GameLauncher.js';
import { PerformanceMonitor } from 'hatch-engine/performance/PerformanceMonitor.js';
import MinesweeperScene from '../../minesweeper/src/scenes/MinesweeperScene.js';

class MinesweeperIntegrationTest {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    async runAll() {
        console.log('🧪 Starting Minesweeper Integration Tests...');
        
        await this.testGameLauncherQuickStart();
        await this.testSceneTemplateFeatures();
        await this.testAutoWiringSystem();
        await this.testUIBuilderSystem();
        await this.testPerformanceMonitoring();
        await this.testThemeSystem();
        await this.testInputBindings();
        await this.testGameplayFeatures();
        
        this.printResults();
    }

    async testGameLauncherQuickStart() {
        this.test('GameLauncher Quick Start', async () => {
            const launcher = GameLauncher.create({
                scene: MinesweeperScene,
                features: {
                    performanceMonitoring: true,
                    autoWiring: true,
                    enhancedUI: true
                }
            });
            
            this.assert(launcher, 'GameLauncher should be created');
            this.assert(launcher.features.performanceMonitoring, 'Performance monitoring should be enabled');
            this.assert(launcher.features.autoWiring, 'Auto-wiring should be enabled');
            this.assert(launcher.features.enhancedUI, 'Enhanced UI should be enabled');
        });
    }

    async testSceneTemplateFeatures() {
        this.test('Scene Template Integration', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            
            this.assert(scene.title === 'Minesweeper', 'Scene should have correct title');
            this.assert(scene.autoWiringEnabled, 'Auto-wiring should be enabled');
            this.assert(scene.theme === 'minesweeper', 'Theme should be set correctly');
            
            // Test automatic initialization
            scene.init();
            this.assert(scene.gridManager, 'Grid manager should be initialized');
            this.assert(scene.ui, 'UI system should be available');
        });
    }

    async testAutoWiringSystem() {
        this.test('Auto-Wiring System', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            scene.init();
            
            // Test method detection
            const methods = scene.getAutoWiredMethods();
            this.assert(methods.includes('onRestart'), 'onRestart method should be auto-wired');
            this.assert(methods.includes('onDifficulty1'), 'onDifficulty1 method should be auto-wired');
            this.assert(methods.includes('onCellClick'), 'onCellClick method should be auto-wired');
            
            // Test key binding
            const keyBindings = scene.getKeyBindings();
            this.assert(keyBindings['KeyR'] === 'onRestart', 'R key should bind to restart');
            this.assert(keyBindings['Digit1'] === 'onDifficulty1', '1 key should bind to difficulty');
        });
    }

    async testUIBuilderSystem() {
        this.test('UI Builder System', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            scene.init();
            
            // Test UI elements creation
            const uiElements = scene.ui.getElements();
            this.assert(uiElements.mineCounter, 'Mine counter should be created');
            this.assert(uiElements.timer, 'Timer should be created');
            this.assert(uiElements.restartBtn, 'Restart button should be created');
            
            // Test fluent API
            const button = scene.ui.button('test')
                .text('Test')
                .onClick(() => {})
                .variant('primary');
            
            this.assert(button.text === 'Test', 'Button text should be set');
            this.assert(button.variant === 'primary', 'Button variant should be set');
            this.assert(typeof button.onClick === 'function', 'Button click handler should be set');
        });
    }

    async testPerformanceMonitoring() {
        this.test('Performance Monitoring', async () => {
            const mockEngine = this.createMockEngine();
            const monitor = new PerformanceMonitor(mockEngine);
            
            // Test metrics collection
            monitor.startFrame();
            monitor.endFrame();
            
            const metrics = monitor.getMetrics();
            this.assert(metrics.fps !== undefined, 'FPS should be tracked');
            this.assert(metrics.frameTime !== undefined, 'Frame time should be tracked');
            this.assert(metrics.memory !== undefined, 'Memory usage should be tracked');
            
            // Test optimization suggestions
            const suggestions = monitor.getOptimizationSuggestions();
            this.assert(Array.isArray(suggestions), 'Optimization suggestions should be available');
        });
    }

    async testThemeSystem() {
        this.test('Theme System', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            scene.init();
            
            // Test theme registration
            const themes = scene.ui.getThemes();
            this.assert(themes.minesweeper, 'Minesweeper theme should be registered');
            
            // Test theme properties
            const theme = themes.minesweeper;
            this.assert(theme.colors.primary, 'Theme should have primary color');
            this.assert(theme.variants.counter, 'Theme should have counter variant');
            
            // Test theme application
            scene.ui.setTheme('minesweeper');
            this.assert(scene.ui.currentTheme === 'minesweeper', 'Theme should be applied');
        });
    }

    async testInputBindings() {
        this.test('Input Binding System', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            scene.init();
            
            // Test input binding configuration
            const bindings = scene.inputBindings.getBindings();
            this.assert(bindings.restart === 'KeyR', 'Restart should be bound to R key');
            this.assert(bindings.difficulty1 === 'Digit1', 'Difficulty 1 should be bound to 1 key');
            
            // Test context management
            const context = scene.inputBindings.getContext();
            this.assert(context === 'minesweeper', 'Input context should be minesweeper');
        });
    }

    async testGameplayFeatures() {
        this.test('Gameplay Features', async () => {
            const mockEngine = this.createMockEngine();
            const scene = new MinesweeperScene(mockEngine);
            scene.init();
            
            // Test initial state
            this.assert(scene.gameState === 'ready', 'Initial game state should be ready');
            this.assert(scene.firstClick === true, 'Should be waiting for first click');
            
            // Test difficulty levels
            scene.changeDifficulty('BEGINNER');
            this.assert(scene.difficulty.cols === 9, 'Beginner should have 9 columns');
            this.assert(scene.difficulty.mines === 10, 'Beginner should have 10 mines');
            
            scene.changeDifficulty('EXPERT');
            this.assert(scene.difficulty.cols === 30, 'Expert should have 30 columns');
            this.assert(scene.difficulty.mines === 99, 'Expert should have 99 mines');
            
            // Test game restart
            scene.restartGame();
            this.assert(scene.gameState === 'ready', 'Game state should reset to ready');
            this.assert(scene.mines.size === 0, 'Mines should be cleared');
        });
    }

    test(name, testFunction) {
        this.results.total++;
        try {
            testFunction();
            this.results.passed++;
            console.log(`✅ ${name}`);
        } catch (error) {
            this.results.failed++;
            console.log(`❌ ${name}: ${error.message}`);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    createMockEngine() {
        return {
            getCanvas: () => ({ width: 800, height: 600 }),
            inputManager: {
                bindGlobal: () => {},
                on: () => {},
                off: () => {}
            },
            uiManager: {
                registerTheme: () => {},
                setTheme: () => {},
                createComponent: () => ({})
            },
            performanceMonitor: {
                track: () => {},
                getMetrics: () => ({})
            },
            createGridManager: () => ({
                cols: 9,
                rows: 9,
                getCellBounds: () => ({ x: 0, y: 0, width: 40, height: 40 })
            }),
            createStateManager: () => ({
                setCellState: () => {},
                getCellState: () => ({ state: 'hidden', data: {} })
            })
        };
    }

    printResults() {
        console.log('\\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Total: ${this.results.total}`);
        console.log(`🎯 Success Rate: ${Math.round(this.results.passed / this.results.total * 100)}%`);
        
        if (this.results.failed === 0) {
            console.log('\\n🎉 All tests passed! The enhanced Minesweeper implementation is working correctly.');
        } else {
            console.log('\\n⚠️ Some tests failed. Please review the implementation.');
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new MinesweeperIntegrationTest();
    tester.runAll();
}

export default MinesweeperIntegrationTest;
