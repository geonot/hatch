/**
 * @file InputManager.js
 * @description Central manager for all input sources like keyboard and mouse
 * for the HatchEngine. It consolidates input handling and provides a unified API
 * for querying input states.
 */

import KeyboardInput from './KeyboardInput.js';
import MouseInput from './MouseInput.js';
// import GamepadInput from './GamepadInput.js'; // Future: Gamepad support

/**
 * @class InputManager
 * @classdesc Manages keyboard and mouse input handlers (and potentially gamepad in the future).
 * It initializes these handlers, calls their update methods each frame (to manage "just pressed/released" states),
 * and provides convenience methods to query the current state of inputs.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance.
 * @property {KeyboardInput} keyboard - The keyboard input handler instance.
 * @property {MouseInput} mouse - The mouse input handler instance.
 * // @property {GamepadInput} gamepad - Future: The gamepad input handler instance.
 * @property {boolean} preventContextMenu - Configuration option indicating if the default browser context menu
 *                                          is (or should be) prevented on the mouse input target element.
 */
class InputManager {
    /**
     * Creates an instance of InputManager.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance.
     *        Used for accessing engine configurations (e.g., canvas logical size for mouse scaling) or other systems.
     * @param {HTMLElement} canvasElement - The primary HTML element to which mouse event listeners are attached,
     *                                    typically the game canvas. Its `getBoundingClientRect` is used for
     *                                    accurate mouse coordinate scaling.
     * @param {object} [options={}] - Configuration options for input handling.
     * @param {EventTarget} [options.keyboardEventTarget=window] - The DOM EventTarget to attach keyboard listeners to.
     *                                                           Defaults to `window`.
     * @param {boolean} [options.preventContextMenu=true] - If true, attempts to prevent the default browser
     *                                                    context menu when right-clicking on the `canvasElement`.
     *                                                    (Actual prevention is handled within `MouseInput`).
     * @throws {Error} If `engine` or `canvasElement` is not provided, as they are essential.
     */
    constructor(engine, canvasElement, options = {}) {
        if (!engine) {
            // Critical setup error
            throw new Error("InputManager constructor: HatchEngine instance is required.");
        }
        if (!canvasElement) {
            // Critical setup error
            throw new Error("InputManager constructor: Canvas element is required for MouseInput.");
        }
        /** @type {import('../core/HatchEngine.js').HatchEngine} */
        this.engine = engine;

        let validOptions = {};
        if (options && typeof options === 'object') {
            validOptions = options;
        } else if (options !== undefined) {
            // ErrorHandler might not be fully set up if engine itself is not fully valid,
            // but InputManager constructor relies on a valid engine.
            this.engine.errorHandler.warn(`InputManager constructor: options parameter was not an object. Proceeding with defaults.`, { component: 'InputManager', method: 'constructor', providedOptionsType: typeof options });
        }

        const keyboardTarget = validOptions.keyboardEventTarget || window;
        if (!(keyboardTarget && typeof keyboardTarget.addEventListener === 'function')) {
            this.engine.errorHandler.error(`InputManager constructor: options.keyboardEventTarget is invalid. Defaulting to window.`, { component: 'InputManager', method: 'constructor' });
            // Fallback to window if invalid target provided. This part is tricky as KeyboardInput would default too.
            // Ensuring KeyboardInput gets a valid target or this.keyboard might fail.
        }


        try {
            /** @type {KeyboardInput} Instance of the keyboard input handler. */
            this.keyboard = new KeyboardInput(keyboardTarget); // Use validated or default target
            /** @type {MouseInput} Instance of the mouse input handler. */
            this.mouse = new MouseInput(canvasElement, engine);
        } catch (error) {
            this.engine.errorHandler.critical('Failed to initialize input handlers (KeyboardInput or MouseInput).', {
                component: 'InputManager',
                method: 'constructor',
                originalError: error
            });
            // To prevent further errors, ensure keyboard and mouse are non-null or throw to stop InputManager creation.
            // For now, we'll let the error propagate if critical, or ensure they are assigned something.
            // Assigning null or a safe dummy object might be an alternative if we don't re-throw.
            this.keyboard = this.keyboard || null; // Ensure it's defined even if constructor failed
            this.mouse = this.mouse || null;       // Ensure it's defined
            throw error; // Re-throw as this is critical for InputManager functionality
        }

        // GamepadInput could be initialized here if implemented
        // /** @type {GamepadInput | undefined} Instance of the gamepad input handler. */
        // this.gamepad = new GamepadInput(); // Or based on an option

        /** @type {boolean} Stores the configuration for preventing context menu. */
        if (validOptions.preventContextMenu !== undefined && typeof validOptions.preventContextMenu !== 'boolean') {
            this.engine.errorHandler.warn(`InputManager constructor: options.preventContextMenu should be a boolean. Defaulting to true.`, { component: 'InputManager', method: 'constructor', providedType: typeof validOptions.preventContextMenu });
            this.preventContextMenu = true;
        } else {
            this.preventContextMenu = validOptions.preventContextMenu === undefined ? true : !!validOptions.preventContextMenu;
        }

        this.engine.errorHandler.info("InputManager Initialized.", { component: "InputManager", method: "constructor" });
    }

    /**
     * Updates all input handlers (keyboard, mouse).
     * This method should be called once per game frame by the HatchEngine's main loop
     * to clear "just pressed/released" states and prepare for the next frame's input.
     *
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     *                             (Currently not directly used by KeyboardInput/MouseInput's update, but passed for future compatibility).
     */
    update(deltaTime) {
        try {
            if (this.keyboard) this.keyboard.update();
        } catch (e) {
            this.engine.errorHandler.error('Error during KeyboardInput update.', { component: 'InputManager', method: 'update', originalError: e, inputHandler: 'KeyboardInput' });
        }
        try {
            if (this.mouse) this.mouse.update();
        } catch (e) {
            this.engine.errorHandler.error('Error during MouseInput update.', { component: 'InputManager', method: 'update', originalError: e, inputHandler: 'MouseInput' });
        }
        // if (this.gamepad) this.gamepad.update(deltaTime); // Future gamepad support
    }

    // --- Keyboard Convenience Methods ---
    /**
     * Checks if a specific key is currently held down.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check (e.g., "KeyW", "Space", "ArrowUp").
     * @returns {boolean} True if the key is currently pressed, false otherwise.
     */
    isKeyPressed(keyCode) {
        if (typeof keyCode !== 'string') {
            this.engine.errorHandler.error("InputManager.isKeyPressed: keyCode must be a string.", { component: 'InputManager', method: 'isKeyPressed', params: { keyCode } });
            return false;
        }
        return this.keyboard ? this.keyboard.isKeyPressed(keyCode) : false;
    }

    /**
     * Checks if a specific key was just pressed down in the current frame.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check.
     * @returns {boolean} True if the key was pressed down in the current frame, false otherwise.
     */
    isKeyJustPressed(keyCode) {
        if (typeof keyCode !== 'string') {
            this.engine.errorHandler.error("InputManager.isKeyJustPressed: keyCode must be a string.", { component: 'InputManager', method: 'isKeyJustPressed', params: { keyCode } });
            return false;
        }
        return this.keyboard ? this.keyboard.isKeyJustPressed(keyCode) : false;
    }

    /**
     * Checks if a specific key was just released in the current frame.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check.
     * @returns {boolean} True if the key was released in the current frame, false otherwise.
     */
    isKeyJustReleased(keyCode) {
        if (typeof keyCode !== 'string') {
            this.engine.errorHandler.error("InputManager.isKeyJustReleased: keyCode must be a string.", { component: 'InputManager', method: 'isKeyJustReleased', params: { keyCode } });
            return false;
        }
        return this.keyboard ? this.keyboard.isKeyJustReleased(keyCode) : false;
    }

    // --- Mouse Convenience Methods ---
    /**
     * Gets the current mouse position in logical canvas coordinates.
     * The coordinates are relative to the top-left of the canvas element provided during construction,
     * scaled appropriately if the canvas's display size differs from its logical resolution
     * (as handled by `MouseInput` using canvas `width`/`height` and `getBoundingClientRect`).
     * @returns {{x: number, y: number}} An object with `x` and `y` properties representing the mouse position in logical pixels.
     */
    getMousePosition() {
        return this.mouse ? this.mouse.getMousePosition() : { x: 0, y: 0 };
    }

    /**
     * Checks if a specific mouse button is currently held down.
     * @param {0|1|2} buttonCode - The mouse button code (0 for left, 1 for middle, 2 for right).
     * @returns {boolean} True if the button is currently pressed, false otherwise.
     */
    isMouseButtonPressed(buttonCode) {
        if (typeof buttonCode !== 'number') {
            this.engine.errorHandler.error("InputManager.isMouseButtonPressed: buttonCode must be a number.", { component: 'InputManager', method: 'isMouseButtonPressed', params: { buttonCode } });
            return false;
        }
        return this.mouse ? this.mouse.isMouseButtonPressed(buttonCode) : false;
    }

    /**
     * Checks if a specific mouse button was just pressed down in the current frame.
     * @param {0|1|2} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was pressed down in the current frame, false otherwise.
     */
    isMouseButtonJustPressed(buttonCode) {
        if (typeof buttonCode !== 'number') {
            this.engine.errorHandler.error("InputManager.isMouseButtonJustPressed: buttonCode must be a number.", { component: 'InputManager', method: 'isMouseButtonJustPressed', params: { buttonCode } });
            return false;
        }
        return this.mouse ? this.mouse.isMouseButtonJustPressed(buttonCode) : false;
    }

    /**
     * Checks if a specific mouse button was just released in the current frame.
     * @param {0|1|2} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was released in the current frame, false otherwise.
     */
    isMouseButtonJustReleased(buttonCode) {
        if (typeof buttonCode !== 'number') {
            this.engine.errorHandler.error("InputManager.isMouseButtonJustReleased: buttonCode must be a number.", { component: 'InputManager', method: 'isMouseButtonJustReleased', params: { buttonCode } });
            return false;
        }
        return this.mouse ? this.mouse.isMouseButtonJustReleased(buttonCode) : false;
    }

    /**
     * Gets the horizontal mouse scroll wheel delta for the current frame.
     * Positive values usually indicate scrolling right, negative values scrolling left.
     * @returns {number} The horizontal scroll delta.
     */
    getMouseScrollDeltaX() {
        return this.mouse ? this.mouse.getScrollDeltaX() : 0;
    }

    /**
     * Gets the vertical mouse scroll wheel delta for the current frame.
     * Positive values usually indicate scrolling down, negative values scrolling up.
     * @returns {number} The vertical scroll delta.
     */
    getMouseScrollDeltaY() {
        return this.mouse ? this.mouse.getScrollDeltaY() : 0;
    }

    /**
     * Gets the mouse position in grid coordinates.
     * This is a convenience method that delegates to the MouseInput instance.
     * Requires GridManager to be set up and a camera for coordinate conversion.
     * @returns {{x: number, y: number} | null} Grid coordinates {x, y} or null if not applicable/available.
     */
    getMouseGridPosition() {
        if (this.mouse && typeof this.mouse.getMouseGridPosition === 'function') {
            return this.mouse.getMouseGridPosition();
        }
        // this.engine.errorHandler.warn('InputManager: MouseInput or getMouseGridPosition method not available.', { component: 'InputManager', method: 'getMouseGridPosition' });
        return null;
    }

    // --- Gamepad Convenience Methods (Example for future expansion) ---
    // /**
    //  * Checks if a gamepad button is pressed.
    //  * @param {number} gamepadIndex - The index of the gamepad.
    //  * @param {number} buttonIndex - The index of the button on the gamepad.
    //  * @returns {boolean} True if pressed, false otherwise.
    //  */
    // isGamepadButtonPressed(gamepadIndex, buttonIndex) {
    //     return this.gamepad ? this.gamepad.isButtonPressed(gamepadIndex, buttonIndex) : false;
    // }
    //
    // /**
    //  * Gets the value of a gamepad axis.
    //  * @param {number} gamepadIndex - The index of the gamepad.
    //  * @param {number} axisIndex - The index of the axis on the gamepad.
    //  * @returns {number} The axis value, typically between -1 and 1.
    //  */
    // getGamepadAxisValue(gamepadIndex, axisIndex) {
    //     return this.gamepad ? this.gamepad.getAxis(gamepadIndex, axisIndex) : 0;
    // }

    /**
     * Cleans up resources by detaching event listeners from their targets.
     * This should be called when the engine is stopping or the InputManager is no longer needed
     * to prevent memory leaks and unintended behavior.
     */
    destroy() {
        try {
            if (this.keyboard) {
                this.keyboard.detachEvents();
            }
        } catch (e) {
            this.engine.errorHandler.warn('Error detaching keyboard events.', { component: 'InputManager', method: 'destroy', originalError: e, inputHandler: 'KeyboardInput' });
        }
        try {
            if (this.mouse) {
                this.mouse.detachEvents();
            }
        } catch (e) {
            this.engine.errorHandler.warn('Error detaching mouse events.', { component: 'InputManager', method: 'destroy', originalError: e, inputHandler: 'MouseInput' });
        }
        // if (this.gamepad) this.gamepad.destroy();
        this.engine.errorHandler.info("InputManager Destroyed and event listeners detached.", {
            component: "InputManager",
            method: "destroy"
        });
    }
}

export default InputManager;
