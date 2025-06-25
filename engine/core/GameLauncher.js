/**
 * @file GameLauncher.js
 * @description Simplified game initialization API that reduces boilerplate
 * and provides a clean, declarative way to start games.
 */

import { HatchEngine } from './HatchEngine.js';
import { getLogger } from './Logger.js';

/**
 * @class GameLauncher
 * @classdesc Provides a simplified, declarative API for game initialization.
 * Reduces main.js to just a few lines while handling all the common setup patterns.
 */
export class GameLauncher {
    /**
     * Launches a game with minimal configuration.
     * @param {Object} options - Game launch options
     * @param {string} [options.configPath='./hatch.config.yaml'] - Path to config file
     * @param {Object} options.scenes - Map of scene names to scene classes
     * @param {string} [options.initialScene] - Override initial scene from config
     * @param {Function} [options.onReady] - Callback when engine is ready but before start
     * @param {Function} [options.onError] - Custom error handler
     * @returns {Promise<HatchEngine>} The initialized engine instance
     * 
     * @example
     * // Minimal game setup
     * import { GameLauncher } from 'hatch-engine/core/GameLauncher.js';
     * import MinesweeperScene from './scenes/MinesweeperScene.js';
     * 
     * GameLauncher.launch({
     *   scenes: {
     *     MinesweeperScene: MinesweeperScene
     *   }
     * });
     */
    static async launch(options = {}) {
        const {
            configPath = './hatch.config.yaml',
            scenes = {},
            initialScene,
            onReady,
            onError
        } = options;

        // Initialize logger for GameLauncher
        const logger = getLogger('GameLauncher');

        try {
            // Load configuration
            const config = await HatchEngine.loadProjectConfig(configPath);
            if (!config) {
                throw new Error("Failed to load project configuration");
            }

            // Override initial scene if provided
            if (initialScene) {
                config.initialScene = initialScene;
            }

            // Create and initialize engine
            const engine = new HatchEngine(config);
            await engine.init();

            // Auto-load asset manifest if specified
            if (config.assetManifest && engine.assetManager) {
                try {
                    await engine.assetManager.loadManifest(config.assetManifest);
                    logger.info(`Asset manifest '${config.assetManifest}' loaded`);
                } catch (e) {
                    console.warn("Failed to load asset manifest:", e);
                    engine.errorHandler.warn("Failed to load asset manifest", { 
                        path: config.assetManifest, 
                        error: e 
                    });
                }
            }

            // Register all provided scenes
            Object.entries(scenes).forEach(([sceneName, SceneClass]) => {
                engine.sceneManager.add(sceneName, SceneClass);
            });

            // Switch to initial scene
            if (config.initialScene && scenes[config.initialScene]) {
                await engine.sceneManager.switchTo(config.initialScene);
                logger.info(`Switched to initial scene: ${config.initialScene}`);
            } else if (Object.keys(scenes).length === 1) {
                // If only one scene provided, use it as default
                const defaultSceneName = Object.keys(scenes)[0];
                await engine.sceneManager.switchTo(defaultSceneName);
                logger.info(`Switched to default scene: ${defaultSceneName}`);
            }

            // Call ready callback if provided
            if (onReady) {
                await onReady(engine);
            }

            // Start the engine
            engine.start();

            // Expose globally for debugging
            if (typeof window !== 'undefined') {
                window.engine = engine;
                logger.debug("Engine exposed globally as window.engine");
            }

            logger.info("Game launched successfully");
            return engine;

        } catch (error) {
            console.error("Error during game launch:", error);
            
            if (onError) {
                onError(error);
            } else {
                // Default error display
                GameLauncher._displayError(error);
            }
            
            throw error;
        }
    }

    /**
     * Display a user-friendly error message on the canvas
     * @param {Error} error - The error to display
     * @private
     */
    static _displayError(error) {
        try {
            const canvas = document.getElementById('gameCanvas');
            if (canvas && canvas.getContext) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f44336';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Game Failed to Load', canvas.width / 2, canvas.height / 2 - 40);
                
                ctx.font = '16px Arial';
                ctx.fillText('Check browser console for details', canvas.width / 2, canvas.height / 2 + 20);
                
                ctx.font = '12px monospace';
                ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 50);
            }
        } catch (displayError) {
            console.error("Failed to display error message:", displayError);
        }
    }

    /**
     * Quick setup for single-scene games
     * @param {Function} SceneClass - The scene class to use
     * @param {Object} [options] - Additional options
     * @returns {Promise<HatchEngine>} The initialized engine
     * 
     * @example
     * // Ultra-simple single scene game
     * import { GameLauncher } from 'hatch-engine/core/GameLauncher.js';
     * import MyGameScene from './scenes/MyGameScene.js';
     * 
     * GameLauncher.quickStart(MyGameScene);
     */
    static async quickStart(SceneClass, options = {}) {
        const sceneName = SceneClass.name || 'GameScene';
        return GameLauncher.launch({
            scenes: { [sceneName]: SceneClass },
            initialScene: sceneName,
            ...options
        });
    }
}

// Support both named and default exports for flexibility
export default GameLauncher;
