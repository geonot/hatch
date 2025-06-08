/**
 * @file KeyboardInput.js
 * @description Handles keyboard input by listening to DOM keyboard events.
 * It tracks the state of keys: currently pressed, just pressed in the current frame,
 * and just released in the current frame. Uses `event.code` for layout-independent key tracking.
 */

/**
 * @class KeyboardInput
 * @classdesc Manages keyboard event listeners and tracks the state of keyboard keys.
 *
 * @property {Set<string>} pressedKeys - A set of `event.code` strings for keys currently held down.
 * @property {Set<string>} justPressedKeys - A set of `event.code` strings for keys pressed in the current frame. Cleared on `update()`.
 * @property {Set<string>} justReleasedKeys - A set of `event.code` strings for keys released in the current frame. Cleared on `update()`.
 * @property {EventTarget} eventTarget - The DOM element on which keyboard event listeners are attached.
 */
class KeyboardInput {
    /**
     * Creates an instance of KeyboardInput.
     * Initializes sets for key states and attaches event listeners.
     * @param {EventTarget} [eventTarget=window] - The DOM element to listen for keyboard events on.
     *                                             Defaults to `window`, capturing all keyboard events.
     */
    constructor(eventTarget = window) {
        /** @type {Set<string>} Stores `event.code` of currently pressed keys. */
        this.pressedKeys = new Set();
        /** @type {Set<string>} Stores `event.code` of keys pressed this frame. */
        this.justPressedKeys = new Set();
        /** @type {Set<string>} Stores `event.code` of keys released this frame. */
        this.justReleasedKeys = new Set();
        /** @type {EventTarget} The target element for keyboard events. */
        this.eventTarget = eventTarget;

        // Bind event handlers to this instance to ensure `this` context is correct.
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this.attachEvents();
    }

    /**
     * Attaches `keydown` and `keyup` event listeners to the `eventTarget`.
     * Idempotent: if called multiple times, listeners are not duplicated by standard addEventListener behavior
     * (but internal state of this class doesn't prevent re-adding if it were custom).
     */
    attachEvents() {
        if (!this.eventTarget || !this.eventTarget.addEventListener) {
            console.warn("KeyboardInput: eventTarget is null or does not support addEventListener. Keyboard input will not be captured.");
            return;
        }
        this.eventTarget.addEventListener('keydown', this._onKeyDown, false);
        this.eventTarget.addEventListener('keyup', this._onKeyUp, false);
        // console.log("KeyboardInput: Events attached to", this.eventTarget);
    }

    /**
     * Detaches `keydown` and `keyup` event listeners from the `eventTarget`.
     * Important for cleanup to prevent memory leaks or unintended behavior when
     * the input handler is no longer needed.
     */
    detachEvents() {
        if (!this.eventTarget || !this.eventTarget.removeEventListener) {
            // console.warn("KeyboardInput: eventTarget is null or does not support removeEventListener during detach.");
            return;
        }
        this.eventTarget.removeEventListener('keydown', this._onKeyDown, false);
        this.eventTarget.removeEventListener('keyup', this._onKeyUp, false);
        // console.log("KeyboardInput: Events detached from", this.eventTarget);
    }

    /**
     * Handles the `keydown` event. Updates `pressedKeys` and `justPressedKeys` sets.
     * Uses `event.code` to identify keys, which is generally preferred for game controls
     * as it represents the physical key location rather than the character produced.
     * @param {KeyboardEvent} event - The DOM KeyboardEvent object.
     * @private
     */
    _onKeyDown(event) {
        const keyCode = event.code;
        // Add to justPressedKeys only if it wasn't already pressed (handles key repeat correctly for "just pressed")
        if (!this.pressedKeys.has(keyCode)) {
            this.justPressedKeys.add(keyCode);
        }
        this.pressedKeys.add(keyCode);

        // Optional: Prevent default browser behavior for certain keys.
        // Example: Prevent scrolling with arrow keys or spacebar.
        // if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(keyCode)) {
        //     event.preventDefault();
        // }
    }

    /**
     * Handles the `keyup` event. Updates `pressedKeys` and `justReleasedKeys` sets.
     * @param {KeyboardEvent} event - The DOM KeyboardEvent object.
     * @private
     */
    _onKeyUp(event) {
        const keyCode = event.code;
        this.pressedKeys.delete(keyCode);
        this.justReleasedKeys.add(keyCode);
    }

    /**
     * Updates the state of "just pressed" and "just released" keys.
     * This method should be called once per game frame by the InputManager,
     * typically at the beginning or end of the frame, to clear the single-frame state flags.
     */
    update() {
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
    }

    /**
     * Checks if a specific key is currently held down.
     * @param {string} keyCode - The `event.code` of the key to check (e.g., "KeyW", "Space", "ArrowLeft").
     * @returns {boolean} True if the key is currently pressed, false otherwise.
     */
    isKeyPressed(keyCode) {
        return this.pressedKeys.has(keyCode);
    }

    /**
     * Checks if a specific key was pressed down in the current frame.
     * This state is true only for the single frame immediately after the key is pressed.
     * @param {string} keyCode - The `event.code` of the key to check.
     * @returns {boolean} True if the key was "just pressed" in this frame, false otherwise.
     */
    isKeyJustPressed(keyCode) {
        return this.justPressedKeys.has(keyCode);
    }

    /**
     * Checks if a specific key was released in the current frame.
     * This state is true only for the single frame immediately after the key is released.
     * @param {string} keyCode - The `event.code` of the key to check.
     * @returns {boolean} True if the key was "just released" in this frame, false otherwise.
     */
    isKeyJustReleased(keyCode) {
        return this.justReleasedKeys.has(keyCode);
    }
}

export default KeyboardInput;
