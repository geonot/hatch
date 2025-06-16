import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
// Core managers (AssetManager, InputManager, RenderingEngine, SceneManager)
// are now automatically instantiated within engine.init().
import TestScene from './scenes/TestScene.js'; // Default scene

console.log("Hatch game starting...");

async function gameMain() {
    const hatchConfig = await HatchEngine.loadProjectConfig();

    const engine = new HatchEngine(hatchConfig);

    try {
        engine.init();

        if (hatchConfig.assetManifest && engine.assetManager) {
            try {
                await engine.assetManager.loadManifest(hatchConfig.assetManifest);
                console.log(`Asset manifest '${hatchConfig.assetManifest}' loaded or loading initiated.`);
            } catch (e) {
                console.error("Failed to load asset manifest:", e);
                if (engine.errorHandler) {
                    engine.errorHandler.error("Failed to load asset manifest", { path: hatchConfig.assetManifest, error: e });
                }
            }
        }

        if (engine.sceneManager && TestScene) {
            engine.sceneManager.add(hatchConfig.initialScene, TestScene);
            await engine.sceneManager.switchTo(hatchConfig.initialScene);
            console.log(`Switched to initial scene: ${hatchConfig.initialScene}`);
        } else {
            const missingComponent = !engine.sceneManager ? "SceneManager" : "TestScene class";
            const errorMessage = `Failed to initialize scenes: ${missingComponent} is not available. Ensure TestScene is imported and hatchConfig.initialScene is set.`;
            console.error(errorMessage);
            if (engine.errorHandler) {
                engine.errorHandler.critical(errorMessage);
            }
            return;
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