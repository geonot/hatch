import { GameLauncher } from '../../engine/core/GameLauncher.js';
import MinesweeperScene from './scenes/MinesweeperScene.js';

// Enhanced game setup using the proper GameLauncher API
GameLauncher.launch({
    configPath: './hatch.config.yaml',
    scenes: {
        MinesweeperScene: MinesweeperScene
    },
    initialScene: 'MinesweeperScene',
    onReady: (engine) => {
        console.log('Minesweeper Enhanced Edition Ready!');
        console.log('Performance monitoring enabled');
        console.log('Auto-wiring system active');
        console.log('Enhanced UI system loaded');
        
        // Set up global keyboard shortcuts
        if (engine.inputManager && engine.inputManager.bindGlobal) {
            engine.inputManager.bindGlobal('KeyP', () => {
                const monitor = engine.getSystem('PerformanceMonitor');
                if (monitor) {
                    monitor.toggleOverlay();
                }
            });
            
            engine.inputManager.bindGlobal('KeyH', () => {
                console.log('Minesweeper Controls:');
                console.log('  Left Click: Reveal cell');
                console.log('  Right Click: Flag/unflag cell');
                console.log('  R: Restart game');
                console.log('  1/2/3: Change difficulty');
                console.log('  P: Toggle performance overlay');
                console.log('  H: Show this help');
            });
        }
        
        // Show welcome message
        setTimeout(() => {
            console.log('Press H for controls, P for performance overlay');
        }, 1000);
    },
    onError: (error) => {
        console.error('Minesweeper startup error:', error);
    }
});