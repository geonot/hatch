import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
// AssetManager, InputManager, RenderingEngine, SceneManager are now auto-instantiated by HatchEngine.init()
import TestScene from './scenes/TestScene.js';

console.log("Hatch game starting...");

// Local loadConfig function is now removed.
// HatchEngine.loadProjectConfig() will be used instead.

async function gameMain() { // Renamed to avoid conflict with outer 'main'
    // Load project configuration using the static method from HatchEngine
    const hatchConfig = await HatchEngine.loadProjectConfig('/hatch.config.yaml');
    // Note: '/hatch.config.yaml' is the default, so could be HatchEngine.loadProjectConfig()

    const engineConfig = {
        canvasId: hatchConfig.canvasId || 'gameCanvas',
        width: hatchConfig.gameWidth || 800,
        height: hatchConfig.gameHeight || 600,
        hatchConfig: hatchConfig // Pass the full config to the engine
    };

    const engine = new HatchEngine(engineConfig);

    try {
        engine.init(); // Sets up engine.canvas, engine.ctx, and core managers

        // Core managers (assetManager, inputManager, renderingEngine, sceneManager)
        // are now automatically instantiated within engine.init().

        // Load asset manifest if specified in config
        // Ensure engine.assetManager is available (it should be after init())
        if (hatchConfig.assetManifest && engine.assetManager) {
            try {
                // AssetManager.loadManifest now supports string paths directly
                await engine.assetManager.loadManifest(hatchConfig.assetManifest);
                console.log(`Asset manifest '${hatchConfig.assetManifest}' loaded or loading initiated.`);
            } catch (e) {
                console.error("Failed to load asset manifest:", e);
                engine.errorHandler.error("Failed to load asset manifest", { path: hatchConfig.assetManifest, error: e });
            }
        }

        // Add and switch to the initial scene
        // Register the TestScene class; SceneManager will instantiate it on first switch.
        if (engine.sceneManager && TestScene) {
            engine.sceneManager.add(hatchConfig.initialScene || 'TestScene', TestScene);
            await engine.sceneManager.switchTo(hatchConfig.initialScene || 'TestScene');
            console.log(`Switched to initial scene: ${hatchConfig.initialScene || 'TestScene'}`);
        } else {
            const missingComponent = !engine.sceneManager ? "SceneManager" : "TestScene";
            engine.errorHandler.critical(`Failed to initialize scenes: ${missingComponent} is not available.`);
            return; // Stop if scene setup cannot proceed
        }

        console.log("Engine initialized from main.js with managers and scene.");
        engine.start();

    } catch (error) {
        console.error("Error during engine initialization or start:", error);
        if (engine && engine.errorHandler) {
            engine.errorHandler.critical("Failed to initialize or start engine from main.js", { originalError: error });
        } else {
            throw error;
        }
    }
}

gameMain();