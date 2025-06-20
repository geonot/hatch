import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
// import TestScene from './scenes/TestScene.js'; // Keep this commented for now

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
        // engine.init() is synchronous in the current implementation.
        // If it becomes async, 'await' would be appropriate here.
        engine.init();
        console.log("Engine initialized from main.js");
        engine.start();
    } catch (error) {
        console.error("Error during engine initialization or start:", error);
        if (engine && engine.errorHandler) {
            // Ensure critical is called on the instance if available
            engine.errorHandler.critical("Failed to initialize or start engine from main.js", error);
        } else {
            // Fallback if errorHandler itself is not available on engine
            throw error;
        }
    }

    // engine.scenes.add('TestScene', TestScene); // Will be done later
    // engine.scenes.switchTo(hatchConfig.initialScene || 'TestScene'); // Will be done later
}

gameMain();