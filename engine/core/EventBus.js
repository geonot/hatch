/**
 * @file EventBus.js
 * @description A simple event bus system for decoupled communication within the HatchEngine.
 * Allows various parts of the engine or game to subscribe to and emit events
 * without having direct dependencies on each other.
 */

/**
 * @class EventBus
 * @classdesc Provides a publish-subscribe mechanism for events.
 * Listeners can register callbacks for specific event types, and when an event
 * of that type is emitted, all registered callbacks are invoked.
 */
class EventBus {
    /**
     * Creates an instance of EventBus.
     * Initializes an empty object to store listeners for different event types.
     */
    constructor() {
        /**
         * Stores all registered event listeners.
         * The keys are event type strings, and the values are arrays of callback functions.
         * @type {Object<string, Array<Function>>}
         * @private
         */
        this.listeners = {};
    }

    /**
     * Registers an event listener for a given event type.
     * If the same callback is already registered for the event type, it will not be added again.
     *
     * @param {string} eventType - The name of the event to listen for (e.g., 'engine:start', 'asset:loaded').
     * @param {Function} callback - The function to be called when the event is emitted.
     *                              This function will receive any payload passed during the event emission.
     */
    on(eventType, callback) {
        if (typeof callback !== 'function') {
            console.warn(`EventBus.on: Provided callback for event type "${eventType}" is not a function.`);
            return;
        }
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        if (!this.listeners[eventType].includes(callback)) {
            this.listeners[eventType].push(callback);
        }
    }

    /**
     * Unregisters an event listener for a given event type.
     * If the specified callback is not found for the event type, this method does nothing.
     *
     * @param {string} eventType - The name of the event from which to remove the listener.
     * @param {Function} callback - The callback function to remove. Must be the same function reference
     *                              that was used during registration.
     */
    off(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType] = this.listeners[eventType].filter(
                (listener) => listener !== callback
            );
            if (this.listeners[eventType].length === 0) {
                delete this.listeners[eventType]; // Clean up if no listeners remain for this type
            }
        }
    }

    /**
     * Emits an event, calling all registered listeners for that event type.
     * Callbacks are invoked synchronously in the order they were registered.
     * If a listener throws an error, it is caught and logged, and other listeners will still be invoked.
     *
     * @param {string} eventType - The name of the event to emit.
     * @param {any} [payload] - Optional data to pass to the event listeners as an argument.
     */
    emit(eventType, payload) {
        if (this.listeners[eventType]) {
            // Iterate over a copy of the listeners array in case a listener modifies the array (e.g., by calling off())
            [...this.listeners[eventType]].forEach((callback) => {
                try {
                    callback(payload);
                } catch (error) {
                    // Standard error logging. Consider using a global error handler if the EventBus has access to one.
                    console.error(`EventBus: Error in listener for event "${eventType}":`, error.message, error.stack);
                    // Example: if (this.engine && this.engine.errorHandler) {
                    //     this.engine.errorHandler.handle(error, { context: `EventBus listener for ${eventType}` });
                    // }
                }
            });
        }
    }
}

export default EventBus;
