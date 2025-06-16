/**
 * @file Constants.js
 * @description Defines globally used constants for the HatchEngine,
 * including event names, error levels, asset types, and log level priorities.
 * This helps in maintaining consistency and avoiding magic strings/numbers across the engine.
 */

// engine/core/Constants.js

/**
 * @description Defines event names emitted by the HatchEngine itself.
 * @property {string} CONSTRUCTED - Emitted when the engine instance is constructed.
 * @property {string} PRE_INIT - Emitted just before engine initialization begins.
 * @property {string} INIT - Emitted after engine initialization is complete.
 * @property {string} START - Emitted when the game loop starts.
 * @property {string} STOP - Emitted when the game loop stops.
 * @property {string} UPDATE - Emitted each frame, carrying delta time, for game logic updates.
 * @property {string} RENDER - Emitted each frame, signifying the render phase.
 */
export const EngineEvents = {
    CONSTRUCTED: 'engine:constructed',
    PRE_INIT: 'engine:pre-init',
    INIT: 'engine:init',
    START: 'engine:start',
    STOP: 'engine:stop',
    UPDATE: 'engine:update',
    RENDER: 'engine:render',
};

/**
 * @description Defines event names related to error handling.
 * @property {string} LOGGED - Emitted by ErrorHandler when an error/message is logged.
 */
export const ErrorEvents = {
    LOGGED: 'error:logged',
};

/**
 * @description Defines the standard logging levels used by ErrorHandler.
 * These are used to categorize the severity of messages.
 * @property {string} CRITICAL - For critical errors that usually halt execution.
 * @property {string} ERROR - For general errors that might not halt execution but indicate a problem.
 * @property {string} WARN - For warnings about potential issues or non-critical problems.
 * @property {string} INFO - For general informational messages.
 * @property {string} DEBUG - For detailed debug messages, typically only shown during development.
 */
export const ErrorLevels = {
    CRITICAL: 'critical',
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
};

/**
 * @description Defines event names related to scene management.
 * @property {string} SCENE_SWITCHED - Emitted by SceneManager after a scene has successfully switched.
 */
export const SceneEvents = {
    SCENE_SWITCHED: 'scene:switched',
    // Potentially others like SCENE_LOADED, SCENE_UNLOADED if the architecture grows
};

/**
 * @description Defines the types of assets that can be managed by the AssetManager.
 * @property {string} IMAGE - Represents an image asset (e.g., .png, .jpg).
 * @property {string} AUDIO - Represents an audio asset (e.g., .mp3, .wav).
 * @property {string} JSON - Represents a JSON data file.
 */
export const AssetTypes = {
    IMAGE: 'image',
    AUDIO: 'audio',
    JSON: 'json',
};

/**
 * @description Defines the numerical priority for each log level.
 * Higher numbers indicate higher severity/priority. Used by ErrorHandler to filter messages.
 * @property {number} DEBUG - Priority for debug messages.
 * @property {number} INFO - Priority for informational messages.
 * @property {number} WARN - Priority for warning messages.
 * @property {number} ERROR - Priority for error messages.
 * @property {number} CRITICAL - Priority for critical error messages.
 */
export const LogLevelPriority = {
    [ErrorLevels.DEBUG]: 1,
    [ErrorLevels.INFO]: 2,
    [ErrorLevels.WARN]: 3,
    [ErrorLevels.ERROR]: 4,
    [ErrorLevels.CRITICAL]: 5,
};
