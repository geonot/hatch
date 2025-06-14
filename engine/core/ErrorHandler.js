export class ErrorHandler {
    constructor(eventBus = null) {
        this.eventBus = eventBus;
        // A simple debug flag, could be controlled by config or environment variable later
        this.isDebugMode = false;
        // console.log('[ErrorHandler] Initialized'); // Optional
    }

    _getConsoleLevel(level) {
        switch (level) {
            case 'critical': // critical will use console.error
            case 'error':
                return 'error';
            case 'warn':
                return 'warn';
            case 'info':
                return 'info';
            case 'debug':
                // console.debug might not be available or visible in all browsers by default
                // using 'log' for debug ensures it's processed by default unless filtered by isDebugMode
                return typeof console.debug === 'function' ? 'debug' : 'log';
            default:
                return 'log';
        }
    }

    log(level, message, errorObject = null) {
        if (level === 'debug' && !this.isDebugMode) {
            return; // Don't log debug messages if not in debug mode
        }

        const consoleLevel = this._getConsoleLevel(level);
        const formattedMessage = `[HATCH|${level.toUpperCase()}] ${message}`;

        const logger = console[consoleLevel] || console.log; // Fallback to console.log

        if (errorObject) {
            logger(formattedMessage, errorObject);
        } else {
            logger(formattedMessage);
        }

        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            try {
                this.eventBus.emit('error:logged', { level, message, errorObject });
            } catch (e) {
                // Fallback console.error to avoid loop if eventBus itself has an issue.
                console.error('[ErrorHandler] Critical: Failed to emit error:logged event:', e);
            }
        }
    }

    critical(message, errorObject = null) {
        this.log('critical', message, errorObject);
        // Ensure the message in the thrown error is the original, not the formatted one.
        throw new Error(message);
    }

    error(message, errorObject = null) {
        this.log('error', message, errorObject);
    }

    warn(message, errorObject = null) {
        this.log('warn', message, errorObject);
    }

    info(message, errorObject = null) {
        this.log('info', message, errorObject);
    }

    debug(message, errorObject = null) {
        // Debug mode check is handled in the main log method
        this.log('debug', message, errorObject);
    }

    /**
     * Enables or disables debug mode.
     * @param {boolean} enable - True to enable debug mode, false to disable.
     */
    setDebugMode(enable) {
        this.isDebugMode = !!enable;
        // Use 'info' level for this message so it's usually visible.
        this.info(`Debug mode has been ${this.isDebugMode ? 'enabled' : 'disabled'}.`);
    }
}
