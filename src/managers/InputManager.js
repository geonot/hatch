/**
 * @fileoverview Input manager for keyboard and mouse for the Hatch engine.
 */

// For Phase 1, KeyboardInput and MouseInput are defined within InputManager.js
// In a larger structure, they might be separate files.

class KeyboardInput {
    constructor(engine) {
        this.engine = engine; // Reference to the main engine for event emitting or context
        this.keys = new Map(); // Key: string (e.g., 'KeyW', 'Space'), Value: boolean (true if pressed)
        this.keysPressedThisFrame = new Set(); // Keys that just went down this frame
        this.keysReleasedThisFrame = new Set(); // Keys that just went up this frame

        // console.info("KeyboardInput initialized.");
    }

    _onKeyDown(event) {
        const key = event.code;
        if (!this.keys.get(key)) { // Only set if it wasn't already pressed (handles first press)
            this.keysPressedThisFrame.add(key);
        }
        this.keys.set(key, true);
        this.engine.eventSystem.emit('keyDown', { key: key, event: event }, true);
        // console.log(`Key down: ${key}`);
    }

    _onKeyUp(event) {
        const key = event.code;
        this.keys.set(key, false);
        this.keysReleasedThisFrame.add(key);
        this.engine.eventSystem.emit('keyUp', { key: key, event: event }, true);
        // console.log(`Key up: ${key}`);
    }

    isKeyPressed(key) {
        return !!this.keys.get(key);
    }

    isKeyJustPressed(key) {
        return this.keysPressedThisFrame.has(key);
    }

    isKeyJustReleased(key) {
        return this.keysReleasedThisFrame.has(key);
    }

    // Called by InputManager at the start or end of each frame
    _resetPerFrameState() {
        this.keysPressedThisFrame.clear();
        this.keysReleasedThisFrame.clear();
    }

    destroy() {
        this.keys.clear();
        this.keysPressedThisFrame.clear();
        this.keysReleasedThisFrame.clear();
        // console.info("KeyboardInput destroyed.");
    }
}

class MouseInput {
    constructor(engine, canvas) {
        this.engine = engine;
        this.canvas = canvas;
        this.position = { x: 0, y: 0 }; // Relative to canvas
        this.buttons = new Map(); // Key: number (0:left, 1:middle, 2:right), Value: boolean
        this.buttonsPressedThisFrame = new Set();
        this.buttonsReleasedThisFrame = new Set();
        this.wheel = { x: 0, y: 0, z: 0 }; // Store wheel delta for this frame

        // console.info("MouseInput initialized.");
    }

    _onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.position.x = event.clientX - rect.left;
        this.position.y = event.clientY - rect.top;
        this.engine.eventSystem.emit('mouseMove', { position: { ...this.position }, event: event }, true);
        // console.log(`Mouse move: X=${this.position.x}, Y=${this.position.y}`);
    }

    _onMouseDown(event) {
        const button = event.button;
        if (!this.buttons.get(button)) {
            this.buttonsPressedThisFrame.add(button);
        }
        this.buttons.set(button, true);
        this.engine.eventSystem.emit('mouseDown', { button: button, position: { ...this.position }, event: event }, true);
        // console.log(`Mouse down: button ${button}`);
    }

    _onMouseUp(event) {
        const button = event.button;
        this.buttons.set(button, false);
        this.buttonsReleasedThisFrame.add(button);
        this.engine.eventSystem.emit('mouseUp', { button: button, position: { ...this.position }, event: event }, true);
        // console.log(`Mouse up: button ${button}`);
    }

    _onWheel(event) {
        this.wheel.x = event.deltaX;
        this.wheel.y = event.deltaY;
        this.wheel.z = event.deltaZ; // Though often deltaY is the primary scroll
        this.engine.eventSystem.emit('mouseWheel', { delta: { ...this.wheel }, event: event }, true);
        // console.log(`Mouse wheel: dX=${event.deltaX}, dY=${event.deltaY}`);
        // Reset wheel delta after processing for this frame, or accumulate as needed by design
    }

    _onContextMenu(event) {
        // Prevent default context menu often triggered by right-click
        event.preventDefault();
        this.engine.eventSystem.emit('contextMenu', { position: { ...this.position }, event: event }, true);
        // console.log("Context menu event (prevented default).");
    }


    getMousePosition() {
        return { ...this.position }; // Return a copy
    }

    isMouseButtonPressed(button) {
        return !!this.buttons.get(button);
    }

    isMouseButtonJustPressed(button) {
        return this.buttonsPressedThisFrame.has(button);
    }

    isMouseButtonJustReleased(button) {
        return this.buttonsReleasedThisFrame.has(button);
    }

    getMouseWheelDelta() {
        return { ...this.wheel };
    }

    _resetPerFrameState() {
        this.buttonsPressedThisFrame.clear();
        this.buttonsReleasedThisFrame.clear();
        this.wheel = { x: 0, y: 0, z: 0 }; // Reset wheel delta each frame
    }

    destroy() {
        this.buttons.clear();
        this.buttonsPressedThisFrame.clear();
        this.buttonsReleasedThisFrame.clear();
        // console.info("MouseInput destroyed.");
    }
}

class InputManager {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas; // Assumes canvas is ready on engine

        if (!this.canvas) {
            const error = new Error("InputManager: Canvas is not available on the engine.");
            this.engine.eventSystem.emit('engineError', { error: error, context: "InputManager Constructor" });
            throw error;
        }

        this.keyboard = new KeyboardInput(this.engine);
        this.mouse = new MouseInput(this.engine, this.canvas);

        this.eventHandlers = new Map(); // To store bound event handlers for easy removal

        console.info("InputManager initialized.");
    }

    init() {
        console.log("InputManager.init() called. Setting up event listeners.");
        this._setupEventListeners();
        this.engine.eventSystem.emit('inputManagerInitialized', { manager: this }, true);
    }

    _setupEventListeners() {
        // Keyboard events (usually on window or a focusable element)
        this.eventHandlers.set('keydown', this.keyboard._onKeyDown.bind(this.keyboard));
        this.eventHandlers.set('keyup', this.keyboard._onKeyUp.bind(this.keyboard));

        // Mouse events (usually on the canvas)
        this.eventHandlers.set('mousemove', this.mouse._onMouseMove.bind(this.mouse));
        this.eventHandlers.set('mousedown', this.mouse._onMouseDown.bind(this.mouse));
        this.eventHandlers.set('mouseup', this.mouse._onMouseUp.bind(this.mouse));
        this.eventHandlers.set('wheel', this.mouse._onWheel.bind(this.mouse));
        this.eventHandlers.set('contextmenu', this.mouse._onContextMenu.bind(this.mouse));

        // Attach to window for keyboard, canvas for mouse
        // Check for 'addEventListener' for environments like Node.js testing without full DOM
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('keydown', this.eventHandlers.get('keydown'), false);
            window.addEventListener('keyup', this.eventHandlers.get('keyup'), false);
        } else if (this.canvas.addEventListener) { // Fallback for keyboard if window is not available but canvas is (less common)
             this.canvas.setAttribute('tabindex', '0'); // Make canvas focusable for key events
             this.canvas.addEventListener('keydown', this.eventHandlers.get('keydown'), false);
             this.canvas.addEventListener('keyup', this.eventHandlers.get('keyup'), false);
        }


        if (this.canvas && this.canvas.addEventListener) {
            this.canvas.addEventListener('mousemove', this.eventHandlers.get('mousemove'), false);
            this.canvas.addEventListener('mousedown', this.eventHandlers.get('mousedown'), false);
            this.canvas.addEventListener('mouseup', this.eventHandlers.get('mouseup'), false); // Could be window for dragging outside
            this.canvas.addEventListener('wheel', this.eventHandlers.get('wheel'), false);
            this.canvas.addEventListener('contextmenu', this.eventHandlers.get('contextmenu'), false);
        } else {
            const error = new Error("InputManager: Canvas element does not support addEventListener.");
            this.engine.eventSystem.emit('engineError', { error: error, context: "InputManager Setup" });
        }
    }

    // Called by the engine's game loop (e.g., at the start of HatchEngine.update)
    update(deltaTime) {
        // Reset per-frame state for keyboard and mouse
        this.keyboard._resetPerFrameState();
        this.mouse._resetPerFrameState();
        // console.log("InputManager.update() - per-frame states reset.");
    }

    // Query methods directly delegate to keyboard or mouse handlers
    isKeyPressed(key) {
        return this.keyboard.isKeyPressed(key);
    }

    isKeyJustPressed(key) {
        return this.keyboard.isKeyJustPressed(key);
    }

    isKeyJustReleased(key) {
        return this.keyboard.isKeyJustReleased(key);
    }

    getMousePosition() {
        return this.mouse.getMousePosition();
    }

    isMouseButtonPressed(button) {
        return this.mouse.isMouseButtonPressed(button);
    }

    isMouseButtonJustPressed(button) {
        return this.mouse.isMouseButtonJustPressed(button);
    }

    isMouseButtonJustReleased(button) {
        return this.mouse.isMouseButtonJustReleased(button);
    }

    getMouseWheelDelta() {
        return this.mouse.getMouseWheelDelta();
    }

    destroy() {
        console.log("InputManager.destroy() called. Removing event listeners.");
        if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('keydown', this.eventHandlers.get('keydown'));
            window.removeEventListener('keyup', this.eventHandlers.get('keyup'));
        } else if (this.canvas && this.canvas.removeEventListener) {
            this.canvas.removeEventListener('keydown', this.eventHandlers.get('keydown'));
            this.canvas.removeEventListener('keyup', this.eventHandlers.get('keyup'));
        }

        if (this.canvas && this.canvas.removeEventListener) {
            this.canvas.removeEventListener('mousemove', this.eventHandlers.get('mousemove'));
            this.canvas.removeEventListener('mousedown', this.eventHandlers.get('mousedown'));
            this.canvas.removeEventListener('mouseup', this.eventHandlers.get('mouseup'));
            this.canvas.removeEventListener('wheel', this.eventHandlers.get('wheel'));
            this.canvas.removeEventListener('contextmenu', this.eventHandlers.get('contextmenu'));
        }

        this.keyboard.destroy();
        this.mouse.destroy();
        this.eventHandlers.clear();
        console.info("InputManager destroyed.");
        this.engine.eventSystem.emit('inputManagerDestroyed', { manager: this }, true);
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputManager, KeyboardInput, MouseInput }; // Exporting all for potential separate testing
}
