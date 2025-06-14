import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
import { AssetManager } from 'hatch-engine/assets/AssetManager.js';
import { InputManager } from 'hatch-engine/input/InputManager.js';
import { RenderingEngine } from 'hatch-engine/rendering/RenderingEngine.js';
import { SceneManager } from 'hatch-engine/scenes/SceneManager.js';
import TestScene from './scenes/TestScene.js';

console.log("Hatch game starting...");

// Function to load and parse hatch.config.yaml
async function loadConfig() {
    try {
        const response = await fetch('/hatch.config.yaml'); // Fetches from the public root
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const yamlText = await response.text();
        // Simple YAML parser (can be replaced with a library later if complex features are needed)
        const config = {};
        yamlText.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                config[parts[0].trim()] = parts[1].trim();
            }
        });
        // Convert numeric values
        if (config.gameWidth) config.gameWidth = parseInt(config.gameWidth, 10);
        if (config.gameHeight) config.gameHeight = parseInt(config.gameHeight, 10);
        if (isNaN(config.gameWidth)) config.gameWidth = 800; // Default if parsing failed
        if (isNaN(config.gameHeight)) config.gameHeight = 600; // Default if parsing failed
        return config;
    } catch (e) {
        console.error("Failed to load or parse hatch.config.yaml", e);
        // Fallback or default config
        return {
            projectName: 'MyHatchGame',
            canvasId: 'gameCanvas',
            gameWidth: 800,
            gameHeight: 600,
            initialScene: 'TestScene'
            // assetManifest will be undefined, so manifest loading will be skipped or handled by AssetManager if path is null/undefined
        };
    }
}

async function gameMain() { // Renamed to avoid conflict with outer 'main'
    const hatchConfig = await loadConfig();

    const engineConfig = {
        canvasId: hatchConfig.canvasId || 'gameCanvas',
        width: hatchConfig.gameWidth || 800,
        height: hatchConfig.gameHeight || 600,
        hatchConfig: hatchConfig // Pass the full config to the engine
    };

    const engine = new HatchEngine(engineConfig);

    try {
        engine.init(); // Sets up engine.canvas and engine.ctx

        // Instantiate managers and attach to the engine instance
        // These managers might need the engine instance for error handling, event bus, or config
        engine.assetManager = new AssetManager(engine);
        engine.inputManager = new InputManager(engine, engine.canvas); // InputManager needs canvas for event listeners
        engine.renderingEngine = new RenderingEngine(engine.canvas, engine); // RenderingEngine needs canvas
        engine.sceneManager = new SceneManager(engine);

        // Load asset manifest if specified in config
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
        if (engine.sceneManager && TestScene) {
            engine.sceneManager.add(hatchConfig.initialScene || 'TestScene', new TestScene(engine));
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