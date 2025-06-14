export class EventBus {
    constructor() {
        this.listeners = {};
        // console.log('[EventBus] Initialized'); // Optional: for debugging
    }

    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.warn(`[EventBus] Attempted to register non-function callback for event: ${eventName}`);
            return;
        }
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
        // console.log(`[EventBus] Listener added for: ${eventName}`); // Optional: for debugging
    }

    off(eventName, callbackToRemove) {
        if (!this.listeners[eventName]) {
            // console.warn(`[EventBus] Attempted to remove listener for non-existent event: ${eventName}`); // Optional
            return;
        }

        this.listeners[eventName] = this.listeners[eventName].filter(
            (callback) => callback !== callbackToRemove
        );
        // console.log(`[EventBus] Listener removed for: ${eventName}`); // Optional: for debugging
    }

    emit(eventName, ...args) {
        // console.log(`[EventBus] Emitting event: ${eventName}`, args); // Optional: for debugging
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach((callback) => {
            try {
                callback(...args);
            } catch (error) {
                // Consider using a more robust error handling mechanism here
                // For now, just log to console to avoid crashing the event emitter loop
                console.error(`[EventBus] Error in callback for event "${eventName}":`, error);
            }
        });
    }
}
