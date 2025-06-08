/**
 * @file ErrorHandler.js
 * @description Centralized error handling module for the HatchEngine.
 * This class provides a consistent way to report, log, and manage errors
 * that occur within the engine or game.
 */

/**
 * @class ErrorHandler
 * @classdesc Manages error logging and reporting for the engine.
 * It can store a log of errors and emit error events via the engine's EventBus.
 */
class ErrorHandler {
    /**
     * Creates an instance of ErrorHandler.
     * @param {import('./HatchEngine.js').default} engine - A reference to the HatchEngine instance.
     *        Used to access other engine systems like the EventBus if available.
     */
    constructor(engine) {
        /**
         * A reference to the HatchEngine instance.
         * @type {import('./HatchEngine.js').default}
         * @public
         */
        this.engine = engine;
        /**
         * Stores a log of all errors handled.
         * @type {Array<Object>}
         * @private
         */
        this.errorLog = [];
    }

    /**
     * Handles an error by logging it to the console, storing it in an internal log,
     * and optionally emitting an 'engine:error' event through the engine's EventBus.
     * If the error is marked as critical, it may suggest further action like stopping the engine.
     *
     * @param {Error} error - The JavaScript Error object that was caught.
     * @param {Object} [context={}] - An optional object providing additional context about the error's circumstances.
     *                                This can include information like the system where the error occurred, relevant data, etc.
     * @param {boolean} [critical=false] - A flag indicating if the error is considered critical.
     *                                     Critical errors might warrant stopping the engine or other drastic measures.
     */
    handle(error, context = {}, critical = false) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            message: error.message,
            name: error.name, // Include error name (e.g., TypeError, RangeError)
            stack: error.stack,
            context,
            critical,
        };

        this.errorLog.push(errorEntry);

        // Construct a more detailed error message for the console
        let consoleErrorMessage = `[${timestamp}] ${critical ? 'CRITICAL ' : ''}Error: ${error.name}: ${error.message}`;
        if (context && Object.keys(context).length > 0) {
            consoleErrorMessage += ` | Context: ${JSON.stringify(context)}`;
        }

        console.error(consoleErrorMessage);
        if (error.stack) {
            console.error("Stack Trace:", error.stack);
        }


        if (this.engine && this.engine.eventBus && typeof this.engine.eventBus.emit === 'function') {
            try {
                this.engine.eventBus.emit('engine:error', { error: errorEntry });
            } catch (eventBusError) {
                console.error("ErrorHandler: Failed to emit 'engine:error' event via EventBus.", eventBusError);
            }
        }

        if (critical) {
            // For critical errors, the primary responsibility here is to report.
            // The decision to stop the engine should ideally be handled by the code that catches the critical error,
            // or by a global error handler that listens to 'engine:error' events.
            console.warn(`ErrorHandler: A critical error was encountered (see above). Depending on the engine's design, this might require stopping or resetting the application.`);
            // Example: if (this.engine && typeof this.engine.stop === 'function') { this.engine.stop(); }
        }
    }

    /**
     * Retrieves the log of all errors handled by this ErrorHandler instance.
     * Each entry in the log contains details about the error, its context, and timestamp.
     *
     * @returns {Array<Object>} An array of error entry objects.
     *                            Each object typically includes `timestamp`, `message`, `name`, `stack`, `context`, and `critical` properties.
     */
    getLog() {
        return [...this.errorLog]; // Return a copy to prevent external modification
    }
}

export default ErrorHandler;
