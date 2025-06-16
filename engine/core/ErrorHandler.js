/**
 * @file ErrorHandler.js
 * @description Centralized error handling and logging for the HatchEngine.
 * It supports different log levels, emits error events, and can throw critical errors.
 */

import { ErrorEvents, ErrorLevels, LogLevelPriority } from './Constants.js';

/**
 * @class ErrorHandler
 * @classdesc Manages error logging, reporting, and handling within the engine.
 * It allows setting a log level to filter messages and can emit events when errors are logged.
 * Critical errors will be thrown to halt execution if necessary.
 *
 * @property {EventBus | null} eventBus - An optional EventBus instance to emit error events.
 * @property {string} currentLogLevel - The current minimum log level for messages to be processed.
 *                                      Must be one of `ErrorLevels`.
 */
export class ErrorHandler {
    /**
     * Creates an instance of ErrorHandler.
     * @param {EventBus | null} [eventBus=null] - An optional EventBus instance to emit `ErrorEvents.LOGGED` events.
     * @param {string} [initialLogLevel=ErrorLevels.INFO] - The initial log level for the handler.
     *                                                    Must be one of the keys in `ErrorLevels`.
     */
    constructor(eventBus = null, initialLogLevel = ErrorLevels.INFO) {
        /** @type {EventBus | null} */
        this.eventBus = eventBus;
        /** @type {string} */
        this.currentLogLevel = initialLogLevel;

        if (!LogLevelPriority.hasOwnProperty(this.currentLogLevel)) {
            // This console.warn is acceptable as it's a setup issue for ErrorHandler itself.
            console.warn(`[ErrorHandler] Invalid initialLogLevel: ${this.currentLogLevel}. Defaulting to ${ErrorLevels.INFO}.`);
            this.currentLogLevel = ErrorLevels.INFO;
        }
        // console.log(`[ErrorHandler] Initialized with log level: ${this.currentLogLevel}`);
    }

    /**
     * Determines the appropriate console method (e.g., `console.error`, `console.warn`) for a given log level.
     * @param {string} level - The log level (e.g., `ErrorLevels.ERROR`, `ErrorLevels.WARN`).
     * @returns {string} The name of the console method to use (e.g., 'error', 'warn', 'log').
     * @private
     */
    _getConsoleLevel(level) {
        switch (level) {
            case ErrorLevels.CRITICAL:
            case ErrorLevels.ERROR:
                return 'error';
            case ErrorLevels.WARN:
                return 'warn';
            case ErrorLevels.INFO:
                return 'info';
            case ErrorLevels.DEBUG:
                return typeof console.debug === 'function' ? 'debug' : 'log';
            default:
                return 'log';
        }
    }

    /**
     * Logs a message if its level is at or above the current log level.
     * Emits an `ErrorEvents.LOGGED` event via the EventBus if provided.
     * @param {string} level - The severity level of the message (must be one of `ErrorLevels`).
     * @param {string} message - The message to log.
     * @param {object | null} [errorObject=null] - An optional object containing additional context
     *                                             (e.g., `component`, `method`, `params`, `originalError`).
     */
    log(level, message, errorObject = null) {
        if (!LogLevelPriority.hasOwnProperty(level)) {
            // Fallback for unknown levels - log as an error itself.
            const unknownLevelMsg = `[HATCH|ERROR] Unknown log level '${level}' used for message: ${message}`;
            if (this.eventBus) this.eventBus.emit(ErrorEvents.LOGGED, { level: ErrorLevels.ERROR, message: unknownLevelMsg, errorObject: { originalMessage: message, originalLevel: level } });
            console.error(unknownLevelMsg, errorObject);
            return;
        }

        if (LogLevelPriority[level] < LogLevelPriority[this.currentLogLevel]) {
            return;
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
                this.eventBus.emit(ErrorEvents.LOGGED, { level, message, errorObject });
            } catch (e) {
                // Fallback console.error to avoid loop if eventBus itself has an issue.
                console.error('[ErrorHandler] Critical: Failed to emit error:logged event:', e);
            }
        }
    }

    /**
     * Logs a critical message and then throws an Error to halt execution.
     * @param {string} message - The critical message.
     * @param {object | null} [errorObject=null] - Contextual information about the error.
     * @throws {Error} Throws an error with the provided message.
     */
    critical(message, errorObject = null) {
        this.log(ErrorLevels.CRITICAL, message, errorObject);
        throw new Error(message); // Ensure the message in the thrown error is the original, not the formatted one.
    }

    /**
     * Logs an error message.
     * @param {string} message - The error message.
     * @param {object | null} [errorObject=null] - Contextual information about the error.
     */
    error(message, errorObject = null) {
        this.log(ErrorLevels.ERROR, message, errorObject);
    }

    /**
     * Logs a warning message.
     * @param {string} message - The warning message.
     * @param {object | null} [errorObject=null] - Contextual information about the warning.
     */
    warn(message, errorObject = null) {
        this.log(ErrorLevels.WARN, message, errorObject);
    }

    /**
     * Logs an informational message.
     * @param {string} message - The informational message.
     * @param {object | null} [errorObject=null] - Additional context.
     */
    info(message, errorObject = null) {
        this.log(ErrorLevels.INFO, message, errorObject);
    }

    /**
     * Logs a debug message. Only processed if `currentLogLevel` is `ErrorLevels.DEBUG`.
     * @param {string} message - The debug message.
     * @param {object | null} [errorObject=null] - Additional context.
     */
    debug(message, errorObject = null) {
        this.log(ErrorLevels.DEBUG, message, errorObject);
    }

    /**
     * Sets the current logging level for the error handler.
     * Only messages with a level of this severity or higher will be logged.
     * @param {string} newLevel - The new log level to set. Must be one of ErrorLevels.
     */
    setLogLevel(newLevel) {
        if (LogLevelPriority.hasOwnProperty(newLevel)) {
            this.currentLogLevel = newLevel;
            // Directly use console.log for this message to ensure it's always displayed,
            // regardless of the new log level, as it's a direct feedback to a user action.
            console.log(`[ErrorHandler] Log level set to: ${this.currentLogLevel.toUpperCase()}`);
        } else {
            const validLevels = Object.keys(LogLevelPriority).join(', ');
            this.warn(`Invalid log level '${newLevel}'. Valid levels are: ${validLevels}. Log level remains ${this.currentLogLevel}.`, {
                component: 'ErrorHandler',
                method: 'setLogLevel',
                params: { attemptedLevel: newLevel }
            });
        }
    }
}
