/**
 * @file CellStateManager.js
 * @description Core cell state management system for grid-based games.
 * Provides finite state machine functionality for individual cells and grid-wide operations.
 */

import { getLogger } from '../core/Logger.js';
import { GridUtils } from '../utils/GridUtils.js';

/**
 * @class CellStateManager
 * @classdesc Manages cell states for a grid using finite state machine principles.
 * Provides centralized state tracking, transitions, queries, and validation.
 */
export class CellStateManager {
    /**
     * Create a CellStateManager instance
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The engine instance
     * @param {number} cols - Number of grid columns
     * @param {number} rows - Number of grid rows
     * @param {Object} config - Configuration options
     * @param {string} [config.defaultState='default'] - Default state for new cells
     * @param {Object} [config.stateDefinitions={}] - State definitions and rules
     */
    constructor(engine, cols, rows, config = {}) {
        this.engine = engine;
        this.logger = getLogger('CellStateManager');
        this.cols = cols;
        this.rows = rows;
        
        this.config = {
            defaultState: 'default',
            stateDefinitions: {},
            ...config
        };
        
        // Grid to store cell states
        this.cellStates = GridUtils.createGrid(cols, rows, () => ({
            state: this.config.defaultState,
            data: {},
            metadata: {
                lastChanged: Date.now(),
                transitionCount: 0
            }
        }));
        
        // Track state definitions and valid transitions
        this.stateDefinitions = new Map();
        this.stateTransitions = new Map();
        this.stateQueries = new Map(); // For caching common queries
        
        // Performance and analytics tracking
        this.stateStats = {
            totalTransitions: 0,
            transitionHistory: [],
            stateDistribution: new Map()
        };
        
        // Event listeners for state changes
        this.stateChangeListeners = [];
        
        this.logger.info(`CellStateManager initialized: ${cols}x${rows} grid`);
    }

    /**
     * Define a state with its properties and valid transitions
     * @param {string} stateName - Name of the state
     * @param {Object} definition - State definition
     * @param {Array<string>} [definition.allowedTransitions] - States this can transition to
     * @param {Object} [definition.visual] - Visual properties for rendering
     * @param {Function} [definition.validator] - Validation function for state entry
     * @param {Object} [definition.metadata] - Additional metadata
     */
    defineState(stateName, definition = {}) {
        const stateConfig = {
            allowedTransitions: [],
            visual: {},
            validator: null,
            metadata: {},
            ...definition
        };
        
        this.stateDefinitions.set(stateName, stateConfig);
        this.stateTransitions.set(stateName, new Set(stateConfig.allowedTransitions));
        
        this.logger.debug(`State defined: ${stateName}`, { transitions: stateConfig.allowedTransitions });
    }

    /**
     * Get the current state of a cell
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @returns {Object|null} Cell state object or null if invalid coordinates
     */
    getCellState(col, row) {
        if (!GridUtils.isValidPosition(col, row, this.cols, this.rows)) {
            return null;
        }
        return this.cellStates[row][col];
    }

    /**
     * Set the state of a cell with validation and events
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {string} newState - New state name
     * @param {Object} [data={}] - Additional data to store with the state
     * @param {Object} [options={}] - Options for the state change
     * @param {boolean} [options.force=false] - Force transition even if not allowed
     * @param {boolean} [options.silent=false] - Don't trigger events
     * @returns {boolean} True if state was changed successfully
     */
    setCellState(col, row, newState, data = {}, options = {}) {
        const cell = this.getCellState(col, row);
        if (!cell) {
            this.logger.warn(`Invalid cell coordinates: (${col}, ${row})`);
            return false;
        }

        const currentState = cell.state;
        
        // Check if transition is allowed
        if (!options.force && !this.isTransitionAllowed(currentState, newState)) {
            this.logger.warn(`Invalid transition from ${currentState} to ${newState} at (${col}, ${row})`);
            return false;
        }

        // Validate new state if validator exists
        const stateDefinition = this.stateDefinitions.get(newState);
        if (stateDefinition?.validator && !stateDefinition.validator(cell, col, row, data)) {
            this.logger.warn(`State validation failed for ${newState} at (${col}, ${row})`);
            return false;
        }

        // Store previous state for events
        const previousState = {
            state: currentState,
            data: { ...cell.data }
        };

        // Update cell state
        cell.state = newState;
        cell.data = { ...cell.data, ...data };
        cell.metadata.lastChanged = Date.now();
        cell.metadata.transitionCount++;

        // Trigger events if not silent
        if (!options.silent) {
            this._triggerStateChange({
                col, row, 
                previousState, 
                currentState: { state: newState, data: cell.data },
                timestamp: Date.now()
            });
        }

        // Update state statistics
        this._updateStateStatistics(currentState, newState);

        this.logger.debug(`State changed at (${col}, ${row}): ${currentState} -> ${newState}`);
        return true;
    }

    /**
     * Check if a transition between states is allowed
     * @param {string} fromState - Current state
     * @param {string} toState - Target state
     * @returns {boolean} True if transition is allowed
     */
    isTransitionAllowed(fromState, toState) {
        const allowedTransitions = this.stateTransitions.get(fromState);
        return allowedTransitions ? allowedTransitions.has(toState) : true;
    }

    /**
     * Get all cells matching a specific state
     * @param {string} stateName - State to search for
     * @returns {Array<{col: number, row: number, cell: Object}>} Matching cells
     */
    getCellsByState(stateName) {
        const results = [];
        GridUtils.forEachCell(this.cellStates, (cell, col, row) => {
            if (cell.state === stateName) {
                results.push({ col, row, cell });
            }
        });
        return results;
    }

    /**
     * Count cells in a specific state
     * @param {string} stateName - State to count
     * @returns {number} Number of cells in that state
     */
    countCellsInState(stateName) {
        return GridUtils.countCells(this.cellStates, cell => cell.state === stateName);
    }

    /**
     * Get cells matching a condition
     * @param {Function} condition - Function that takes (cell, col, row) and returns boolean
     * @returns {Array<{col: number, row: number, cell: Object}>} Matching cells
     */
    getCellsByCondition(condition) {
        const results = [];
        GridUtils.forEachCell(this.cellStates, (cell, col, row) => {
            if (condition(cell, col, row)) {
                results.push({ col, row, cell });
            }
        });
        return results;
    }

    /**
     * Batch update multiple cells
     * @param {Array<{col: number, row: number, state: string, data?: Object}>} updates - Array of updates
     * @param {Object} [options={}] - Options for batch update
     * @returns {Array<boolean>} Array of success status for each update
     */
    batchUpdateCells(updates, options = {}) {
        const results = [];
        for (const update of updates) {
            const success = this.setCellState(
                update.col, 
                update.row, 
                update.state, 
                update.data || {}, 
                options
            );
            results.push(success);
        }
        return results;
    }

    /**
     * Reset grid to default state
     * @param {Object} [options={}] - Reset options
     * @param {boolean} [options.clearData=true] - Whether to clear cell data
     */
    resetGrid(options = {}) {
        const { clearData = true } = options;
        
        GridUtils.forEachCell(this.cellStates, (cell, col, row) => {
            cell.state = this.config.defaultState;
            if (clearData) {
                cell.data = {};
            }
            cell.metadata = {
                lastChanged: Date.now(),
                transitionCount: 0
            };
        });

        this.logger.info('Grid reset to default state');
    }

    /**
     * Add a listener for state changes
     * @param {Function} listener - Function to call on state changes
     */
    onStateChange(listener) {
        this.stateChangeListeners.push(listener);
    }

    /**
     * Remove a state change listener
     * @param {Function} listener - Listener to remove
     */
    offStateChange(listener) {
        const index = this.stateChangeListeners.indexOf(listener);
        if (index !== -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    }

    /**
     * Trigger state change events
     * @private
     */
    _triggerStateChange(eventData) {
        for (const listener of this.stateChangeListeners) {
            try {
                listener(eventData);
            } catch (error) {
                this.logger.error('Error in state change listener:', error);
            }
        }
    }

    /**
     * Get neighbor states for a cell
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {boolean} [includeDiagonals=true] - Include diagonal neighbors
     * @returns {Array<{col: number, row: number, state: string, cell: Object}>} Neighbor states
     */
    getNeighborStates(col, row, includeDiagonals = true) {
        const neighbors = GridUtils.getNeighbors(col, row, this.cols, this.rows, includeDiagonals);
        return neighbors.map(({ col: nCol, row: nRow }) => {
            const cell = this.cellStates[nRow][nCol];
            return { col: nCol, row: nRow, state: cell.state, cell };
        });
    }

    /**
     * Check if all neighbors match a condition
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {Function} condition - Condition function
     * @param {boolean} [includeDiagonals=true] - Include diagonal neighbors
     * @returns {boolean} True if all neighbors match condition
     */
    allNeighborsMatch(col, row, condition, includeDiagonals = true) {
        const neighbors = this.getNeighborStates(col, row, includeDiagonals);
        return neighbors.every(neighbor => condition(neighbor.cell, neighbor.col, neighbor.row));
    }

    /**
     * Apply a flood fill starting from a cell
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {string} targetState - State to fill with
     * @param {Function} condition - Condition for cells to fill
     * @param {Object} [data={}] - Data to apply to filled cells
     * @param {boolean} [includeDiagonals=false] - Include diagonal neighbors
     * @returns {Array<{col: number, row: number}>} Filled cell positions
     */
    floodFill(startCol, startRow, targetState, condition, data = {}, includeDiagonals = false) {
        const filledCells = [];
        
        GridUtils.floodFill(
            startCol, startRow, this.cellStates,
            condition,
            (cell, col, row) => {
                if (this.setCellState(col, row, targetState, data, { silent: true })) {
                    filledCells.push({ col, row });
                }
            },
            includeDiagonals
        );

        // Trigger batch state change event
        if (filledCells.length > 0) {
            this._triggerStateChange({
                type: 'floodFill',
                cells: filledCells,
                targetState,
                timestamp: Date.now()
            });
        }

        return filledCells;
    }

    /**
     * Get debug information about the current state
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        const stateCounts = {};
        GridUtils.forEachCell(this.cellStates, (cell) => {
            stateCounts[cell.state] = (stateCounts[cell.state] || 0) + 1;
        });

        return {
            gridSize: `${this.cols}x${this.rows}`,
            totalCells: this.cols * this.rows,
            definedStates: Array.from(this.stateDefinitions.keys()),
            stateCounts,
            listenerCount: this.stateChangeListeners.length
        };
    }

    /**
     * Update state transition statistics
     * @private
     */
    _updateStateStatistics(fromState, toState) {
        this.stateStats.totalTransitions++;
        this.stateStats.transitionHistory.push({ fromState, toState, timestamp: Date.now() });
        
        // Update state distribution
        const distribution = this.stateStats.stateDistribution;
        distribution.set(fromState, (distribution.get(fromState) || 0) - 1);
        distribution.set(toState, (distribution.get(toState) || 0) + 1);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get all cells in a specific state
     * @param {string} stateName - State to search for
     * @returns {Array<{col: number, row: number, cell: Object}>} Array of matching cells
     */
    getCellsInState(stateName) {
        const results = [];
        GridUtils.forEachCell(this.cellStates, (cell, col, row) => {
            if (cell.state === stateName) {
                results.push({ col, row, cell });
            }
        });
        return results;
    }

    /**
     * Count cells in a specific state
     * @param {string} stateName - State to count
     * @returns {number} Number of cells in the state
     */
    countCellsInState(stateName) {
        let count = 0;
        GridUtils.forEachCell(this.cellStates, (cell) => {
            if (cell.state === stateName) count++;
        });
        return count;
    }

    /**
     * Get neighbors of a cell with optional state filtering
     * @param {number} col - Column coordinate
     * @param {number} row - Row coordinate
     * @param {Object} [options={}] - Options for neighbor selection
     * @param {boolean} [options.includeDiagonals=false] - Include diagonal neighbors
     * @param {string} [options.stateFilter] - Only return neighbors in this state
     * @param {Function} [options.condition] - Custom condition function
     * @returns {Array<{col: number, row: number, cell: Object}>} Array of neighbor cells
     */
    getNeighbors(col, row, options = {}) {
        const neighbors = [];
        const { includeDiagonals = false, stateFilter, condition } = options;
        
        GridUtils.forEachNeighbor(
            col, row, this.cols, this.rows,
            (neighborCol, neighborRow) => {
                const cell = this.getCellState(neighborCol, neighborRow);
                if (cell) {
                    // Apply filters
                    if (stateFilter && cell.state !== stateFilter) return;
                    if (condition && !condition(cell, neighborCol, neighborRow)) return;
                    
                    neighbors.push({ col: neighborCol, row: neighborRow, cell });
                }
            },
            includeDiagonals
        );
        
        return neighbors;
    }

    /**
     * Check if a rectangular region matches a condition
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {number} width - Width of region
     * @param {number} height - Height of region
     * @param {Function} condition - Condition function (cell, col, row) => boolean
     * @returns {boolean} True if all cells in region match condition
     */
    checkRegion(startCol, startRow, width, height, condition) {
        for (let row = startRow; row < startRow + height; row++) {
            for (let col = startCol; col < startCol + width; col++) {
                const cell = this.getCellState(col, row);
                if (!cell || !condition(cell, col, row)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Apply a state change to a rectangular region
     * @param {number} startCol - Starting column
     * @param {number} startRow - Starting row
     * @param {number} width - Width of region
     * @param {number} height - Height of region
     * @param {string} newState - State to apply
     * @param {Object} [data={}] - Data to apply
     * @param {Object} [options={}] - State change options
     * @returns {Array<{col: number, row: number}>} Changed cells
     */
    setRegionState(startCol, startRow, width, height, newState, data = {}, options = {}) {
        const changedCells = [];
        
        for (let row = startRow; row < startRow + height; row++) {
            for (let col = startCol; col < startCol + width; col++) {
                if (this.setCellState(col, row, newState, data, { ...options, silent: true })) {
                    changedCells.push({ col, row });
                }
            }
        }
        
        // Trigger batch change event
        if (changedCells.length > 0 && !options.silent) {
            this._triggerStateChange({
                type: 'regionChange',
                cells: changedCells,
                newState,
                timestamp: Date.now()
            });
        }
        
        return changedCells;
    }

    /**
     * Find patterns in the grid using template matching
     * @param {Array<Array<string|Function>>} pattern - 2D pattern to match
     * @param {Object} [options={}] - Matching options
     * @param {boolean} [options.exact=true] - Require exact state matches
     * @returns {Array<{col: number, row: number, matches: Array}>} Found pattern locations
     */
    findPattern(pattern, options = { exact: true }) {
        const results = [];
        const patternHeight = pattern.length;
        const patternWidth = pattern[0]?.length || 0;
        
        if (patternWidth === 0 || patternHeight === 0) return results;
        
        for (let row = 0; row <= this.rows - patternHeight; row++) {
            for (let col = 0; col <= this.cols - patternWidth; col++) {
                const match = this._matchPatternAt(col, row, pattern, options);
                if (match.isMatch) {
                    results.push({ col, row, matches: match.cells });
                }
            }
        }
        
        return results;
    }

    /**
     * Match pattern at specific location
     * @private
     */
    _matchPatternAt(startCol, startRow, pattern, options) {
        const cells = [];
        let isMatch = true;
        
        for (let patternRow = 0; patternRow < pattern.length && isMatch; patternRow++) {
            for (let patternCol = 0; patternCol < pattern[patternRow].length && isMatch; patternCol++) {
                const gridCol = startCol + patternCol;
                const gridRow = startRow + patternRow;
                const cell = this.getCellState(gridCol, gridRow);
                const patternCell = pattern[patternRow][patternCol];
                
                if (!cell) {
                    isMatch = false;
                    break;
                }
                
                cells.push({ col: gridCol, row: gridRow, cell });
                
                // Check pattern match
                if (typeof patternCell === 'string') {
                    if (options.exact && cell.state !== patternCell) {
                        isMatch = false;
                    }
                } else if (typeof patternCell === 'function') {
                    if (!patternCell(cell, gridCol, gridRow)) {
                        isMatch = false;
                    }
                }
            }
        }
        
        return { isMatch, cells };
    }

    /**
     * Get analytics about state transitions and performance
     * @returns {Object} Comprehensive analytics data
     */
    getAnalytics() {
        return {
            performance: {
                totalTransitions: this.stateStats.totalTransitions,
                averageTransitionsPerCell: this.stateStats.totalTransitions / (this.cols * this.rows),
                recentTransitions: this.stateStats.transitionHistory.slice(-100) // Last 100 transitions
            },
            states: {
                defined: Array.from(this.stateDefinitions.keys()),
                distribution: Object.fromEntries(this.stateStats.stateDistribution),
                mostCommonState: this._getMostCommonState(),
                unusedStates: this._getUnusedStates()
            },
            grid: {
                size: { cols: this.cols, rows: this.rows },
                totalCells: this.cols * this.rows,
                configuredStates: this.stateDefinitions.size,
                listenerCount: this.stateChangeListeners.length
            }
        };
    }

    /**
     * Get the most common state in the grid
     * @private
     */
    _getMostCommonState() {
        const counts = {};
        GridUtils.forEachCell(this.cellStates, (cell) => {
            counts[cell.state] = (counts[cell.state] || 0) + 1;
        });
        
        return Object.entries(counts).reduce((max, [state, count]) => 
            count > (max.count || 0) ? { state, count } : max, {});
    }

    /**
     * Get states that are defined but never used
     * @private
     */
    _getUnusedStates() {
        const usedStates = new Set();
        GridUtils.forEachCell(this.cellStates, (cell) => {
            usedStates.add(cell.state);
        });
        
        return Array.from(this.stateDefinitions.keys()).filter(state => !usedStates.has(state));
    }

    /**
     * Configure this manager with a StateConfiguration instance
     * @param {import('./StateConfiguration.js').StateConfiguration} stateConfig - Configuration to apply
     */
    configureWithStateConfiguration(stateConfig) {
        // Clear existing state definitions
        this.stateDefinitions.clear();
        this.stateTransitions.clear();
        
        // Apply states from configuration
        for (const [stateName, stateData] of stateConfig.states) {
            this.defineState(stateName, {
                allowedTransitions: stateConfig.getTransitions(stateName),
                metadata: stateData.metadata || {}
            });
        }
        
        this.logger.info(`Configured with StateConfiguration: ${stateConfig.states.size} states loaded`);
    }
}

export default CellStateManager;
