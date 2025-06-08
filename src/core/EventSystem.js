/**
 * @fileoverview Basic event system for the Hatch engine.
 */

class EventSystem {
    constructor() {
        this.listeners = new Map(); // eventName -> Set of handler objects
        this.eventQueue = [];
        this.processing = false;
        // Priorities are mentioned in spec, but for a stub, we'll keep it simple.
        // this.priorities = new Map();
        console.info("EventSystem initialized.");
    }

    /**
     * Registers an event handler for a given event type.
     * @param {string} eventName The name of the event to listen for.
     * @param {Function} handler The function to call when the event is emitted.
     * @param {Object} [options={}] Optional parameters.
     * @param {number} [options.priority=0] The priority of the handler (lower numbers run first).
     * @param {boolean} [options.once=false] If true, the handler is removed after one execution.
     * @param {Object} [options.context=null] The 'this' context for the handler.
     * @returns {string} An ID for the registered handler, useful for removal.
     */
    on(eventName, handler, options = {}) {
        const { priority = 0, once = false, context = null } = options;

        if (typeof handler !== 'function') {
            console.error("Handler must be a function.");
            return null;
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        const handlerId = `handler_${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const wrappedHandler = {
            id: handlerId,
            handlerFunction: handler,
            priority, // Stored, but not used in this basic stub's processEventQueue
            once,
            context,
        };

        this.listeners.get(eventName).add(wrappedHandler);
        // console.log(`Event listener registered for '${eventName}' with ID: ${handlerId}`);
        return handlerId;
    }

    /**
     * Removes an event handler.
     * @param {string} eventName The name of the event.
     * @param {string|Function} handlerOrId The ID returned by 'on' or the original handler function.
     * @returns {boolean} True if a handler was removed, false otherwise.
     */
    off(eventName, handlerOrId) {
        if (!this.listeners.has(eventName)) {
            return false;
        }

        const eventListeners = this.listeners.get(eventName);
        let removed = false;
        for (const listener of eventListeners) {
            if (listener.id === handlerOrId || listener.handlerFunction === handlerOrId) {
                eventListeners.delete(listener);
                // console.log(`Event listener removed for '${eventName}' with ID/handler:`, handlerOrId);
                removed = true;
                break;
            }
        }
        return removed;
    }

    /**
     * Emits an event, queuing it for processing or processing immediately.
     * @param {string} eventName The name of the event to emit.
     * @param {Object} [data={}] Data to pass to the event handlers.
     * @param {boolean} [immediate=false] If true, process the event immediately.
     *                                    Otherwise, add to queue.
     */
    emit(eventName, data = {}, immediate = false) {
        // console.log(`Event emitted: '${eventName}', Data:`, data, `Immediate: ${immediate}`);
        const eventData = {
            name: eventName,
            data: data,
            timestamp: Date.now() // performance.now() in spec, Date.now() simpler for stub
        };

        if (immediate) {
            this.processEvent(eventData);
        } else {
            this.eventQueue.push(eventData);
            // Optionally, trigger processing if not already happening
            // if (!this.processing) { this.processEventQueue(); }
        }
    }

    /**
     * Processes a single event, calling all its registered handlers.
     * @param {Object} eventData The event object from the queue or direct emit.
     */
    processEvent(eventData) {
        const { name, data } = eventData;
        const eventListeners = this.listeners.get(name);

        if (eventListeners && eventListeners.size > 0) {
            // Create a copy to iterate over, in case handlers modify the original Set (e.g., by removing themselves)
            const listenersToExecute = Array.from(eventListeners);

            // Spec mentions priority, but for a stub, we execute in registration order.
            // Real implementation would sort listenersToExecute by priority here.

            for (const listener of listenersToExecute) {
                try {
                    listener.handlerFunction.call(listener.context, data);
                } catch (error) {
                    console.error(`Error in event handler for '${name}':`, error);
                    // Optionally, emit an 'error' event through this system itself
                    // this.emit('event_handler_error', { originalEvent: name, error: error }, true);
                }

                if (listener.once) {
                    this.off(name, listener.id);
                }
            }
        }
    }

    /**
     * Processes all events currently in the queue.
     * Spec mentions maxProcessingTime, but this stub will process all.
     */
    processEventQueue() {
        if (this.processing) {
            // console.log("Event queue processing already in progress.");
            return;
        }

        this.processing = true;
        // console.log(`Processing event queue. ${this.eventQueue.length} events.`);

        // Process a copy of the queue and clear the original,
        // in case events emitted during processing add to the queue.
        const queueToProcess = [...this.eventQueue];
        this.eventQueue = [];

        for (const eventData of queueToProcess) {
            this.processEvent(eventData);
        }

        this.processing = false;
        // console.log("Event queue processing finished.");

        // If new events were added during processing, and we want continuous processing:
        // if (this.eventQueue.length > 0) {
        //     this.processEventQueue(); // Could lead to deep recursion if not careful
        // }
    }

    /**
     * Generates a unique ID for a handler (as shown in spec).
     * Not strictly needed if using the simplified ID in 'on', but good to have.
     */
    generateHandlerId() {
        return `h_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }

    /**
     * Placeholder for cleanup tasks (as mentioned in spec).
     * For a stub, this might not do much.
     */
    cleanup() {
        // Example: Remove listeners that were marked 'once' but somehow didn't get cleaned.
        // Or clear the event queue if shutting down.
        // console.log("EventSystem cleanup called.");
        // this.eventQueue = []; // Example cleanup action
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventSystem;
}
