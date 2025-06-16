/**
 * @file EventBus.js
 * @description A simple event bus implementation for handling custom events within the HatchEngine.
 * Allows different parts of the engine to subscribe to events and emit them without direct dependencies.
 */

/**
 * @class EventBus
 * @classdesc Provides a publish-subscribe mechanism for event handling.
 * Listeners can register callbacks for named events, and other parts of the system
 * can emit events to trigger these callbacks.
 *
 * @property {Object<string, Array<Function>>} listeners - An object storing arrays of callback functions,
 *                                                        keyed by event name.
 */
export class EventBus {
    /**
     * Creates an instance of EventBus.
     */
    constructor() {
        /** @type {Object<string, Array<Function>>} */
        this.listeners = {};
    }

    /**
     * Registers a callback function to be executed when a specific event is emitted.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} callback - The function to call when the event is emitted.
     *                              This function will receive any arguments passed to `emit`.
     */
    on(eventName, callback) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.warn(`[EventBus] Attempted to register listener with invalid eventName (must be non-empty string). Received: ${eventName}`);
            return;
        }
        if (typeof callback !== 'function') {
            // This console.warn is acceptable as it's a developer error for this specific utility.
            console.warn(`[EventBus] Attempted to register non-function callback for event: ${eventName}`);
            return;
        }
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Unregisters a previously registered callback function for a specific event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {Function} callbackToRemove - The specific callback function to remove.
     *                                      Must be the same function reference used for `on`.
     */
    off(eventName, callbackToRemove) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.warn(`[EventBus] Attempted to remove listener with invalid eventName (must be non-empty string). Received: ${eventName}`);
            return;
        }
        if (typeof callbackToRemove !== 'function') {
            console.warn(`[EventBus] Attempted to remove listener with non-function callback for event: ${eventName}`);
            return;
        }

        if (!this.listeners[eventName]) {
            // console.warn(`[EventBus] Attempted to remove listener for non-existent event: ${eventName}`); // This was already commented out
            return;
        }

        this.listeners[eventName] = this.listeners[eventName].filter(
            (callback) => callback !== callbackToRemove
        );
    }

    /**
     * Emits an event, calling all registered listeners for that event with the provided arguments.
     * @param {string} eventName - The name of the event to emit.
     * @param {...any} args - Arguments to pass to the event listeners.
     */
    emit(eventName, ...args) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.warn(`[EventBus] Attempted to emit event with invalid eventName (must be non-empty string). Received: ${eventName}`);
            return;
        }
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach((callback) => {
            try {
                callback(...args);
            } catch (error) {
                // This console.error is a last resort. Ideally, individual callbacks should handle their own errors.
                // If an ErrorHandler instance were available here, it could be used.
                console.error(`[EventBus] Error in callback for event "${eventName}":`, error);
            }
        });
    }
}
