import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Define the expected content for main.js and TestScene.js
const expectedMainJsContent = `import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
// Core managers (AssetManager, InputManager, RenderingEngine, SceneManager)
// are now automatically instantiated within engine.init().
import TestScene from './scenes/TestScene.js'; // Default scene

console.log("Hatch game starting...");

async function gameMain() {
    // Load project configuration using the static method from HatchEngine
    // hatch.config.yaml should be at the root of the served project.
    const hatchConfig = await HatchEngine.loadProjectConfig(); // Defaults to /hatch.config.yaml

    // The engineConfig is derived from hatchConfig inside the HatchEngine constructor
    // and its init method. We just need to pass the loaded hatchConfig.
    const engine = new HatchEngine(hatchConfig);

    try {
        engine.init(); // Sets up canvas, context, and core managers

        // Load asset manifest if specified in config
        // Ensure engine.assetManager is available (it should be after init())
        if (hatchConfig.assetManifest && engine.assetManager) {
            try {
                // AssetManager.loadManifest now supports string paths directly
                await engine.assetManager.loadManifest(hatchConfig.assetManifest);
                console.log(\`Asset manifest '\${hatchConfig.assetManifest}' loaded or loading initiated.\`);
            } catch (e) {
                console.error("Failed to load asset manifest:", e);
                // Use engine's error handler if available
                if (engine.errorHandler) {
                    engine.errorHandler.error("Failed to load asset manifest", { path: hatchConfig.assetManifest, error: e });
                }
            }
        }

        // Add and switch to the initial scene
        // Register the TestScene class; SceneManager will instantiate it on first switch.
        // The initialScene name comes from hatchConfig.initialScene.
        if (engine.sceneManager && TestScene) {
            engine.sceneManager.add(hatchConfig.initialScene, TestScene);
            await engine.sceneManager.switchTo(hatchConfig.initialScene);
            console.log(\`Switched to initial scene: \${hatchConfig.initialScene}\`);
        } else {
            const missingComponent = !engine.sceneManager ? "SceneManager" : "TestScene class";
            const errorMessage = \`Failed to initialize scenes: \${missingComponent} is not available. Ensure TestScene is imported and hatchConfig.initialScene is set.\`;
            console.error(errorMessage);
            if (engine.errorHandler) {
                engine.errorHandler.critical(errorMessage);
            }
            return; // Stop if scene setup cannot proceed
        }

        console.log("Engine initialized from main.js with managers and scene.");
        engine.start();

    } catch (error) {
        console.error("Error during engine initialization or start:", error);
        if (engine && engine.errorHandler) {
            engine.errorHandler.critical("Failed to initialize or start engine from main.js", { originalError: error });
        } else {
            // If engine or errorHandler is not available, re-throw to ensure the error is visible.
            throw error;
        }
    }
}

gameMain();
`;

const expectedTestSceneJsContent = `import { Scene } from 'hatch-engine/scenes/Scene.js';

export default class TestScene extends Scene {
    constructor(engine) { // Scene constructor expects engine instance
        super(engine); // Pass the engine instance to the base Scene class
    }

    load() {
        console.log('TestScene: load() called');
        // Example: Load assets specific to this scene
        // try {
        //     await this.assetManager.loadAsset({ name: 'playerSprite', path: 'sprites/player.png', type: 'image' });
        // } catch (error) {
        //     this.engine.errorHandler.error('Failed to load assets for TestScene', { originalError: error });
        // }
    }

    init() {
        console.log('TestScene: init() called');
        // Example: Initialize scene objects, add them to the rendering engine
        // const player = this.assetManager.get('playerSprite');
        // if (player) {
        //     const playerEntity = new Sprite({ image: player, x: 100, y: 100 });
        //     this.renderingEngine.add(playerEntity); // Add to rendering engine for visibility
        // } else {
        //     this.engine.errorHandler.warn('Player sprite not loaded for TestScene.');
        // }
        //
        // Example: Log a message using the engine's error handler
        // this.engine.errorHandler.info('TestScene initialized successfully.', { scene: this.constructor.name });
    }

    update(deltaTime) {
        // console.log('TestScene: update() called with deltaTime:', deltaTime);
        // Example: Update game logic, move objects, handle input
        // if (this.inputManager.isKeyPressed('ArrowRight')) {
        //     // Move player right
        // }
    }

    render(renderingEngine) {
        // console.log('TestScene: render() called');
        // Custom rendering logic for this scene, if needed.
        // Objects added via this.renderingEngine.add() in init or update will be rendered automatically by the engine's main loop.
        // For additional rendering specific to this scene that isn't managed by RenderingEngine's drawables list:
        // renderingEngine.drawText('Hello from TestScene', 50, 50, '20px Arial', 'white');
    }

    exit() {
        console.log('TestScene: exit() called');
        // Example: Clean up when switching away from this scene, but before it's destroyed.
        // E.g., stop music, save state.
    }

    destroy() {
        console.log('TestScene: destroy() called');
        // Example: Release all resources held by this scene.
        // Remove all objects this scene added to the rendering engine or other managers.
        // this.renderingEngine.clearDrawables(); // Or selectively remove entities.
        // this.eventBus.offAllForContext(this); // If any event listeners were set up with this scene as context.
    }
}
`;

describe('Hatch CLI', () => {
    const testProjectName = 'test-cli-project';
    const testProjectPath = path.join(process.cwd(), testProjectName);
    // Adjust path to hatch.js if tests are not run from the root directory
    const hatchCliCommand = `node ${path.join(__dirname, '..', 'bin', 'hatch.js')}`;

    beforeAll(async () => {
        // Ensure no old test project directory exists
        if (await fs.exists(testProjectPath)) {
            await fs.remove(testProjectPath);
        }
    });

    afterAll(async () => {
        // Clean up the test project directory
        if (await fs.exists(testProjectPath)) {
            await fs.remove(testProjectPath);
        }
    });

    test('new command should create a project with correct template files', async () => {
        try {
            // Execute the CLI new command
            const { stdout, stderr } = await execPromise(`\${hatchCliCommand} new \${testProjectName}`);
            // console.log('CLI stdout:', stdout);
            // if (stderr) console.error('CLI stderr:', stderr);

            // Check if project directory was created
            expect(await fs.exists(testProjectPath)).toBe(true);

            // Check main.js content
            const mainJsPath = path.join(testProjectPath, 'src', 'main.js');
            expect(await fs.exists(mainJsPath)).toBe(true);
            const mainJsContent = await fs.readFile(mainJsPath, 'utf-8');
            // Normalize line endings for comparison
            expect(mainJsContent.replace(/\r\n/g, '\n')).toBe(expectedMainJsContent.replace(/\r\n/g, '\n'));

            // Check TestScene.js content
            const testSceneJsPath = path.join(testProjectPath, 'src', 'scenes', 'TestScene.js');
            expect(await fs.exists(testSceneJsPath)).toBe(true);
            const testSceneJsContent = await fs.readFile(testSceneJsPath, 'utf-8');
            // Normalize line endings for comparison
            expect(testSceneJsContent.replace(/\r\n/g, '\n')).toBe(expectedTestSceneJsContent.replace(/\r\n/g, '\n'));

            // Check for other expected files
            expect(await fs.exists(path.join(testProjectPath, 'index.html'))).toBe(true);
            expect(await fs.exists(path.join(testProjectPath, 'hatch.config.yaml'))).toBe(true);
            expect(await fs.exists(path.join(testProjectPath, 'assets', 'asset-manifest.json'))).toBe(true);

        } catch (error) {
            // Log error for debugging in case of test failure
            console.error('Test execution error:', error);
            throw error; // Re-throw to fail the test
        }
    }, 30000); // Increase timeout for CLI execution and file operations
});
