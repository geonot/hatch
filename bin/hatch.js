#!/usr/bin/env node

import fs from 'fs-extra'; // fs-extra should be imported at the top
import path from 'path';
import { createServer, build as viteBuild } from 'vite';

// For ES modules, __filename and __dirname are not available directly.
// We can get __dirname from import.meta.url.
// However, process.argv[1] can be unreliable if the script is symlinked or executed in unusual ways.
// A more robust way for __dirname in ESM, assuming this file (`hatch.js`) is the entry point:
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { default: yargs } = await import('yargs/yargs');
  const { hideBin } = await import('yargs/helpers');

  yargs(hideBin(process.argv))
    .command('new <project-name>', 'Create a new Hatch project', (yargs) => {
      return yargs.positional('project-name', {
        describe: 'Name of the project to create',
        type: 'string'
      });
    }, async (argv) => {
      const projectName = argv.projectName;
      const projectPath = path.join(process.cwd(), projectName);

      try {
        await fs.ensureDir(projectPath);
        await fs.ensureDir(path.join(projectPath, 'assets'));
        await fs.ensureDir(path.join(projectPath, 'src'));
        await fs.ensureDir(path.join(projectPath, 'src', 'scenes'));

        const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>My Hatch Game</title>
    <style>
        body { 
            margin: 0; 
            padding: 0;
            overflow: hidden; 
            background-color: #000; 
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            /* Prevent any scaling or zooming */
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            text-size-adjust: 100%;
        }
        canvas { 
            display: block; 
            border: 1px solid #333;
            box-sizing: border-box;
            /* Prevent scaling and ensure exact pixel mapping */
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            transform: none !important;
            zoom: 1 !important;
            /* Canvas dimensions set programmatically */
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script type="module" src="src/main.js"></script>
</body>
</html>`;
        await fs.writeFile(path.join(projectPath, 'index.html'), indexHtmlContent);

        const hatchConfigContent = `projectName: ${projectName}
canvasId: gameCanvas
gameWidth: 800
gameHeight: 600
initialScene: TestScene
assetManifest: assets/asset-manifest.json
logging:
  level: INFO`;
        await fs.writeFile(path.join(projectPath, 'hatch.config.yaml'), hatchConfigContent);

        const mainJsContent = `import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
import { AssetManager } from 'hatch-engine/assets/AssetManager.js';
import { InputManager } from 'hatch-engine/input/InputManager.js';
import { RenderingEngine } from 'hatch-engine/rendering/RenderingEngine.js';
import { SceneManager } from 'hatch-engine/scenes/SceneManager.js';
import TestScene from './scenes/TestScene.js';

console.log("Hatch game starting...");

async function gameMain() {
    try {
        // Load configuration using HatchEngine's static method
        const config = await HatchEngine.loadProjectConfig('/hatch.config.yaml');
        if (!config) {
            console.error("Failed to load project configuration. Cannot start the engine.");
            // Optionally, display a user-friendly message on the page
            const canvas = document.getElementById('gameCanvas'); // Or config.canvasId if available early
            if (canvas && canvas.getContext) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.fillText('Error: Could not load game configuration.', 50, 50);
            }
            return;
        }

        // Instantiate the engine with the loaded configuration
        const engine = new HatchEngine(config);

        // Initialize the engine (this sets up canvas, context, etc.)
        // It's crucial to call init() before managers that need canvas or ctx are created.
        await engine.init(); // Assuming init can be async if it involves internal loading

        // Instantiate managers *after* engine.init() and pass the engine instance
        engine.assetManager = new AssetManager(engine);
        engine.inputManager = new InputManager(engine, engine.canvas); // Requires engine.canvas
        engine.renderingEngine = new RenderingEngine(engine.canvas, engine); // Requires engine.canvas
        engine.sceneManager = new SceneManager(engine);

        // Load asset manifest if specified in config
        // Ensure assetManager is available and manifest path is provided
        if (config.assetManifest && engine.assetManager) {
            try {
                await engine.assetManager.loadManifest(config.assetManifest);
                console.log(\`Asset manifest '\${config.assetManifest}' loaded or loading initiated.\`);
            } catch (e) {
                console.error("Failed to load asset manifest:", e);
                if (engine.errorHandler) { // Check if errorHandler is available
                    engine.errorHandler.error("Failed to load asset manifest", { path: config.assetManifest, error: e });
                }
            }
        }

        // Add and switch to the initial scene
        // Ensure sceneManager and TestScene are available
        if (engine.sceneManager && TestScene && config.initialScene) {
            engine.sceneManager.add(config.initialScene, new TestScene(engine)); // Pass engine to TestScene
            await engine.sceneManager.switchTo(config.initialScene);
            console.log(\`Switched to initial scene: \${config.initialScene}\`);
        } else {
            const missingComponent = !engine.sceneManager ? "SceneManager"
                                    : !TestScene ? "TestScene"
                                    : "initialScene configuration";
            const errorMessage = \`Failed to initialize scenes: \${missingComponent} is not available or configured.\`;
            console.error(errorMessage);
            if (engine.errorHandler) { // Check if errorHandler is available
                 engine.errorHandler.critical(errorMessage);
            }
            return; // Stop if scene setup cannot proceed
        }

        console.log("Engine initialized, starting game loop.");
        engine.start();

    } catch (error) {
        console.error("Error during game initialization or start:", error);
        // Attempt to use engine's error handler if available, otherwise rethrow or log
        if (typeof engine !== 'undefined' && engine && engine.errorHandler) {
            engine.errorHandler.critical("Failed to initialize or start game from main.js", { originalError: error });
        } else {
            // Fallback if engine or errorHandler is not initialized
            const canvas = document.getElementById('gameCanvas'); // Attempt to get canvas ID from a common default
            if (canvas && canvas.getContext) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'red';
                ctx.font = '16px Arial';
                ctx.fillText('Critical Error: Game cannot start. Check console for details.', 50, 100);
            }
        }
    }
}

gameMain();`;
        await fs.writeFile(path.join(projectPath, 'src', 'main.js'), mainJsContent);

        const testSceneJsContent = `import { Scene } from 'hatch-engine/scenes/Scene.js'; // Adjust path if needed

// export default class TestScene extends Scene {
//     constructor() {
//         super();
//     }

//     load() {
//         console.log('TestScene loaded assets');
//     }

//     init() {
//         console.log('TestScene initialized');
//     }

//     update(deltaTime) {
//         // console.log('TestScene update', deltaTime);
//     }

import { Scene } from 'hatch-engine/scenes/Scene.js';

export default class TestScene extends Scene {
    constructor(engine) {
        super(engine); // Correctly calls super with the engine instance
    }

    load() {
        console.log('TestScene: load() called');
        // Example: await this.assetManager.loadAsset({ name: 'testImage', path: '/assets/images/test-sprite.png', type: 'image' });
    }

    init() {
        console.log('TestScene: init() called');
        // Example: if (this.assetManager.get('testImage')) {
        //     const sprite = new Sprite({ image: this.assetManager.get('testImage'), x: 100, y: 100 });
        //     this.renderingEngine.add(sprite); // Add to rendering engine for visibility
        // }
    }

    update(deltaTime) {
        // console.log('TestScene: update()', deltaTime);
    }

    render(renderingEngine) {
        // console.log('TestScene: render()');
        // Objects added via this.renderingEngine.add() in init or update will be rendered.
        // Or, dynamically add here:
        // renderingEngine.drawText('Hello from TestScene', 50, 50, '20px Arial', 'white');
    }

    exit() {
        console.log('TestScene: exit() called');
    }

    destroy() {
        console.log('TestScene: destroy() called');
        // Clean up scene-specific resources
        // this.renderingEngine.clearDrawables(); // If objects were added directly to RE for this scene.
    }
}`;
        await fs.writeFile(path.join(projectPath, 'src', 'scenes', 'TestScene.js'), testSceneJsContent);

        const assetManifestContent = `{
    "assets": []
}`;
        await fs.writeFile(path.join(projectPath, 'assets', 'asset-manifest.json'), assetManifestContent);

        console.log(`Project ${projectName} created successfully at ${projectPath}`);

      } catch (error) {
        console.error(`Error creating project ${projectName}:`, error);
        process.exit(1);
      }
    })
    .command('dev', 'Start the development server', (yargs) => {
      return yargs.option('port', {
        alias: 'p',
        type: 'number',
        description: 'Port to run the server on',
        default: 3000
      });
    }, async (argv) => {
      const projectRoot = process.cwd();
      console.log(`Starting dev server for project at: ${projectRoot} on port ${argv.port}`);

      try {
        const server = await createServer({
          root: projectRoot,
          publicDir: 'assets', // Relative to projectRoot. Vite will serve files from <projectRoot>/assets at /assets
          server: {
            port: argv.port,
            open: true, // Automatically open in browser
          },
          resolve: {
            alias: {
              // This allows imports like `import { HatchEngine } from 'hatch-engine/core/HatchEngine.js'`
              'hatch-engine': path.resolve(__dirname, '../engine')
            }
          },
          // optimizeDeps: { // Not typically needed for pure JS libraries referenced via alias
          //   include: ['hatch-engine/**/*.js'],
          // },
          // fs: { // Usually not needed if alias points within a reasonable project structure or monorepo
          //   allow: [
          //     path.resolve(__dirname, '../engine'), // engine source
          //     projectRoot, // user's project
          //     // searchForWorkspaceRoot(process.cwd()), // For monorepo setups
          //   ],
          // },
        });
        await server.listen();
        server.printUrls();
        console.log(`Development server running. Press Ctrl+C to stop.`);

        // Keep process alive until server is stopped
        process.on('SIGINT', async () => {
            await server.close();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            await server.close();
            process.exit(0);
        });

      } catch (e) {
        console.error('Failed to start dev server:', e);
        process.exit(1);
      }
    })
    .command('build', 'Build the project for production', (yargs) => {
      return yargs.option('outDir', {
        alias: 'o',
        type: 'string',
        description: 'Output directory for the build',
        default: 'dist'
      });
    }, async (argv) => {
      const projectRoot = process.cwd();
      const outputDir = path.resolve(projectRoot, argv.outDir);
      console.log(`Starting production build for project at: ${projectRoot}`);
      console.log(`Output directory: ${outputDir}`);

      try {
        const assetsDir = path.join(projectRoot, 'assets');
        const publicDir = await fs.pathExists(assetsDir) ? 'assets' : undefined;

        if (publicDir) {
          console.log(`Using public directory: ${publicDir}`);
        } else {
          console.log('No "assets" directory found, proceeding without publicDir.');
        }

        await viteBuild({
          root: projectRoot,
          publicDir: publicDir,
          build: {
            outDir: outputDir,
            emptyOutDir: true,
            rollupOptions: {
              // Assuming index.html is the entry point.
              // If specific JS entry points are needed, they can be configured here.
              // input: {
              //   main: path.resolve(projectRoot, 'index.html')
              // }
            },
          },
          resolve: {
            alias: {
              'hatch-engine': path.resolve(__dirname, '../engine')
            }
          },
          // Optional: Add plugins or other Vite configurations as needed
        });
        console.log(`Build successful. Output generated in ${outputDir}`);
      } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
      }
    })
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .alias('h', 'help')
    .version() // This will attempt to load version from package.json
    .alias('v', 'version')
    .strict() // Enforce strict command parsing
    .parse(); // Use parse() instead of relying on implicit parsing by .argv
}

// Ensure fs-extra is available at the top level for yargs to use it if needed internally,
// and for our script.
// The dynamic import for yargs is specific to how yargs v17+ handles its CJS/ESM dual packaging.
main().catch(err => {
  console.error("Unhandled error in CLI:", err);
  process.exit(1);
});
