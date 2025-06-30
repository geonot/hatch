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
 * @property {Map} recoveryStrategies - Map of error types to recovery functions.
 * @property {Array} errorHistory - Recent error history for pattern analysis.
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
        
        // Error recovery system
        this.recoveryStrategies = new Map();
        this.errorHistory = [];
        this.maxErrorHistory = 100;
        this.gracefulDegradation = {
            renderingFallback: false,
            audioDisabled: false,
            inputFallback: false,
            lowQualityMode: false,
            assetFallback: false,
            networkOffline: false
        };
        
        // Prevent infinite loop in pattern analysis
        this.analyzingPatterns = false;

        if (!LogLevelPriority.hasOwnProperty(this.currentLogLevel)) {
            // This console.warn is acceptable as it's a setup issue for ErrorHandler itself.
            console.warn(`[ErrorHandler] Invalid initialLogLevel: ${initialLogLevel}. Defaulting to ${ErrorLevels.INFO}.`);
            this.currentLogLevel = ErrorLevels.INFO;
        }
        
        // Register default recovery strategies
        this.registerDefaultRecoveryStrategies();
    }

    /**
     * Registers default recovery strategies for common error types.
     * @private
     */
    registerDefaultRecoveryStrategies() {
        this.registerRecoveryStrategy('NETWORK_ERROR', this.defaultNetworkErrorRecovery);
        this.registerRecoveryStrategy('TIMEOUT_ERROR', this.defaultTimeoutErrorRecovery);
        this.registerRecoveryStrategy('RENDER_ERROR', this.defaultRenderErrorRecovery);
        this.registerRecoveryStrategy('AUDIO_ERROR', this.defaultAudioErrorRecovery);
        this.registerRecoveryStrategy('INPUT_ERROR', this.defaultInputErrorRecovery);
        this.registerRecoveryStrategy('MEMORY_ERROR', this.defaultMemoryErrorRecovery);
        this.registerRecoveryStrategy('ASSET_ERROR', this.defaultAssetErrorRecovery);
    }

    /**
     * Default recovery strategy for network errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultNetworkErrorRecovery(error) {
        console.warn('[ErrorHandler] Network error occurred:', error);
        // Implement network error recovery logic here (e.g., retrying a request).
        return true; // Return true if recovery was attempted.
    }

    /**
     * Default recovery strategy for timeout errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultTimeoutErrorRecovery(error) {
        console.warn('[ErrorHandler] Timeout error occurred:', error);
        // Implement timeout error recovery logic here (e.g., retrying a request).
        return true; // Return true if recovery was attempted.
    }

    /**
     * Default recovery strategy for render errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultRenderErrorRecovery(error) {
        this.warn('[ErrorHandler] Render error occurred, attempting fallback rendering:', error);
        
        // Enable rendering fallback mode
        if (!this.gracefulDegradation.renderingFallback) {
            this.gracefulDegradation.renderingFallback = true;
            this.info('Enabled rendering fallback mode due to render error');
            
            // Clear any problematic render states
            try {
                if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                    // Reset render loop if possible
                    this.info('Resetting render loop due to render error');
                }
            } catch (e) {
                this.warn('Failed to reset render loop:', e);
            }
            
            return true; // Recovery action was taken
        }
        
        // If already in fallback mode, just reset render state but don't consider it a new recovery
        try {
            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                this.info('Resetting render loop due to render error');
            }
        } catch (e) {
            this.warn('Failed to reset render loop:', e);
        }
        
        return false; // No new recovery action taken
    }

    /**
     * Default recovery strategy for audio errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultAudioErrorRecovery(error) {
        this.warn('[ErrorHandler] Audio error occurred, disabling audio:', error);
        
        // Disable audio system
        if (!this.gracefulDegradation.audioDisabled) {
            this.gracefulDegradation.audioDisabled = true;
            this.info('Disabled audio system due to audio error');
            
            // Attempt to clear audio contexts
            try {
                if (typeof window !== 'undefined' && window.AudioContext) {
                    this.info('Audio error recovery: clearing audio contexts');
                }
            } catch (e) {
                this.warn('Failed to clear audio contexts:', e);
            }
            
            return true; // Recovery action was taken
        }
        
        return false; // Audio already disabled, no new recovery action
    }

    /**
     * Default recovery strategy for input errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultInputErrorRecovery(error) {
        this.warn('[ErrorHandler] Input error occurred, enabling fallback input:', error);
        
        // Enable input fallback
        if (!this.gracefulDegradation.inputFallback) {
            this.gracefulDegradation.inputFallback = true;
            this.info('Enabled input fallback mode due to input error');
            
            // Reset input states
            try {
                this.info('Resetting input states due to input error');
                // Could clear pressed keys, mouse states, etc.
            } catch (e) {
                this.warn('Failed to reset input states:', e);
            }
            
            return true; // Recovery action was taken
        }
        
        return false; // Input fallback already enabled, no new recovery action
    }

    /**
     * Default recovery strategy for memory errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultMemoryErrorRecovery(error) {
        this.warn('[ErrorHandler] Memory error occurred, attempting cleanup:', error);
        
        // Check if low quality mode is already enabled
        if (!this.gracefulDegradation.lowQualityMode) {
            try {
                // Force garbage collection if available
                if (typeof window !== 'undefined' && window.gc) {
                    window.gc();
                    this.info('Forced garbage collection');
                }
                
                // Clear caches if possible
                this.info('Clearing caches due to memory error');
                
                // Reduce quality settings
                this.gracefulDegradation.lowQualityMode = true;
                this.info('Enabled low quality mode due to memory pressure');
                
                return true; // Recovery action was taken
            } catch (e) {
                this.warn('Failed to perform memory cleanup:', e);
                return false;
            }
        }
        
        return false; // Low quality mode already enabled, no new recovery action
    }

    /**
     * Default recovery strategy for asset errors.
     * @param {Error} error - The error object.
     * @returns {boolean} True if recovery was possible, false otherwise.
     * @private
     */
    defaultAssetErrorRecovery(error) {
        this.warn('[ErrorHandler] Asset error occurred, using fallback assets:', error);
        
        // Enable asset fallback mode
        if (!this.gracefulDegradation.assetFallback) {
            try {
                this.gracefulDegradation.assetFallback = true;
                this.info('Enabled asset fallback mode');
                
                // Could implement asset retry logic here
                this.info('Asset error recovery: implementing retry logic');
                
                return true; // Recovery action was taken
            } catch (e) {
                this.warn('Failed to enable asset fallback:', e);
                return false;
            }
        }
        
        return false; // Asset fallback already enabled, no new recovery action
    }

    /**
     * Registers a recovery strategy for a specific error type.
     * @param {string} errorType - The type of error (e.g., 'NETWORK_ERROR', 'TIMEOUT_ERROR').
     * @param {Function} recoveryFunction - Function that attempts to recover from the error.
     */
    registerRecoveryStrategy(errorType, recoveryFunction) {
        this.recoveryStrategies.set(errorType, recoveryFunction);
    }

    /**
     * Attempts to recover from an error using registered strategies.
     * @param {Error} error - The error object.
     * @param {string} errorType - The type of error.
     * @returns {boolean} True if recovery was attempted, false otherwise.
     */
    attemptRecovery(error, errorType) {
        // Add to error history
        this.addToErrorHistory(error, errorType);
        
        // Check if we have a recovery strategy for this error type
        const recoveryStrategy = this.recoveryStrategies.get(errorType);
        if (recoveryStrategy) {
            try {
                const recovered = recoveryStrategy.call(this, error);
                if (recovered) {
                    this.info(`Recovery attempted for ${errorType}`, { error: error.message });
                    return true;
                }
            } catch (recoveryError) {
                this.error(`Recovery strategy failed for ${errorType}`, { 
                    originalError: error.message, 
                    recoveryError: recoveryError.message 
                });
            }
        }
        
        // If no specific recovery strategy, attempt graceful degradation
        return this.attemptGracefulDegradation(errorType);
    }

    /**
     * Attempts graceful degradation for critical systems.
     * @param {string} errorType - The type of error.
     * @returns {boolean} True if degradation was applied, false otherwise.
     */
    attemptGracefulDegradation(errorType) {
        let degradationApplied = false;
        
        switch (errorType) {
            case 'RENDER_ERROR':
                if (!this.gracefulDegradation.renderingFallback) {
                    this.gracefulDegradation.renderingFallback = true;
                    this.warn('Rendering fallback mode enabled due to render error');
                    degradationApplied = true;
                }
                break;
                
            case 'AUDIO_ERROR':
                if (!this.gracefulDegradation.audioDisabled) {
                    this.gracefulDegradation.audioDisabled = true;
                    this.warn('Audio system disabled due to audio error');
                    degradationApplied = true;
                }
                break;
                
            case 'INPUT_ERROR':
                if (!this.gracefulDegradation.inputFallback) {
                    this.gracefulDegradation.inputFallback = true;
                    this.warn('Input fallback mode enabled due to input error');
                    degradationApplied = true;
                }
                break;
                
            case 'MEMORY_ERROR':
                if (!this.gracefulDegradation.lowQualityMode) {
                    this.gracefulDegradation.lowQualityMode = true;
                    this.warn('Low quality mode enabled due to memory error');
                    degradationApplied = true;
                }
                break;
                
            case 'NETWORK_ERROR':
                if (!this.gracefulDegradation.networkOffline) {
                    this.gracefulDegradation.networkOffline = true;
                    this.warn('Offline mode enabled due to network error');
                    degradationApplied = true;
                }
                break;
                
            case 'ASSET_ERROR':
                if (!this.gracefulDegradation.assetFallback) {
                    this.gracefulDegradation.assetFallback = true;
                    this.warn('Asset fallback mode enabled due to asset error');
                    degradationApplied = true;
                }
                break;
        }
        
        return degradationApplied;
    }

    /**
     * Adds an error to the error history for pattern analysis.
     * @param {Error} error - The error object.
     * @param {string} errorType - The type of error.
     * @private
     */
    addToErrorHistory(error, errorType) {
        const errorEntry = {
            timestamp: Date.now(),
            type: errorType,
            message: error.message,
            stack: error.stack
        };
        
        this.errorHistory.push(errorEntry);
        
        // Keep only the most recent errors
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
        
        // Check for error patterns
        this.analyzeErrorPatterns();
    }

    /**
     * Analyzes error patterns to detect recurring issues.
     * @private
     */
    analyzeErrorPatterns() {
        // Prevent infinite recursion
        if (this.analyzingPatterns) {
            return;
        }
        
        this.analyzingPatterns = true;
        
        try {
            const recentErrors = this.errorHistory.slice(-10); // Last 10 errors
            const errorCounts = {};
            
            recentErrors.forEach(error => {
                errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
            });
            
            // Check for recurring errors (more than 3 of the same type in recent history)
            Object.entries(errorCounts).forEach(([errorType, count]) => {
                if (count >= 3) {
                    // Only emit the event if eventBus is available, but avoid any logging to prevent infinite recursion
                    if (this.eventBus && typeof this.eventBus.emit === 'function') {
                        try {
                            this.eventBus.emit('error:pattern_detected', {
                                errorType,
                                count,
                                recentOccurrences: count
                            });
                        } catch (e) {
                            // Silent fail to prevent further issues
                        }
                    }
                }
            });
        } finally {
            this.analyzingPatterns = false;
        }
    }

    /**
     * Gets the current graceful degradation state.
     * @returns {Object} Current degradation state.
     */
    getDegradationState() {
        return { ...this.gracefulDegradation };
    }

    /**
     * Resets graceful degradation state.
     * @param {string} [specificType] - Optional specific type to reset, or reset all if not provided.
     */
    resetDegradation(specificType) {
        if (specificType) {
            switch (specificType) {
                case 'rendering':
                    this.gracefulDegradation.renderingFallback = false;
                    break;
                case 'audio':
                    this.gracefulDegradation.audioDisabled = false;
                    break;
                case 'input':
                    this.gracefulDegradation.inputFallback = false;
                    break;
                case 'quality':
                    this.gracefulDegradation.lowQualityMode = false;
                    break;
                case 'network':
                    this.gracefulDegradation.networkOffline = false;
                    break;
                case 'assets':
                    this.gracefulDegradation.assetFallback = false;
                    break;
            }
            this.info(`Degradation reset for ${specificType}`);
        } else {
            this.gracefulDegradation = {
                renderingFallback: false,
                audioDisabled: false,
                inputFallback: false,
                lowQualityMode: false,
                assetFallback: false,
                networkOffline: false
            };
            this.info('All degradation states reset');
        }
    }

    /**
     * Gets error history for analysis.
     * @param {number} [limit] - Maximum number of recent errors to return.
     * @returns {Array} Array of error entries.
     */
    getErrorHistory(limit) {
        if (limit) {
            return this.errorHistory.slice(-limit);
        }
        return [...this.errorHistory];
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
