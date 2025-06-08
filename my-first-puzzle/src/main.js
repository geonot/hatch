/**
 * @file main.js
 * @description Entry point for the "my-first-puzzle" game.
 */

// Assuming HatchEngine is in a relative path like '../../engine/core/HatchEngine.js'
// Adjust the path based on your actual project structure.
// For a monorepo structure where 'engine' and 'my-first-puzzle' are siblings:
import HatchEngine from '../../engine/core/HatchEngine.js';
// Sprite import is no longer needed here, TestScene will import it.
// import Sprite from '../../engine/rendering/Sprite.js';
import TestScene from './scenes/TestScene.js'; // Import the scene

/**
 * Main function to initialize and start the game engine.
 */
async function main() {
    console.log("Starting My First Puzzle game with SceneManager...");

    // Define the game configuration
    const config = {
        project: {
            name: "My First Puzzle",
            version: "0.1.0",
        },
        engine: {
            canvasId: 'gameCanvas',
            width: 800,
            height: 600,
            showDebugInfo: true,
            initialScene: "testScene", // Specify the initial scene
            // renderingOptions: { alpha: false }
        },
        game: {
            // Game-specific configs
            defaultTestSceneMessage: "Hello from main.js config!"
        }
    };

    const engine = new HatchEngine(config);

    // Register scene classes with the engine
    engine.registerScene('testScene', TestScene);
    // Example: engine.registerScene('mainMenu', MainMenuScene);

    try {
        // Initialize the engine, passing initial scene name from config
        // and any arguments for that scene's init method.
        await engine.init({
            initialSceneName: config.engine.initialScene,
            initialSceneArgs: [config.game.defaultTestSceneMessage] // Pass message to TestScene.init
        });

        // Asset loading and sprite creation are now handled by TestScene.
        // The old direct asset loading and sprite creation code is removed from here.

        // Start the engine's game loop (this is now async)
        await engine.start();

        // Example: Listen to an engine event
        engine.eventBus.on('engine:started', () => {
            console.log("Main.js: Received engine:started event. Game is running!");
        });

        engine.eventBus.on('engine:error', (errorData) => {
            console.error("Main.js: Received engine:error event.", errorData.error.message, errorData.error.context);
        });


    } catch (error) {
        console.error("Failed to initialize or start the HatchEngine:", error);
        // Display a user-friendly message on the page if the canvas is not found or other critical init errors.
        const body = document.body;
        const errorDiv = document.createElement('div');
        errorDiv.textContent = `Critical Error: Could not start the game. ${error.message}. Please check the console for more details.`;
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.style.backgroundColor = '#fee';
        errorDiv.style.border = '1px solid red';
        body.insertBefore(errorDiv, body.firstChild); // Prepend to body
    }
}

// Call the main function to start the application
main().catch(error => {
    // Catch any unhandled promise rejections from main() itself, though inner try/catch should handle most.
    console.error("Unhandled error in main function execution:", error);
});
