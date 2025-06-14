#!/usr/bin/env node

import fs from 'fs-extra'; // fs-extra should be imported at the top
import path from 'path';
import { createServer } from 'vite';

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Hatch Game</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; }
        canvas { display: block; }
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
# assetManifest: assets/asset-manifest.json # Will be used later`;
        await fs.writeFile(path.join(projectPath, 'hatch.config.yaml'), hatchConfigContent);

        const mainJsContent = `import { HatchEngine } from 'hatch-engine/core/HatchEngine.js';
// import TestScene from './scenes/TestScene.js'; // Keep this commented for now

console.log("Hatch game starting...");

// Function to load and parse hatch.config.yaml
async function loadConfig() {
    try {
        const response = await fetch('/hatch.config.yaml'); // Fetches from the public root
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        const yamlText = await response.text();
        // Simple YAML parser (can be replaced with a library later if complex features are needed)
        const config = {};
        yamlText.split('\\n').forEach(line => {
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

gameMain();`;
        await fs.writeFile(path.join(projectPath, 'src', 'main.js'), mainJsContent);

        const testSceneJsContent = `// import { Scene } from 'hatch-engine'; // Path to engine's Scene class

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

//     render(renderingEngine) {
//         // console.log('TestScene render');
//         // renderingEngine.clear(); // Example
//     }
// }
console.log("TestScene.js placeholder");`;
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
