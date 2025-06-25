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
     * Helper method to render revealed cells with proper content display
     * @private
     * @static
     */
    static _renderRevealedCell(ctx, x, y, size, cellState, constants) {
        // Draw revealed background
        ctx.fillStyle = constants.COLORS.REVEALED;
        ctx.fillRect(x, y, size, size);
        
        // Draw border
        ctx.strokeStyle = constants.COLORS.BORDER;
        ctx.lineWidth = Math.max(1, size * 0.02);
        ctx.strokeRect(x, y, size, size);
        
        // Get cell data to determine what to display
        const data = cellState.data;
        
        if (data && data.isMine) {
            // Draw mine
            const centerX = x + size / 2;
            const centerY = y + size / 2;
            const radius = size * constants.SIZING.MINE_RADIUS_RATIO;
            
            // Mine background (red if game over mine)
            if (data.gameOverMine) {
                ctx.fillStyle = constants.COLORS.MINE_BG;
                ctx.fillRect(x, y, size, size);
            }
            
            // Draw mine body
            ctx.fillStyle = constants.COLORS.MINE_BLACK;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw mine spikes
            const spikeLength = radius * constants.SIZING.SPIKE_LENGTH_RATIO;
            ctx.strokeStyle = constants.COLORS.MINE_BLACK;
            ctx.lineWidth = Math.max(constants.SIZING.MIN_LINE_WIDTH, size * 0.05);
            
            // Draw 8 spikes (4 cardinal + 4 diagonal)
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const startX = centerX + Math.cos(angle) * radius;
                const startY = centerY + Math.sin(angle) * radius;
                const endX = centerX + Math.cos(angle) * (radius + spikeLength);
                const endY = centerY + Math.sin(angle) * (radius + spikeLength);
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (data && data.neighborMines > 0) {
            // Draw number
            const number = data.neighborMines;
            ctx.fillStyle = constants.COLORS.NUMBERS[number] || constants.COLORS.NUMBERS[8];
            ctx.font = `bold ${Math.floor(size * constants.SIZING.NUMBER_FONT_RATIO)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(number.toString(), x + size / 2, y + size / 2);
        }
        // Empty cells just show the revealed background (no additional content)
    }

    /**
     * Helper method to render flagged cells with flag display
     * @private
     * @static
     */
    static _renderFlaggedCell(ctx, x, y, size, cellState, constants) {
        // Draw hidden background
        ctx.fillStyle = constants.COLORS.HIDDEN;
        ctx.fillRect(x, y, size, size);
        
        // Draw border
        ctx.strokeStyle = constants.COLORS.BORDER;
        ctx.lineWidth = Math.max(1, size * 0.02);
        ctx.strokeRect(x, y, size, size);
        
        // Draw flag
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const flagWidth = size * constants.SIZING.FLAG_WIDTH_RATIO;
        const flagHeight = size * constants.SIZING.FLAG_HEIGHT_RATIO;
        const poleHeight = size * constants.SIZING.POLE_HEIGHT_RATIO;
        
        // Draw flag pole
        ctx.strokeStyle = constants.COLORS.FLAG_POLE;
        ctx.lineWidth = Math.max(constants.SIZING.MIN_LINE_WIDTH, size * 0.04);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - poleHeight / 2);
        ctx.lineTo(centerX, centerY + poleHeight / 2);
        ctx.stroke();
        
        // Draw flag fabric
        ctx.fillStyle = constants.COLORS.FLAG_RED;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - poleHeight / 2);
        ctx.lineTo(centerX + flagWidth, centerY - poleHeight / 2 + flagHeight / 2);
        ctx.lineTo(centerX, centerY - poleHeight / 2 + flagHeight);
        ctx.closePath();
        ctx.fill();
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
                
                revealed: CellRenderer.createCustomStyle((ctx, col, row, x, y, size, cellState) => {
                    StateConfiguration._renderRevealedCell(ctx, x, y, size, cellState, MINESWEEPER_CONSTANTS);
                }),
                
                flagged: CellRenderer.createCustomStyle((ctx, col, row, x, y, size, cellState) => {
                    StateConfiguration._renderFlaggedCell(ctx, x, y, size, cellState, MINESWEEPER_CONSTANTS);
                })
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
