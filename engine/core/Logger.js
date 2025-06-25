/**
 * @file Logger.js
 * @description Centralized logging system for the Hatch engine with configurable log levels
 */

/**
 * Log levels enum
 */
export const LogLevel = {
    TRACE: 0,
    DEBUG: 1, 
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
    OFF: 6
};

/**
 * Logger class provides centralized logging with configurable levels and formatting
 */
export class Logger {
    constructor(name = 'Hatch', level = LogLevel.INFO) {
        this.name = name;
        this.level = level;
        this.prefix = `[${name}]`;
        
        // Color codes for different log levels (browser console)
        this.colors = {
            [LogLevel.TRACE]: '#6c757d',  // gray
            [LogLevel.DEBUG]: '#17a2b8',  // cyan
            [LogLevel.INFO]: '#28a745',   // green
            [LogLevel.WARN]: '#ffc107',   // yellow
            [LogLevel.ERROR]: '#dc3545',  // red
            [LogLevel.FATAL]: '#6f42c1'   // purple
        };
        
        this.levelNames = {
            [LogLevel.TRACE]: 'TRACE',
            [LogLevel.DEBUG]: 'DEBUG',
            [LogLevel.INFO]: 'INFO',
            [LogLevel.WARN]: 'WARN',
            [LogLevel.ERROR]: 'ERROR',
            [LogLevel.FATAL]: 'FATAL'
        };
    }

    /**
     * Set the current log level
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Get current log level
     */
    getLevel() {
        return this.level;
    }

    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        return level >= this.level;
    }

    /**
     * Format log message with timestamp and level
     */
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
        const levelName = this.levelNames[level];
        const prefix = `${timestamp} ${this.prefix} [${levelName}]`;
        
        if (args.length > 0) {
            return [prefix, message, ...args];
        }
        return [prefix, message];
    }

    /**
     * Output log message with appropriate console method and styling
     */
    output(level, message, ...args) {
        if (!this.shouldLog(level)) return;

        const formatted = this.formatMessage(level, message, ...args);
        const color = this.colors[level];

        // Use appropriate console method based on level
        switch (level) {
            case LogLevel.TRACE:
            case LogLevel.DEBUG:
                if (console.debug) {
                    console.debug(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
                } else {
                    console.log(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
                }
                break;
            case LogLevel.INFO:
                console.info(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
                break;
            case LogLevel.WARN:
                console.warn(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
                break;
            default:
                console.log(`%c${formatted[0]}`, `color: ${color}`, ...formatted.slice(1));
        }
    }

    /**
     * Log trace message (most verbose)
     */
    trace(message, ...args) {
        this.output(LogLevel.TRACE, message, ...args);
    }

    /**
     * Log debug message
     */
    debug(message, ...args) {
        this.output(LogLevel.DEBUG, message, ...args);
    }

    /**
     * Log info message
     */
    info(message, ...args) {
        this.output(LogLevel.INFO, message, ...args);
    }

    /**
     * Log warning message
     */
    warn(message, ...args) {
        this.output(LogLevel.WARN, message, ...args);
    }

    /**
     * Log error message
     */
    error(message, ...args) {
        this.output(LogLevel.ERROR, message, ...args);
    }

    /**
     * Log fatal error message
     */
    fatal(message, ...args) {
        this.output(LogLevel.FATAL, message, ...args);
    }

    /**
     * Create a child logger with the same configuration but different name
     */
    child(name) {
        return new Logger(`${this.name}:${name}`, this.level);
    }

    /**
     * Performance timing utility
     */
    time(label) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.time(`${this.prefix} ${label}`);
        }
    }

    /**
     * End performance timing
     */
    timeEnd(label) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.timeEnd(`${this.prefix} ${label}`);
        }
    }

    /**
     * Group console messages
     */
    group(label) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.group(`${this.prefix} ${label}`);
        }
    }

    /**
     * End console group
     */
    groupEnd() {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.groupEnd();
        }
    }
}

/**
 * Global logger instance for the engine
 */
let globalLogger = new Logger('Hatch', LogLevel.INFO);

/**
 * Configure the global logger
 */
export function configureLogger(config = {}) {
    const level = config.level || LogLevel.INFO;
    const name = config.name || 'Hatch';
    
    // Convert string level to numeric if needed
    let numericLevel = level;
    if (typeof level === 'string') {
        const upperLevel = level.toUpperCase();
        numericLevel = LogLevel[upperLevel] !== undefined ? LogLevel[upperLevel] : LogLevel.INFO;
    }
    
    globalLogger = new Logger(name, numericLevel);
    globalLogger.info('Logger configured', { level: globalLogger.levelNames[numericLevel] });
}

/**
 * Get the global logger instance
 */
export function getLogger(name) {
    if (name) {
        return globalLogger.child(name);
    }
    return globalLogger;
}

/**
 * Convenience functions using global logger
 */
export const log = {
    trace: (message, ...args) => globalLogger.trace(message, ...args),
    debug: (message, ...args) => globalLogger.debug(message, ...args),
    info: (message, ...args) => globalLogger.info(message, ...args),
    warn: (message, ...args) => globalLogger.warn(message, ...args),
    error: (message, ...args) => globalLogger.error(message, ...args),
    fatal: (message, ...args) => globalLogger.fatal(message, ...args),
    time: (label) => globalLogger.time(label),
    timeEnd: (label) => globalLogger.timeEnd(label),
    group: (label) => globalLogger.group(label),
    groupEnd: () => globalLogger.groupEnd()
};

export default Logger;
