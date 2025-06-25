/**
 * @file MouseInput.js
 * @description Handles mouse input events for a specified HTML element (typically the game canvas).
 * It tracks mouse position (scaled to logical canvas coordinates), button states (pressed,
 * just pressed, just released), and mouse wheel scroll deltas.
 */
import { InputEvents } from '../core/Constants.js'; // Import new events

/**
 * @class MouseInput
 * @classdesc Manages mouse event listeners and tracks mouse state relative to a target HTML element.
 * It correctly scales mouse coordinates from the element's client space to the game's logical
 * coordinate system, accounting for CSS sizing and DPI scaling.
 *
 * @property {HTMLElement} targetElement - The HTML element to which mouse listeners are attached.
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine for accessing configuration (e.g., logical canvas dimensions).
 * @property {number} x - The current x-coordinate of the mouse, scaled to logical canvas coordinates.
 * @property {number} y - The current y-coordinate of the mouse, scaled to logical canvas coordinates.
 * @property {Set<number>} pressedButtons - A set of button codes for mouse buttons currently held down.
 * @property {Set<number>} justPressedButtons - A set of button codes for mouse buttons pressed in the current frame. Cleared on `update()`.
 * @property {Set<number>} justReleasedButtons - A set of button codes for mouse buttons released in the current frame. Cleared on `update()`.
 * @property {number} scrollDeltaX - The horizontal scroll delta from the mouse wheel in the current frame.
 * @property {number} scrollDeltaY - The vertical scroll delta from the mouse wheel in the current frame.
 */
class MouseInput {
    /**
     * Creates an instance of MouseInput.
     * @param {HTMLElement} targetElement - The HTML element to attach mouse event listeners to (e.g., the game canvas).
     * @param {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance, used for accessing
     *                                   engine configuration like logical canvas dimensions for coordinate scaling.
     * @throws {Error} If `targetElement` or a valid `engine` instance (with config) is not provided.
     */
    constructor(targetElement, engine) {
        if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') {
            throw new Error("MouseInput constructor: A valid HTML targetElement with getBoundingClientRect is required.");
        }
        // Updated to check engine.width and engine.height directly as per HatchEngine structure
        if (!engine || typeof engine.width !== 'number' || typeof engine.height !== 'number') {
            throw new Error("MouseInput constructor: A valid engine instance with width/height properties is required.");
        }

        /** @type {HTMLElement} */
        this.targetElement = targetElement;
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;

        /** @type {number} Scaled mouse x-coordinate within the logical canvas. */
        this.x = 0;
        /** @type {number} Scaled mouse y-coordinate within the logical canvas. */
        this.y = 0;

        /** @type {Set<number>} Stores `event.button` codes of currently pressed buttons. */
        this.pressedButtons = new Set();
        /** @type {Set<number>} Stores `event.button` codes of buttons pressed this frame. */
        this.justPressedButtons = new Set();
        /** @type {Set<number>} Stores `event.button` codes of buttons released this frame. */
        this.justReleasedButtons = new Set();

        /** @type {number} Horizontal scroll delta for the current frame. */
        this.scrollDeltaX = 0;
        /** @type {number} Vertical scroll delta for the current frame. */
        this.scrollDeltaY = 0;

        // Bind event handlers to ensure `this` context.
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onWheel = this._onWheel.bind(this);

        this.attachEvents();
    }

    /**
     * Attaches mouse event listeners (`mousemove`, `mousedown`, `mouseup`, `contextmenu`, `wheel`)
     * to the `targetElement`.
     */
    attachEvents() {
        this.targetElement.addEventListener('mousemove', this._onMouseMove, false);
        this.targetElement.addEventListener('mousedown', this._onMouseDown, false);
        this.targetElement.addEventListener('mouseup', this._onMouseUp, false); // Listen on target, could also listen on window/document for dragging out
        this.targetElement.addEventListener('contextmenu', this._onContextMenu, false);
        this.targetElement.addEventListener('wheel', this._onWheel, { passive: false }); // Use { passive: false } if preventDefault might be called
    }

    /**
     * Detaches all mouse event listeners from the `targetElement`.
     * Important for cleanup.
     */
    detachEvents() {
        this.targetElement.removeEventListener('mousemove', this._onMouseMove, false);
        this.targetElement.removeEventListener('mousedown', this._onMouseDown, false);
        this.targetElement.removeEventListener('mouseup', this._onMouseUp, false);
        this.targetElement.removeEventListener('contextmenu', this._onContextMenu, false);
        this.targetElement.removeEventListener('wheel', this._onWheel, false);
    }

    /**
     * Handles the `contextmenu` event to prevent the default browser context menu
     * from appearing over the `targetElement` (e.g., game canvas).
     * @param {MouseEvent} event - The DOM MouseEvent object.
     * @private
     */
    _onContextMenu(event) {
        // Prevent default context menu if InputManager.preventContextMenu is true (managed by InputManager logic if needed)
        // For now, assuming if this handler is attached, prevention is desired.
        event.preventDefault();
    }

    /**
     * Handles the `mousemove` event. Updates the internal mouse position (`this.x`, `this.y`)
     * by scaling the event's client coordinates to the logical coordinates of the canvas.
     * @param {MouseEvent} event - The DOM MouseEvent object.
     * @private
     */
    _onMouseMove(event) {
        const rect = this.targetElement.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas element
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;

        // Always scale to logical coordinates based on actual display size
        // This adapts to whatever size the browser decides to display the canvas
        this.x = (clientX / rect.width) * this.engine.width;
        this.y = (clientY / rect.height) * this.engine.height;

        // Emit grid mouse move event
        this._emitGridMouseEvent(InputEvents.GRID_MOUSEMOVE, event);
    }

    /**
     * Handles the `mousedown` event. Updates `pressedButtons` and `justPressedButtons`.
     * Emits `grid:mousedown` if applicable.
     * @param {MouseEvent} event - The DOM MouseEvent object.
     * @private
     */
    _onMouseDown(event) {
        const buttonCode = event.button; // 0: Left, 1: Middle, 2: Right
        if (!this.pressedButtons.has(buttonCode)) {
            this.justPressedButtons.add(buttonCode);
        }
        this.pressedButtons.add(buttonCode);

        // Emit grid mouse down event
        this._emitGridMouseEvent(InputEvents.GRID_MOUSEDOWN, event, buttonCode);
    }

    /**
     * Handles the `mouseup` event. Updates `pressedButtons` and `justReleasedButtons`.
     * Emits `grid:mouseup` if applicable.
     * @param {MouseEvent} event - The DOM MouseEvent object.
     * @private
     */
    _onMouseUp(event) {
        const buttonCode = event.button;
        this.pressedButtons.delete(buttonCode);
        this.justReleasedButtons.add(buttonCode);

        // Emit grid mouse up event
        this._emitGridMouseEvent(InputEvents.GRID_MOUSEUP, event, buttonCode);
    }

    /**
     * Helper method to get current mouse world coordinates.
     * Assumes `this.x` and `this.y` are logical canvas coordinates.
     * @returns {{worldX: number, worldY: number} | null} The world coordinates or null if camera is not available.
     * @private
     */
    _getMouseWorldPosition() {
        if (this.engine && this.engine.renderingEngine && this.engine.renderingEngine.camera &&
            typeof this.engine.renderingEngine.camera.screenToWorld === 'function') {
            // Pass the logical canvas coordinates (this.x, this.y) to screenToWorld
            return this.engine.renderingEngine.camera.screenToWorld(this.x, this.y);
        }
        return null;
    }

    /**
     * Gets the mouse position in grid coordinates based on the engine's current GridManager.
     * @returns {{gridX: number, gridY: number} | null} Grid coordinates {gridX, gridY}
     *          or null if no active GridManager or mouse is outside the grid.
     */
    getMouseGridPosition() {
        if (this.engine && this.engine.gridManager && typeof this.engine.gridManager.screenToGrid === 'function') {
            // this.x and this.y are already scaled logical canvas coordinates
            return this.engine.gridManager.screenToGrid(this.x, this.y);
        }
        // this.engine.errorHandler.debug('MouseInput.getMouseGridPosition: No active GridManager on engine or screenToGrid method missing.', { component: 'MouseInput' });
        return null;
    }

    /**
     * Helper to emit grid-related mouse events via the engine's event bus.
     * This method calculates the mouse's grid position. If the mouse is over a valid
     * grid cell (according to the active `engine.gridManager`), it emits the specified event.
     * The event payload includes grid coordinates (`gridX`, `gridY`),
     * logical screen coordinates (`screenX`, `screenY`), the original DOM event (`rawEvent`),
     * and optionally the mouse button code.
     * @param {string} eventName - The name of the event to emit (e.g., `InputEvents.GRID_MOUSEDOWN`).
     * @param {MouseEvent} rawEvent - The original DOM MouseEvent.
     * @param {number} [button] - The mouse button code (e.g., 0 for left, 1 for middle, 2 for right),
     *                            relevant for mousedown and mouseup events.
     * @private
     */
    _emitGridMouseEvent(eventName, rawEvent, button) {
        if (!this.engine || !this.engine.eventBus || !this.engine.eventBus.emit) {
            // Event bus is not available, cannot emit.
            // This might be a setup issue or called too early/late in lifecycle.
            // console.warn('MouseInput: Event bus not available for emitting grid mouse event.');
            return;
        }

        // Note: getMouseGridPosition internally calls _getMouseWorldPosition.
        // So, we get both grid and potentially world coordinates from its logic.
        const gridPos = this.getMouseGridPosition(); // This now returns {gridX, gridY} or null
        if (!gridPos) {
            return;
        }

        const eventPayload = {
            gridX: gridPos.gridX, // Use gridX from the new getMouseGridPosition
            gridY: gridPos.gridY, // Use gridY
            screenX: this.x,      // Logical canvas X
            screenY: this.y,      // Logical canvas Y
            rawEvent: rawEvent,
        };

        // Optionally, re-add world coordinates if strictly needed by consumers,
        // but screenToGrid in GridManager implies it handles the necessary conversions.
        // const worldPos = this._getMouseWorldPosition();
        // if (worldPos) {
        // eventPayload.worldX = worldPos.worldX;
        // eventPayload.worldY = worldPos.worldY;
        // }

        if (button !== undefined) {
            eventPayload.button = button;
        }

        this.engine.eventBus.emit(eventName, eventPayload);
    }

    /**
     * Handles the `wheel` event. Accumulates scroll deltas.
     * @param {WheelEvent} event - The DOM WheelEvent object.
     * @private
     */
    _onWheel(event) {
        // Example: if (this.engine.config.input.preventDefaultWheelScroll) event.preventDefault();
        this.scrollDeltaX += event.deltaX;
        this.scrollDeltaY += event.deltaY;
    }

    /**
     * Updates the state of "just pressed/released" buttons and resets scroll deltas.
     * Called once per game frame by the InputManager.
     */
    update() {
        this.justPressedButtons.clear();
        this.justReleasedButtons.clear();
        this.scrollDeltaX = 0;
        this.scrollDeltaY = 0;
    }

    /**
     * Gets the current mouse position, scaled to logical canvas coordinates.
     * @returns {{x: number, y: number}} An object with `x` and `y` properties for the mouse position.
     */
    getMousePosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Checks if a specific mouse button is currently held down.
     * @param {number} buttonCode - The button code to check (0 for left, 1 for middle, 2 for right).
     * @returns {boolean} True if the button is pressed, false otherwise.
     */
    isMouseButtonPressed(buttonCode) {
        return this.pressedButtons.has(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just pressed down in the current frame.
     * @param {number} buttonCode - The button code to check.
     * @returns {boolean} True if the button was "just pressed" in this frame, false otherwise.
     */
    isMouseButtonJustPressed(buttonCode) {
        return this.justPressedButtons.has(buttonCode);
    }

    /**
     * Checks if a specific mouse button was just released in the current frame.
     * @param {number} buttonCode - The button code to check.
     * @returns {boolean} True if the button was "just released" in this frame, false otherwise.
     */
    isMouseButtonJustReleased(buttonCode) {
        return this.justReleasedButtons.has(buttonCode);
    }

    /**
     * Gets the accumulated horizontal scroll delta from the mouse wheel for the current frame.
     * This value is reset on each `update()` call.
     * @returns {number} The horizontal scroll delta.
     */
    getScrollDeltaX() {
        return this.scrollDeltaX;
    }

    /**
     * Gets the accumulated vertical scroll delta from the mouse wheel for the current frame.
     * This value is reset on each `update()` call.
     * @returns {number} The vertical scroll delta.
     */
    getScrollDeltaY() {
        return this.scrollDeltaY;
    }
}

export default MouseInput;
