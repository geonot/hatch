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

        /** @type {KeyboardInput} Instance of the keyboard input handler. */
        this.keyboard = new KeyboardInput(options.keyboardEventTarget || window);
        /** @type {MouseInput} Instance of the mouse input handler. */
        this.mouse = new MouseInput(canvasElement, engine);

        // GamepadInput could be initialized here if implemented
        // /** @type {GamepadInput | undefined} Instance of the gamepad input handler. */
        // this.gamepad = new GamepadInput(); // Or based on an option

        /** @type {boolean} Stores the configuration for preventing context menu. */
        this.preventContextMenu = options.preventContextMenu === undefined ? true : !!options.preventContextMenu;

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
        this.keyboard.update();
        this.mouse.update();
        // if (this.gamepad) this.gamepad.update(deltaTime); // Future gamepad support
    }

    // --- Keyboard Convenience Methods ---
    /**
     * Checks if a specific key is currently held down.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check (e.g., "KeyW", "Space", "ArrowUp").
     * @returns {boolean} True if the key is currently pressed, false otherwise.
     */
    isKeyPressed(keyCode) {
        return this.keyboard.isKeyPressed(keyCode);
    }

    /**
     * Checks if a specific key was just pressed down in the current frame.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check.
     * @returns {boolean} True if the key was pressed down in the current frame, false otherwise.
     */
    isKeyJustPressed(keyCode) {
        return this.keyboard.isKeyJustPressed(keyCode);
    }

    /**
     * Checks if a specific key was just released in the current frame.
     * @param {string} keyCode - The `KeyboardEvent.code` of the key to check.
     * @returns {boolean} True if the key was released in the current frame, false otherwise.
     */
    isKeyJustReleased(keyCode) {
        return this.keyboard.isKeyJustReleased(keyCode);
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
        return this.mouse.getMousePosition();
    }

    /**
     * Checks if a specific mouse button is currently held down.
     * @param {0|1|2} buttonCode - The mouse button code (0 for left, 1 for middle, 2 for right).
     * @returns {boolean} True if the button is currently pressed, false otherwise.
     */
    isMouseButtonPressed(buttonCode) {
        return this.mouse.isMouseButtonPressed(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just pressed down in the current frame.
     * @param {0|1|2} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was pressed down in the current frame, false otherwise.
     */
    isMouseButtonJustPressed(buttonCode) {
        return this.mouse.isMouseButtonJustPressed(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just released in the current frame.
     * @param {0|1|2} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was released in the current frame, false otherwise.
     */
    isMouseButtonJustReleased(buttonCode) {
        return this.mouse.isMouseButtonJustReleased(buttonCode);
    }

    /**
     * Gets the horizontal mouse scroll wheel delta for the current frame.
     * Positive values usually indicate scrolling right, negative values scrolling left.
     * @returns {number} The horizontal scroll delta.
     */
    getMouseScrollDeltaX() {
        return this.mouse.getScrollDeltaX();
    }

    /**
     * Gets the vertical mouse scroll wheel delta for the current frame.
     * Positive values usually indicate scrolling down, negative values scrolling up.
     * @returns {number} The vertical scroll delta.
     */
    getMouseScrollDeltaY() {
        return this.mouse.getScrollDeltaY();
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
        if (this.keyboard) {
            this.keyboard.detachEvents();
        }
        if (this.mouse) {
            this.mouse.detachEvents();
        }
        // if (this.gamepad) this.gamepad.destroy();
        this.engine.errorHandler.info("InputManager Destroyed and event listeners detached.", {
            component: "InputManager",
            method: "destroy"
        });
    }
}

export default InputManager;
