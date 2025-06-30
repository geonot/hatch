/**
 * @file StateConfiguration.js
 * @description Configuration system for cell states and their visual representations.
 * Provides declarative definitions that can be loaded from config files or defined programmatically.
 */

import { getLogger } from '../core/Logger.js';
import { CellRenderer } from '../rendering/CellRenderer.js';

/**
 * @class StateConfiguration
 * @classdesc Manages configuration for cell states, their visuals, and transition rules.
 * Supports loading from configuration objects and provides helpers for common game patterns.
 */
export class StateConfiguration {
    /**
     * Create a StateConfiguration instance
     * @param {Object} config - Configuration object
     * @param {Object} [config.states={}] - State definitions
     * @param {Object} [config.visuals={}] - Visual definitions for states
     * @param {Object} [config.transitions={}] - Transition rules
     * @param {Object} [config.themes={}] - Visual themes
     */
    constructor(config = {}) {
        this.logger = getLogger('StateConfiguration');
        
        // Initialize state collections
        this.states = new Map();
        this.visuals = new Map();
        this.transitions = new Map();
        this.themes = new Map();
        this.defaultState = null;
        
        // Load configuration
        this.loadConfiguration(config);
        
        this.logger.info('StateConfiguration initialized');
    }

    /**
     * Load configuration from an object
     * @param {Object} config - Configuration object
     */
    loadConfiguration(config) {
        // Load default state
        if (config.defaultState) {
            this.defaultState = config.defaultState;
        }
        
        // Load state definitions
        if (config.states) {
            for (const [stateName, stateConfig] of Object.entries(config.states)) {
                this.defineState(stateName, stateConfig);
            }
        }

        // Load visual definitions
        if (config.visuals) {
            for (const [stateName, visualConfig] of Object.entries(config.visuals)) {
                this.defineVisual(stateName, visualConfig);
            }
        }

        // Load transition rules
        if (config.transitions) {
            for (const [fromState, toStates] of Object.entries(config.transitions)) {
                this.defineTransitions(fromState, toStates);
            }
        }

        // Load themes
        if (config.themes) {
            for (const [themeName, themeConfig] of Object.entries(config.themes)) {
                this.defineTheme(themeName, themeConfig);
            }
        }
    }

    /**
     * Define a state with its properties
     * @param {string} stateName - Name of the state
     * @param {Object} stateConfig - State configuration
     * @param {Array<string>} [stateConfig.transitions] - Allowed transitions
     * @param {Function} [stateConfig.validator] - Validation function
     * @param {Object} [stateConfig.metadata] - Additional metadata
     */
    defineState(stateName, stateConfig) {
        this.states.set(stateName, {
            transitions: [],
            validator: null,
            metadata: {},
            ...stateConfig
        });
        this.logger.debug(`State defined: ${stateName}`);
    }

    /**
     * Define visual representation for a state
     * @param {string} stateName - Name of the state
     * @param {Object} visualConfig - Visual configuration
     */
    defineVisual(stateName, visualConfig) {
        this.visuals.set(stateName, visualConfig);
        this.logger.debug(`Visual defined for state: ${stateName}`);
    }

    /**
     * Define allowed transitions from a state
     * @param {string} fromState - Source state
     * @param {Array<string>} toStates - Allowed target states
     */
    defineTransitions(fromState, toStates) {
        this.transitions.set(fromState, Array.isArray(toStates) ? toStates : [toStates]);
        this.logger.debug(`Transitions defined for ${fromState}: ${toStates}`);
    }

    /**
     * Define a visual theme (collection of visual styles)
     * @param {string} themeName - Name of the theme
     * @param {Object} themeConfig - Theme configuration mapping states to visuals
     */
    defineTheme(themeName, themeConfig) {
        this.themes.set(themeName, themeConfig);
        this.logger.debug(`Theme defined: ${themeName}`);
    }

    /**
     * Apply a theme to the configuration
     * @param {string} themeName - Name of the theme to apply
     */
    applyTheme(themeName) {
        const theme = this.themes.get(themeName);
        if (!theme) {
            this.logger.warn(`Theme not found: ${themeName}`);
            return;
        }

        for (const [stateName, visualConfig] of Object.entries(theme)) {
            this.defineVisual(stateName, visualConfig);
        }
        
        this.logger.info(`Applied theme: ${themeName}`);
    }

    /**
     * Configure a CellStateManager with this configuration
     * @param {import('../grid/CellStateManager.js').CellStateManager} stateManager - State manager to configure
     */
    configureStateManager(stateManager) {
        for (const [stateName, stateConfig] of this.states) {
            stateManager.defineState(stateName, {
                allowedTransitions: this.transitions.get(stateName) || stateConfig.transitions || [],
                validator: stateConfig.validator,
                metadata: stateConfig.metadata
            });
        }
        this.logger.info('StateManager configured');
    }

    /**
     * Configure a CellRenderer with this configuration
     * @param {import('../rendering/CellRenderer.js').CellRenderer} renderer - Renderer to configure
     */
    configureRenderer(renderer) {
        this.logger.info(`Configuring renderer with ${this.visuals.size} visual definitions`);
        for (const [stateName, visualConfig] of this.visuals) {
            this.logger.info(`Configuring visual for state: ${stateName}`, { 
                type: visualConfig.type,
                hasRenderFn: !!visualConfig.renderFn 
            });
            renderer.defineStateVisual(stateName, visualConfig);
        }
        this.logger.info('CellRenderer configured');
    }

    /**
     * Get state configuration
     * @param {string} stateName - Name of the state
     * @returns {Object|null} State configuration or null if not found
     */
    getState(stateName) {
        return this.states.get(stateName) || null;
    }

    /**
     * Get visual configuration
     * @param {string} stateName - Name of the state
     * @returns {Object|null} Visual configuration or null if not found
     */
    getVisual(stateName) {
        return this.visuals.get(stateName) || null;
    }

    /**
     * Get allowed transitions for a state
     * @param {string} stateName - Name of the state
     * @returns {Array<string>} Array of allowed transition states
     */
    getTransitions(stateName) {
        return this.transitions.get(stateName) || [];
    }

    /**
     * Create a professional Minesweeper configuration showcasing the state system
     * @static
     * @returns {StateConfiguration} Configured instance for Minesweeper
     * @example
     * // Create and use minesweeper configuration
     * const config = StateConfiguration.createMinesweeperConfig();
     * stateManager.configureWithStateConfiguration(config);
     */
    static createMinesweeperConfig() {
        // Constants for consistent visual styling
        const MINESWEEPER_CONSTANTS = {
            COLORS: {
                HIDDEN: '#c0c0c0',
                REVEALED: '#ffffff', 
                MINE_BG: '#ff4444',
                BORDER: '#808080',
                BORDER_DARK: '#404040',
                FLAG_RED: '#ff0000',
                FLAG_POLE: '#654321',
                MINE_BLACK: '#000000',
                NUMBERS: {
                    1: '#0000ff', 2: '#008000', 3: '#ff0000', 4: '#000080',
                    5: '#800000', 6: '#008080', 7: '#000000', 8: '#808080'
                }
            },
            SIZING: {
                MINE_RADIUS_RATIO: 0.25,
                SPIKE_LENGTH_RATIO: 0.6,
                NUMBER_FONT_RATIO: 0.6,
                FLAG_WIDTH_RATIO: 0.3,
                FLAG_HEIGHT_RATIO: 0.2,
                POLE_HEIGHT_RATIO: 0.6,
                MIN_LINE_WIDTH: 2
            }
        };

        const config = {
            defaultState: 'hidden',
            states: {
                hidden: {
                    transitions: ['revealed', 'flagged'],
                    metadata: { 
                        description: 'Cell is hidden from player',
                        category: 'interactive',
                        terminal: false
                    }
                },
                revealed: {
                    transitions: [], // Terminal state in normal gameplay
                    metadata: { 
                        description: 'Revealed cell showing content (empty, number, or mine)',
                        category: 'terminal',
                        terminal: true
                    }
                },
                flagged: {
                    transitions: ['hidden'],
                    metadata: { 
                        description: 'Cell marked by player as potential mine',
                        category: 'interactive',
                        terminal: false
                    }
                }
            },
            visuals: {
                hidden: CellRenderer.createColorStyle({
                    fill: MINESWEEPER_CONSTANTS.COLORS.HIDDEN,
                    stroke: MINESWEEPER_CONSTANTS.COLORS.BORDER,
                    strokeWidth: 1
                }),
                // Game-specific rendering functions will be provided by the MinesweeperScene
                // and registered with the CellRenderer instance.
                // StateConfiguration now defines the *intent* and data for visuals.
                revealed: {
                    type: 'custom', // Indicates that a custom render function should be used
                    renderKey: 'minesweeperRevealed', // Key to look up the function in CellRenderer
                    // Pass constants for the renderer to use, if needed by the custom function
                    // Alternatively, the custom function can have these constants internally.
                    baseStyle: { // Fallback or base appearance if custom render fails or for animations
                        fill: MINESWEEPER_CONSTANTS.COLORS.REVEALED,
                        stroke: MINESWEEPER_CONSTANTS.COLORS.BORDER,
                        strokeWidth: 1
                    },
                    // Data relevant to this state's visual appearance, can be used by the custom renderer
                    // For example, colors for numbers, mine appearance details etc.
                    // This is illustrative; the actual data structure can be adapted.
                    numberColors: MINESWEEPER_CONSTANTS.COLORS.NUMBERS,
                    mineColor: MINESWEEPER_CONSTANTS.COLORS.MINE_BLACK,
                    mineBackgroundColor: MINESWEEPER_CONSTANTS.COLORS.MINE_BG,
                    mineRadiusRatio: MINESWEEPER_CONSTANTS.SIZING.MINE_RADIUS_RATIO,
                    spikeLengthRatio: MINESWEEPER_CONSTANTS.SIZING.SPIKE_LENGTH_RATIO,
                    numberFontRatio: MINESWEEPER_CONSTANTS.SIZING.NUMBER_FONT_RATIO,
                },
                flagged: {
                    type: 'custom',
                    renderKey: 'minesweeperFlagged',
                    baseStyle: {
                        fill: MINESWEEPER_CONSTANTS.COLORS.HIDDEN, // Flag is drawn on hidden bg
                        stroke: MINESWEEPER_CONSTANTS.COLORS.BORDER,
                        strokeWidth: 1
                    },
                    flagColor: MINESWEEPER_CONSTANTS.COLORS.FLAG_RED,
                    poleColor: MINESWEEPER_CONSTANTS.COLORS.FLAG_POLE,
                    flagWidthRatio: MINESWEEPER_CONSTANTS.SIZING.FLAG_WIDTH_RATIO,
                    flagHeightRatio: MINESWEEPER_CONSTANTS.SIZING.FLAG_HEIGHT_RATIO,
                    poleHeightRatio: MINESWEEPER_CONSTANTS.SIZING.POLE_HEIGHT_RATIO,
                }
            },
            transitions: {
                hidden: ['revealed', 'flagged'],
                flagged: ['hidden'],
                revealed: [] // Terminal state - can only transition during forced operations (e.g., restart)
            },
            themes: {
                classic: {
                    hidden: { fill: '#c0c0c0', stroke: '#808080' },
                    revealed: { fill: '#ffffff', stroke: '#808080' },
                    flagged: { fill: '#c0c0c0', stroke: '#808080' }
                },
                modern: {
                    hidden: { fill: '#e0e0e0', stroke: '#bdbdbd' },
                    revealed: { fill: '#f5f5f5', stroke: '#bdbdbd' },
                    flagged: { fill: '#e0e0e0', stroke: '#bdbdbd' }
                },
                dark: {
                    hidden: { fill: '#424242', stroke: '#616161' },
                    revealed: { fill: '#757575', stroke: '#616161' },
                    flagged: { fill: '#424242', stroke: '#616161' }
                }
            }
        };

        return new StateConfiguration(config);
    }

    /**
     * Create a configuration for match-3 games
     * @static
     * @returns {StateConfiguration} Configured instance for match-3 games
     */
    static createMatch3Config() {
        const config = {
            states: {
                empty: {
                    transitions: ['filled'],
                    metadata: { description: 'Empty cell that can be filled' }
                },
                filled: {
                    transitions: ['empty', 'selected', 'matched'],
                    metadata: { description: 'Cell contains a game piece' }
                },
                selected: {
                    transitions: ['filled'],
                    metadata: { description: 'Cell is selected by player' }
                },
                matched: {
                    transitions: ['empty'],
                    metadata: { description: 'Cell is part of a match' }
                },
                falling: {
                    transitions: ['filled'],
                    metadata: { description: 'Cell content is falling' }
                }
            },
            visuals: {
                empty: CellRenderer.createColorStyle({
                    fill: '#f0f0f0',
                    stroke: '#cccccc',
                    strokeWidth: 1
                }),
                filled: CellRenderer.createColorStyle({
                    fill: '#ffffff',
                    stroke: '#999999',
                    strokeWidth: 1
                }),
                selected: CellRenderer.createColorStyle({
                    fill: '#ffeb3b',
                    stroke: '#fbc02d',
                    strokeWidth: 2
                }),
                matched: CellRenderer.createColorStyle({
                    fill: '#4caf50',
                    stroke: '#388e3c',
                    strokeWidth: 2
                })
            },
            transitions: {
                empty: ['filled'],
                filled: ['empty', 'selected', 'matched'],
                selected: ['filled'],
                matched: ['empty'],
                falling: ['filled']
            }
        };

        return new StateConfiguration(config);
    }

    /**
     * Export configuration to JSON
     * @returns {Object} Configuration object
     */
    exportConfiguration() {
        return {
            defaultState: this.defaultState || Object.keys(Object.fromEntries(this.states))[0],
            states: Object.fromEntries(this.states),
            visuals: Object.fromEntries(this.visuals),
            transitions: Object.fromEntries(this.transitions),
            themes: Object.fromEntries(this.themes)
        };
    }

    /**
     * Get configuration statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            stateCount: this.states.size,
            visualCount: this.visuals.size,
            transitionRuleCount: this.transitions.size,
            themeCount: this.themes.size
        };
    }
}

export default StateConfiguration;
