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
 * @classdesc Manages keyboard and mouse input handlers. It initializes these handlers
 * and calls their update methods each frame. It also provides convenience methods
 * to access input states.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
 * @property {KeyboardInput} keyboard - The keyboard input handler instance.
 * @property {MouseInput} mouse - The mouse input handler instance.
 * @property {boolean} preventContextMenu - Whether the default browser context menu is prevented on the target element.
 */
class InputManager {
    /**
     * Creates an instance of InputManager.
     * @param {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
     *        Used for accessing engine configurations or other systems if needed.
     * @param {HTMLElement} canvasElement - The primary HTML element for mouse input, typically the game canvas.
     *                                    This element's `getBoundingClientRect` is used for accurate mouse coordinate scaling.
     * @param {Object} [options={}] - Configuration options for input handling.
     * @param {EventTarget} [options.keyboardEventTarget=window] - The DOM EventTarget to attach keyboard listeners to. Defaults to `window`.
     * @param {boolean} [options.preventContextMenu=true] - If true, prevents the default browser context menu
     *                                                    when right-clicking on the `canvasElement`.
     * @throws {Error} If `engine` or `canvasElement` is not provided.
     */
    constructor(engine, canvasElement, options = {}) {
        if (!engine) {
            throw new Error("InputManager constructor: HatchEngine instance is required.");
        }
        if (!canvasElement) {
            throw new Error("InputManager constructor: Canvas element is required for MouseInput.");
        }
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;

        /** @type {KeyboardInput} */
        this.keyboard = new KeyboardInput(options.keyboardEventTarget || window);
        /** @type {MouseInput} */
        this.mouse = new MouseInput(canvasElement, engine); // Pass engine for config access (e.g., canvas logical size)

        // GamepadInput could be initialized here if implemented
        // this.gamepad = new GamepadInput();

        /** @type {boolean} */
        this.preventContextMenu = options.preventContextMenu === undefined ? true : options.preventContextMenu;
        if (this.preventContextMenu) {
            // MouseInput handles event.preventDefault() for 'contextmenu' if attached to canvasElement.
            // This option is more of a policy setting for InputManager itself.
        }

        console.log("InputManager: Initialized.");
    }

    /**
     * Updates all input handlers (keyboard, mouse).
     * This method should be called once per game frame by the HatchEngine's main loop
     * to clear "just pressed/released" states and prepare for the next frame's input.
     *
     * @param {number} deltaTime - The time elapsed since the last frame, in seconds.
     *                             Not directly used by KeyboardInput/MouseInput's update, but good practice for manager updates.
     */
    update(deltaTime) {
        this.keyboard.update();
        this.mouse.update();
        // if (this.gamepad) this.gamepad.update(deltaTime);
    }

    // --- Keyboard Convenience Methods ---
    /**
     * Checks if a specific key is currently held down.
     * @param {string} keyCode - The `event.code` of the key to check (e.g., "KeyW", "Space", "ArrowUp").
     * @returns {boolean} True if the key is currently pressed, false otherwise.
     */
    isKeyPressed(keyCode) {
        return this.keyboard.isKeyPressed(keyCode);
    }

    /**
     * Checks if a specific key was just pressed down in the current frame.
     * @param {string} keyCode - The `event.code` of the key to check.
     * @returns {boolean} True if the key was pressed in this frame, false otherwise.
     */
    isKeyJustPressed(keyCode) {
        return this.keyboard.isKeyJustPressed(keyCode);
    }

    /**
     * Checks if a specific key was just released in the current frame.
     * @param {string} keyCode - The `event.code` of the key to check.
     * @returns {boolean} True if the key was released in this frame, false otherwise.
     */
    isKeyJustReleased(keyCode) {
        return this.keyboard.isKeyJustReleased(keyCode);
    }

    // --- Mouse Convenience Methods ---
    /**
     * Gets the current mouse position in logical canvas coordinates.
     * The coordinates are relative to the top-left of the canvas, scaled appropriately
     * if the canvas's display size differs from its logical resolution (e.g., due to DPI scaling).
     * @returns {{x: number, y: number}} An object with `x` and `y` properties representing the mouse position.
     */
    getMousePosition() {
        return this.mouse.getMousePosition();
    }

    /**
     * Checks if a specific mouse button is currently held down.
     * @param {number} buttonCode - The mouse button code (0 for left, 1 for middle, 2 for right).
     * @returns {boolean} True if the button is currently pressed, false otherwise.
     */
    isMouseButtonPressed(buttonCode) {
        return this.mouse.isMouseButtonPressed(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just pressed down in the current frame.
     * @param {number} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was pressed in this frame, false otherwise.
     */
    isMouseButtonJustPressed(buttonCode) {
        return this.mouse.isMouseButtonJustPressed(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just released in the current frame.
     * @param {number} buttonCode - The mouse button code.
     * @returns {boolean} True if the button was released in this frame, false otherwise.
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
        // if (this.gamepad) this.gamepad.destroy(); // If gamepad support is added
        console.log("InputManager: Destroyed and event listeners detached.");
    }
}

export default InputManager;
