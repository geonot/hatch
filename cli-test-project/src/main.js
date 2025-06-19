import { HatchEngine } from '/engine/core/HatchEngine.js'; // Adjusted path
// AssetManager, InputManager, RenderingEngine, SceneManager are now auto-instantiated by HatchEngine.init()
import TestScene from './scenes/TestScene.js';
import { GridTestScene } from './scenes/GridTestScene.js'; // Import new scene

console.log("Hatch game starting...");

// Local loadConfig function is now removed.
// HatchEngine.loadProjectConfig() will be used instead.

async function gameMain() { // Renamed to avoid conflict with outer 'main'
    // Load project configuration using the static method from HatchEngine
    const projectConfig = await HatchEngine.loadProjectConfig('/hatch.config.yaml');
    if (!projectConfig) {
        console.error("Failed to load project configuration. Cannot start engine.");
        return;
    }

    const engine = new HatchEngine(projectConfig); // Pass projectConfig directly

    try {
        engine.init(); // Sets up engine.canvas, engine.ctx, and core managers

        // Load the global asset manifest if specified in config
        if (engine.hatchConfig && engine.hatchConfig.assetManifest) {
            await engine.assetManager.loadManifest(engine.hatchConfig.assetManifest);
            engine.errorHandler.info(`Asset manifest '${engine.hatchConfig.assetManifest}' loading initiated.`, {component: 'main'});
        } else {
            // Manually load simpleAtlas if no global manifest or if it's not included there.
            engine.errorHandler.warn("No global assetManifest specified in hatch.config.yaml. Attempting manual load for GridTestScene assets.", {component: 'main'});
            try {
                await engine.assetManager.getSpriteAtlas('simpleAtlas', 'assets/data/simple_atlas.json', 'assets/images/simple_atlas.png');
                engine.errorHandler.info("Manually loaded 'simpleAtlas' for GridTestScene.", {component: 'main'});
            } catch (e) {
                engine.errorHandler.error("Failed to manually load 'simpleAtlas'. GridTestScene might not render sprites correctly.", {component: 'main', error: e});
            }
        }

        // Add scenes
        if (TestScene) { // Keep TestScene if it exists and is imported
            engine.sceneManager.add('test', TestScene);
        }
        engine.sceneManager.add('gridTest', GridTestScene); // Add new scene

        // Switch to the desired scene
        // You can change 'gridTest' to 'test' or projectConfig.initialScene if needed
        const initialSceneName = projectConfig.initialScene === 'gridTest' || !TestScene ? 'gridTest' : projectConfig.initialScene || 'gridTest';
        await engine.sceneManager.switchTo(initialSceneName);
        engine.errorHandler.info(`Switched to initial scene: ${initialSceneName}`, {component: 'main'});

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