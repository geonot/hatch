Okay, let's begin the development of Hatch v0.1, starting with **Phase 1: Engine Core & Basic CLI Setup**.

## Phase 1: Engine Core & Basic CLI Setup

*(Goal: Get a minimal project running, drawing something, and responding to input)*

### 1. Project Structure & CLI Basics (`hatch-cli`)

First, we'll establish the command-line interface and the basic project structure it generates. The `hatch-cli` will be a Node.js tool. For this simulation, we'll focus on the *outcome* of using the CLI commands.

**1.1. `hatch-cli` Node.js Project Setup (Conceptual)**

*   A Node.js project for `hatch-cli` would be initialized (e.g., `npm init`).
*   Dependencies like `yargs` (for command-line argument parsing), `fs-extra` (for file system operations), and `chalk` (for colored console output) would be added.
*   A main script (e.g., `bin/hatch.js`) would handle command routing.

**1.2. Implement `hatch new <project-name>`**

This command will scaffold a new Hatch game project.

**Command:**
```bash
hatch new my-first-puzzle
```

**Expected Outcome:**
The following directory structure and files are created:

```
my-first-puzzle/
├── hatch.config.yaml
├── index.html
├── assets/
│   └── (empty for now, or a placeholder .gitkeep)
├── src/
│   └── main.js
└── README.md (optional, basic placeholder)
```

Let's define the content of these generated files:

**`my-first-puzzle/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Hatch Game</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; }
        canvas { border: 1px solid #000; }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script type="module" src="src/main.js"></script>
</body>
</html>
```
*   *Purpose:* Standard HTML file to host the canvas and load the game script. The `id="gameCanvas"` is important for the engine to find it.

**`my-first-puzzle/hatch.config.yaml`:**
```yaml
project:
  name: "my-first-puzzle" # Will be updated by the CLI from the command
  version: "0.1.0"
engine:
  canvasId: "gameCanvas"
  width: 800
  height: 600
  targetFPS: 60
  # assetManifest: "assets/asset-manifest.json" # Will be used later
  # initialScene: "TestScene" # Will be used later
```
*   *Purpose:* Central configuration for the game project and engine settings. The CLI pre-fills `project.name`.

**`my-first-puzzle/src/main.js` (Placeholder):**
```javascript
console.log("Hatch game project initialized!");
// Game logic will go here
```
*   *Purpose:* The main entry point for the game's JavaScript code.

**1.3. Implement `hatch dev` (Conceptual)**

This command will start a local development server.

**Command (run from within `my-first-puzzle/` directory):**
```bash
hatch dev
```

**Expected Behavior (Simulated using Vite's capabilities as a model):**
*   The CLI would internally use a tool like Vite (or a custom setup with `http-server` and a file watcher like `chokidar`).
*   It serves `index.html` from the project root.
*   It watches for changes in the `src/` directory (and later `assets/`).
*   JavaScript changes trigger Hot Module Replacement (HMR) or a live reload in the browser.
*   A message like `Hatch development server running at http://localhost:3000` would appear in the console.
*   Navigating to `http://localhost:3000` in a browser would show the `index.html` page, and the console would display "Hatch game project initialized!".

---

### 2. Engine Foundation (`HatchEngine`, `EventBus`, `ErrorHandler`)

Now, we'll create the foundational JavaScript modules for the engine itself. These would typically reside in the Hatch engine's own source directory (e.g., `hatch-engine-core/src/`) and be imported by the game project. For this simulation, we'll define them as if they are readily available for import.

**`engine/core/ErrorHandler.js`:**
```javascript
// engine/core/ErrorHandler.js

/**
 * @class ErrorHandler
 * @description Handles and logs errors within the Hatch engine.
 */
class ErrorHandler {
    constructor(engine) {
        this.engine = engine; // Reference to the main engine instance
        this.errorLog = [];
    }

    /**
     * Handles an error, logs it, emits an event, and optionally stops the engine.
     * @param {Error} error - The error object.
     * @param {object} context - Additional context about the error.
     * @param {boolean} isCritical - If true, the engine will attempt to stop.
     */
    handle(error, context = {}, isCritical = false) {
        const timestamp = new Date().toISOString();
        const errorRecord = {
            timestamp,
            message: error.message,
            stack: error.stack,
            context,
            isCritical,
        };

        this.errorLog.push(errorRecord);
        console.error("Hatch Engine Error:", errorRecord);

        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('engine:error', errorRecord);
        }

        if (isCritical) {
            console.warn("Critical error encountered. Attempting to stop the engine.");
            if (this.engine) {
                this.engine.stop();
            }
        }
    }

    /**
     * Retrieves the log of all errors handled.
     * @returns {Array<object>} The error log.
     */
    getLog() {
        return this.errorLog;
    }
}

export default ErrorHandler;
```
*   *Purpose:* Centralized error management. Allows consistent logging and a way to react to critical errors.

**`engine/core/EventBus.js`:**
```javascript
// engine/core/EventBus.js

/**
 * @class EventBus
 * @description A simple event emitter/subscriber system for decoupled communication.
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribes a handler to an event.
     * @param {string} eventName - The name of the event.
     * @param {Function} handler - The callback function to execute.
     */
    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(handler);
    }

    /**
     * Unsubscribes a handler from an event.
     * @param {string} eventName - The name of the event.
     * @param {Function} handler - The callback function to remove.
     */
    off(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            return;
        }
        const eventListeners = this.listeners.get(eventName);
        const index = eventListeners.indexOf(handler);
        if (index > -1) {
            eventListeners.splice(index, 1);
        }
    }

    /**
     * Emits an event, calling all subscribed handlers.
     * @param {string} eventName - The name of the event.
     * @param  {...any} data - Data to pass to the event handlers.
     */
    emit(eventName, ...data) {
        if (!this.listeners.has(eventName)) {
            return;
        }
        // Call handlers on a copy of the array in case a handler modifies the listeners array (e.g., unsubscribes itself)
        const handlers = [...this.listeners.get(eventName)];
        for (const handler of handlers) {
            try {
                handler(...data);
            } catch (error) {
                // To prevent one faulty handler from stopping others, and to log the error.
                // This assumes an ErrorHandler might be globally accessible or passed down.
                // For now, simple console.error. Ideally, use the engine's ErrorHandler.
                console.error(`Error in event handler for "${eventName}":`, error);
            }
        }
    }
}

export default EventBus;
```
*   *Purpose:* Facilitates communication between different engine modules without creating tight coupling.

**`engine/core/HatchEngine.js` (Initial Pass):**
```javascript
// engine/core/HatchEngine.js
import EventBus from './EventBus.js';
import ErrorHandler from './ErrorHandler.js';
// RenderingEngine and InputManager will be imported later

/**
 * @class HatchEngine
 * @description The core orchestrator for the Hatch game engine.
 */
class HatchEngine {
    constructor(config = {}) {
        this.config = config;
        this.canvas = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.rafId = null; // RequestAnimationFrame ID

        // Initialize core systems
        this.eventBus = new EventBus();
        this.errorHandler = new ErrorHandler(this); // Pass `this` (engine instance)

        // Other managers will be initialized in init()
        this.renderingEngine = null;
        this.inputManager = null;
        this.sceneManager = null; // For later
        this.assetManager = null; // For later
    }

    /**
     * Initializes the engine systems.
     * @async
     * @param {object} [initialSceneArgs] - Arguments for the initial scene (to be used later).
     * @returns {Promise<void>}
     */
    async init(initialSceneArgs) {
        try {
            console.log("HatchEngine initializing...");

            // Get canvas element
            const canvasId = this.config.engine?.canvasId || 'gameCanvas';
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                throw new Error(`Canvas element with ID "${canvasId}" not found.`);
            }
            this.canvas.width = this.config.engine?.width || 800;
            this.canvas.height = this.config.engine?.height || 600;

            // Initialize other core systems (Phase 1 focus: Rendering, Input)
            // this.renderingEngine = new RenderingEngine(this.canvas, this, this.config.rendering); // Next step
            // this.inputManager = new InputManager(this, this.config.input); // Step after

            console.log("HatchEngine initialized successfully.");
            this.eventBus.emit('engine:initialized');

        } catch (error) {
            this.errorHandler.handle(error, { phase: "Initialization" }, true);
            // Rethrow or handle to prevent starting a broken engine
            throw error;
        }
    }

    /**
     * Starts the game loop.
     */
    start() {
        if (this.isRunning) {
            console.warn("HatchEngine is already running.");
            return;
        }
        this.isRunning = true;
        this.lastTime = performance.now();
        console.log("HatchEngine started.");
        this.eventBus.emit('engine:started');
        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }

    /**
     * Stops the game loop.
     */
    stop() {
        if (!this.isRunning) {
            // console.warn("HatchEngine is not running."); // Can be noisy if called multiple times
            return;
        }
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        console.log("HatchEngine stopped.");
        this.eventBus.emit('engine:stopped');
    }

    /**
     * The main game loop.
     * @param {DOMHighResTimeStamp} currentTime - The current time provided by requestAnimationFrame.
     * @private
     */
    _loop(currentTime) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000; // Delta time in seconds
        this.lastTime = currentTime;

        // 1. Process Input (To be implemented)
        // if (this.inputManager) this.inputManager.update(this.deltaTime);

        // 2. Update Game Logic (Scene update to be implemented)
        // if (this.sceneManager && this.sceneManager.currentScene) {
        //     this.sceneManager.currentScene.update(this.deltaTime);
        // }
        // For now, just a log to see it's ticking
        // console.log(`Tick - DeltaTime: ${this.deltaTime.toFixed(4)}s`);


        // 3. Render (To be implemented)
        // if (this.renderingEngine) {
        //     this.renderingEngine.render();
        // }

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }
}

export default HatchEngine;
```
*   *Purpose:* The main class that ties all engine components together and manages the game loop.

**Update `my-first-puzzle/src/main.js`:**
Now, let's update the game project's `main.js` to use these core engine parts. It needs to fetch the config first.

```javascript
// src/main.js
import HatchEngine from '../../hatch-engine-core/src/core/HatchEngine.js'; // Adjust path as per actual structure

async function main() {
    let config = {};
    try {
        const response = await fetch('../hatch.config.yaml'); // Assuming main.js is in src/
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching config.`);
        }
        // Basic YAML parsing for this phase (browser doesn't parse YAML natively)
        // In a real scenario, use a YAML parsing library or convert YAML to JSON during build/dev.
        // For this simulation, we'll assume a very simple YAML or convert it to JSON manually for testing.
        // Let's assume for now it's pre-converted to hatch.config.json for simplicity of loading in browser.
        // Or, for this phase, we can hardcode a small config object.
        // Let's simulate loading hatch.config.yaml by fetching and then doing a very basic parse for critical values for now
        // For a more robust solution, the CLI `dev` command could convert YAML to JSON, or we'd use a JS YAML parser.
        // Given the constraints of a browser environment without a build step for YAML->JSON yet,
        // let's use a simplified approach for Phase 1 `main.js`:
        // We'll directly pass a config object, assuming the `hatch.config.yaml` values are known.

        config = { // Simulating parsed YAML content
            project: {
                name: "my-first-puzzle",
                version: "0.1.0"
            },
            engine: {
                canvasId: "gameCanvas",
                width: 800,
                height: 600,
                targetFPS: 60
            }
        };
        console.log("Configuration loaded/simulated:", config);

    } catch (error) {
        console.error("Failed to load or parse configuration:", error);
        return; // Stop if config fails
    }

    const engine = new HatchEngine(config);

    try {
        await engine.init();
        engine.start();
        console.log("Game started through HatchEngine.");
    } catch (error) {
        // ErrorHandler within engine should have already logged it.
        console.error("Error during engine initialization or start:", error);
    }
}

main();
```
*Comment on YAML parsing*: In a real dev server setup (like Vite), a plugin could handle YAML import directly. For vanilla JS in the browser, YAML needs a JS parser library or to be pre-converted to JSON. The `fetch` approach would work if the dev server provides the YAML as text, then a JS YAML parser is used. For this phase, I've simplified it by directly constructing the config object in `main.js`, representing what would be parsed.

**Test:**
If you run `hatch dev` (conceptually), the browser should now:
1.  Load `index.html`.
2.  Execute `src/main.js`.
3.  Log "Configuration loaded/simulated: ..."
4.  Log "HatchEngine initializing..."
5.  Log "HatchEngine initialized successfully."
6.  Log "HatchEngine started."
7.  The `_loop` in `HatchEngine` would be running, but currently, it doesn't produce visual output or log ticks (as that part is commented out). If we uncomment the `console.log` in `_loop`, we'd see rapid "Tick..." messages.

---

### 3. Rendering Engine (Canvas 2D - Initial Pass)

Let's implement the initial `RenderingEngine` and a basic `Camera`.

**`engine/rendering/Camera.js`:**
```javascript
// engine/rendering/Camera.js

/**
 * @class Camera
 * @description Manages the viewport, position, and zoom for rendering.
 */
class Camera {
    constructor(viewportWidth, viewportHeight) {
        this.x = 0; // World x-coordinate of the camera's center
        this.y = 0; // World y-coordinate of the camera's center
        this.zoom = 1;
        this.viewportWidth = viewportWidth;   // Logical width of the canvas
        this.viewportHeight = viewportHeight; // Logical height of the canvas
    }

    /**
     * Applies the camera's transformation to the rendering context.
     * Call this before drawing scene elements.
     * @param {CanvasRenderingContext2D} ctx - The rendering context.
     */
    applyTransform(ctx) {
        // Translate to move the camera's view center to the origin
        ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
        // Apply zoom
        ctx.scale(this.zoom, this.zoom);
        // Translate to the camera's world position (negative, as we move the world)
        ctx.translate(-this.x, -this.y);
    }

    // Placeholder for culling - to be implemented in Phase 2
    isRectInView(rect) {
        // For Phase 1, assume everything is in view or culling is not yet critical
        if (!rect) return true; // If no bounds, assume drawable (e.g. full-screen UI)
        // Basic culling logic will be added later
        return true;
    }

    // screenToWorld and worldToScreen methods will be added later as needed.
}

export default Camera;
```

**`engine/rendering/RenderingEngine.js`:**
```javascript
// engine/rendering/RenderingEngine.js
import Camera from './Camera.js';

/**
 * @class RenderingEngine
 * @description Handles all drawing operations on the HTML5 Canvas.
 */
class RenderingEngine {
    constructor(canvas, engine, options = {}) {
        this.engine = engine;
        this.canvas = canvas;
        this.context = canvas.getContext('2d', options.rendererOptions || {});

        if (!this.context) {
            const err = new Error("Failed to get 2D rendering context from canvas.");
            this.engine.errorHandler.handle(err, { canvasId: canvas.id }, true);
            throw err; // Stop initialization
        }

        // Handle High DPI displays
        this.pixelRatio = window.devicePixelRatio || 1;
        // Logical width/height are from config, physical canvas dimensions are scaled
        this.width = canvas.width;  // This should be logical width from config
        this.height = canvas.height; // This should be logical height from config

        if (this.pixelRatio > 1) {
            // Set display size
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            // Set actual backing store size
            this.canvas.width = this.width * this.pixelRatio;
            this.canvas.height = this.height * this.pixelRatio;
            // Scale the context to counter the larger backing store
            this.context.scale(this.pixelRatio, this.pixelRatio);
        }

        this.camera = new Camera(this.width, this.height); // Pass logical width/height

        // Layers will be implemented in Phase 2 (step 5)
        // this.layers = new Map();
        // this.layerOrder = [];

        this.renderStats = { drawCalls: 0, objectsRendered: 0, frameTime: 0 };
        console.log("RenderingEngine initialized.");
    }

    /**
     * Clears the canvas for the next frame.
     */
    clear() {
        // Clear based on logical width/height as context is already scaled for DPI
        this.context.clearRect(0, 0, this.width, this.height);
        this.renderStats.drawCalls = 0; // Reset per frame
        this.renderStats.objectsRendered = 0; // Reset per frame
    }

    /**
     * Renders the current frame. Called by HatchEngine._loop.
     */
    render() {
        const startTime = performance.now();
        this.clear();

        this.context.save();
        this.camera.applyTransform(this.context);

        // Layer and drawable rendering logic will go here in Phase 2 (step 5)
        // For now, we can draw a test shape to confirm rendering
        // this.context.fillStyle = 'red';
        // this.context.fillRect(this.width / 2 - 25, this.height / 2 - 25, 50, 50); // Draw a red square in the middle

        this.context.restore();

        this.renderStats.frameTime = performance.now() - startTime;
        this.renderStats.drawCalls++; // Simplistic for now
    }

    // createLayer, addDrawable etc. will be added in Phase 2
}

export default RenderingEngine;
```

**Integrate `RenderingEngine` into `HatchEngine.js`:**

Modify `engine/core/HatchEngine.js`:
1.  Import `RenderingEngine`.
2.  Instantiate it in `init()`.
3.  Call `renderingEngine.render()` in `_loop()`.

```javascript
// engine/core/HatchEngine.js
import EventBus from './EventBus.js';
import ErrorHandler from './ErrorHandler.js';
import RenderingEngine from '../rendering/RenderingEngine.js'; // Added import

class HatchEngine {
    constructor(config = {}) {
        // ... (previous constructor code) ...
        this.renderingEngine = null;
        // ...
    }

    async init(initialSceneArgs) {
        try {
            // ... (previous init code for canvas) ...

            // Initialize RenderingEngine
            const renderingOptions = this.config.engine?.renderingOptions || {};
            this.renderingEngine = new RenderingEngine(this.canvas, this, renderingOptions);

            // ... (rest of init)
            console.log("HatchEngine initialized successfully."); // this line might be before or after RE init log
            this.eventBus.emit('engine:initialized');
        } catch (error) {
            // ...
        }
    }

    // ... (start, stop methods are the same) ...

    _loop(currentTime) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // 1. Process Input (To be implemented next)
        // ...

        // 2. Update Game Logic
        // ...

        // 3. Render
        if (this.renderingEngine) {
            this.renderingEngine.render(); // Added render call
        }

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }
}

export default HatchEngine;
```

**Test:**
With these changes:
*   Running `hatch dev` should now show the canvas.
*   The `RenderingEngine.clear()` method will be called each frame. If the canvas background (`body` style in `index.html`) is `#333`, and `clear()` works, the canvas area itself should be transparent (or default white/black if not styled, depending on browser). If we were to set a `this.context.fillStyle` and `fillRect(0,0,this.width,this.height)` in `clear()` before `clearRect`, we'd see that color.
*   The red square (if uncommented in `RenderingEngine.render`) would appear centered on the canvas, confirming the rendering pipeline is active. For now, it's just clearing.

---

### 4. Input Management (Initial Pass)

Now, let's set up basic input handling.

**`engine/input/KeyboardInput.js`:**
```javascript
// engine/input/KeyboardInput.js

/**
 * @class KeyboardInput
 * @description Manages keyboard state.
 */
class KeyboardInput {
    constructor(eventTarget = window) {
        this.pressedKeys = new Set();
        this.justPressedKeys = new Set();
        this.justReleasedKeys = new Set(); // For completeness, though not explicitly requested for phase 1
        
        this.eventTarget = eventTarget;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this.attachEvents();
    }

    attachEvents() {
        this.eventTarget.addEventListener('keydown', this._onKeyDown);
        this.eventTarget.addEventListener('keyup', this._onKeyUp);
    }

    detachEvents() {
        this.eventTarget.removeEventListener('keydown', this._onKeyDown);
        this.eventTarget.removeEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(event) {
        // Prevent default for common game keys if needed, but be careful
        // e.g. if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
        if (!this.pressedKeys.has(event.code)) {
            this.justPressedKeys.add(event.code);
        }
        this.pressedKeys.add(event.code);
    }

    _onKeyUp(event) {
        this.pressedKeys.delete(event.code);
        this.justReleasedKeys.add(event.code);
    }

    /**
     * Called once per frame by InputManager to update "just pressed/released" states.
     */
    update() {
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
    }

    isKeyPressed(keyCode) {
        return this.pressedKeys.has(keyCode);
    }

    isKeyJustPressed(keyCode) {
        return this.justPressedKeys.has(keyCode);
    }

    isKeyJustReleased(keyCode) { // Added for completeness
        return this.justReleasedKeys.has(keyCode);
    }
}

export default KeyboardInput;
```

**`engine/input/MouseInput.js`:**
```javascript
// engine/input/MouseInput.js

/**
 * @class MouseInput
 * @description Manages mouse state relative to a target element (e.g., canvas).
 */
class MouseInput {
    constructor(targetElement) {
        this.targetElement = targetElement;
        this.x = 0;
        this.y = 0;
        this.pressedButtons = new Set(); // 0: left, 1: middle, 2: right
        this.justPressedButtons = new Set();
        this.justReleasedButtons = new Set();

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = (e) => e.preventDefault(); // Prevent context menu on right click

        this.attachEvents();
    }

    attachEvents() {
        this.targetElement.addEventListener('mousemove', this._onMouseMove);
        this.targetElement.addEventListener('mousedown', this._onMouseDown);
        this.targetElement.addEventListener('mouseup', this._onMouseUp);
        this.targetElement.addEventListener('contextmenu', this._onContextMenu);
    }

    detachEvents() {
        this.targetElement.removeEventListener('mousemove', this._onMouseMove);
        this.targetElement.removeEventListener('mousedown', this._onMouseDown);
        this.targetElement.removeEventListener('mouseup', this._onMouseUp);
        this.targetElement.removeEventListener('contextmenu', this._onContextMenu);
    }

    _onMouseMove(event) {
        const rect = this.targetElement.getBoundingClientRect();
        // Scale mouse coordinates if canvas is styled to a different size than its resolution
        const scaleX = this.targetElement.width / (this.targetElement.clientWidth * (window.devicePixelRatio || 1));
        const scaleY = this.targetElement.height / (this.targetElement.clientHeight * (window.devicePixelRatio || 1));

        this.x = (event.clientX - rect.left) * scaleX;
        this.y = (event.clientY - rect.top) * scaleY;
    }

    _onMouseDown(event) {
        if (!this.pressedButtons.has(event.button)) {
            this.justPressedButtons.add(event.button);
        }
        this.pressedButtons.add(event.button);
    }

    _onMouseUp(event) {
        this.pressedButtons.delete(event.button);
        this.justReleasedButtons.add(event.button);
    }

    /**
     * Called once per frame by InputManager.
     */
    update() {
        this.justPressedButtons.clear();
        this.justReleasedButtons.clear();
    }

    getMousePosition() {
        return { x: this.x, y: this.y };
    }

    isMouseButtonPressed(buttonCode) {
        return this.pressedButtons.has(buttonCode);
    }

    isMouseButtonJustPressed(buttonCode) {
        return this.justPressedButtons.has(buttonCode);
    }

    isMouseButtonJustReleased(buttonCode) { // Added for completeness
        return this.justReleasedButtons.has(buttonCode);
    }
}

export default MouseInput;
```

**`engine/input/InputManager.js`:**
```javascript
// engine/input/InputManager.js
import KeyboardInput from './KeyboardInput.js';
import MouseInput from './MouseInput.js';
// TouchInput will be added later

/**
 * @class InputManager
 * @description Orchestrates different input sources (keyboard, mouse, touch).
 */
class InputManager {
    constructor(engine, canvasElement, options = {}) {
        this.engine = engine;
        this.keyboard = new KeyboardInput(options.keyboardEventTarget || window);
        this.mouse = new MouseInput(canvasElement); // Mouse events usually relative to canvas
        // this.touch = new TouchInput(canvasElement); // To be added later

        console.log("InputManager initialized.");
    }

    /**
     * Updates all input handlers. Called once per game loop.
     * This is crucial for "just pressed/released" states.
     */
    update(deltaTime) {
        this.keyboard.update();
        this.mouse.update();
        // if (this.touch) this.touch.update(deltaTime);
    }

    // Convenience getters
    isKeyPressed(keyCode) { return this.keyboard.isKeyPressed(keyCode); }
    isKeyJustPressed(keyCode) { return this.keyboard.isKeyJustPressed(keyCode); }
    getMousePosition() { return this.mouse.getMousePosition(); }
    isMouseButtonPressed(buttonCode) { return this.mouse.isMouseButtonPressed(buttonCode); }
    isMouseButtonJustPressed(buttonCode) { return this.mouse.isMouseButtonJustPressed(buttonCode); }

    destroy() {
        this.keyboard.detachEvents();
        this.mouse.detachEvents();
        // if (this.touch) this.touch.detachEvents();
        console.log("InputManager destroyed and events detached.");
    }
}

export default InputManager;
```

**Integrate `InputManager` into `HatchEngine.js`:**

Modify `engine/core/HatchEngine.js`:
1.  Import `InputManager`.
2.  Instantiate it in `init()`, passing the canvas.
3.  Call `inputManager.update()` in `_loop()`.
4.  Add a `destroy` method to `HatchEngine` to clean up InputManager listeners.

```javascript
// engine/core/HatchEngine.js
import EventBus from './EventBus.js';
import ErrorHandler from './ErrorHandler.js';
import RenderingEngine from '../rendering/RenderingEngine.js';
import InputManager from '../input/InputManager.js'; // Added import

class HatchEngine {
    constructor(config = {}) {
        // ...
        this.inputManager = null;
        // ...
    }

    async init(initialSceneArgs) {
        try {
            // ... (canvas and renderingEngine setup) ...

            // Initialize InputManager
            this.inputManager = new InputManager(this, this.canvas, this.config.engine?.inputOptions || {});

            console.log("HatchEngine initialized successfully.");
            this.eventBus.emit('engine:initialized');
        } catch (error) {
            // ...
        }
    }

    // ... (start method is the same) ...

    stop() {
        // ... (previous stop code) ...
        if (this.inputManager) {
            this.inputManager.destroy(); // Clean up event listeners
        }
        // ...
    }

    _loop(currentTime) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // 1. Process Input
        if (this.inputManager) {
            this.inputManager.update(this.deltaTime); // Added update call
        }

        // 2. Update Game Logic (Scene update to be implemented)
        // ... (Example test for input)
        // if (this.inputManager && this.inputManager.isKeyJustPressed('Space')) {
        //     console.log('Space just pressed!');
        // }
        // if (this.inputManager && this.inputManager.isMouseButtonJustPressed(0)) {
        //     console.log('Left mouse button just pressed at:', this.inputManager.getMousePosition());
        // }


        // 3. Render
        if (this.renderingEngine) {
            this.renderingEngine.render();
        }

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }
}

export default HatchEngine;
```

**Test:**
*   Run `hatch dev`.
*   Uncomment the test input logging lines in `HatchEngine._loop()`.
*   Open the browser console.
*   Pressing the Space bar should log "Space just pressed!".
*   Clicking the left mouse button on the canvas should log "Left mouse button just pressed at: {x: ..., y: ...}". Mouse coordinates should be relative to the canvas.

---

**End of Phase 1 Development**

At this point, we have:
1.  A conceptual CLI (`hatch new`, `hatch dev`).
2.  A project structure generated by `hatch new`.
3.  Core engine foundation: `HatchEngine`, `EventBus`, `ErrorHandler`.
4.  A basic Canvas 2D `RenderingEngine` that can clear the screen and has a `Camera` (though not yet used for complex transformations).
5.  An `InputManager` handling keyboard and mouse inputs, with "is pressed" and "is just pressed" states.
6.  The `HatchEngine` successfully initializes these components and runs a game loop, calling their respective update/render methods.

The game project (`my-first-puzzle`) can be started, and it initializes the engine. The canvas clears each frame, and input events can be detected and logged. This forms a solid base for Phase 2, where we'll focus on assets, scenes, and drawing actual game elements.