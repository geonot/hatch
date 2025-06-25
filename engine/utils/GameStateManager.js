/**
 * @file GameStateManager.js
 * @description Utility class for managing game state transitions and state-dependent logic.
 * Eliminates boilerplate code for manual state management patterns common in games.
 */

/**
 * @class GameStateManager
 * @classdesc Manages game states with automatic transition validation, event handling, and persistence.
 * Provides a declarative approach to game state management that eliminates common boilerplate patterns.
 */
export class GameStateManager {
    
    /**
     * Create a GameStateManager instance
     * @param {Object} config - Configuration object
     * @param {Object} config.states - State definitions with enter/exit/update handlers
     * @param {string} config.initialState - Initial state name
     * @param {Array<Array>} [config.transitions] - Valid state transitions [[from, to], ...]
     * @param {boolean} [config.allowAnyTransition=false] - Allow any state transition if true
     * @param {Function} [config.onStateChange] - Global state change callback
     * @param {Function} [config.onTransitionDenied] - Callback when transition is denied
     */
    constructor(config) {
        this.states = config.states || {};
        this.currentState = null;
        this.previousState = null;
        this.stateData = {};
        this.stateStartTime = 0;
        this.allowAnyTransition = config.allowAnyTransition || false;
        
        // Build transition map for validation
        this.validTransitions = new Map();
        if (config.transitions && !this.allowAnyTransition) {
            config.transitions.forEach(([from, to]) => {
                if (!this.validTransitions.has(from)) {
                    this.validTransitions.set(from, new Set());
                }
                this.validTransitions.get(from).add(to);
            });
        }
        
        // Event callbacks
        this.onStateChange = config.onStateChange;
        this.onTransitionDenied = config.onTransitionDenied;
        
        // State history for debugging
        this.stateHistory = [];
        this.maxHistorySize = 50;
        
        // Initialize to starting state
        if (config.initialState) {
            this.setState(config.initialState, {}, true);
        }
    }

    /**
     * Get the current state name
     * @returns {string|null} Current state name
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get the previous state name
     * @returns {string|null} Previous state name
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Get data associated with the current state
     * @returns {Object} State data object
     */
    getStateData() {
        return this.stateData;
    }

    /**
     * Get time elapsed in current state (in milliseconds)
     * @returns {number} Time in current state
     */
    getTimeInState() {
        return Date.now() - this.stateStartTime;
    }

    /**
     * Check if currently in a specific state
     * @param {string} stateName - State name to check
     * @returns {boolean} True if currently in the specified state
     */
    isInState(stateName) {
        return this.currentState === stateName;
    }

    /**
     * Check if transition from current state to target state is valid
     * @param {string} targetState - Target state name
     * @returns {boolean} True if transition is valid
     */
    canTransitionTo(targetState) {
        if (this.allowAnyTransition) {
            return true;
        }
        
        if (!this.currentState) {
            return true; // Can transition to any state from null
        }
        
        const allowedTransitions = this.validTransitions.get(this.currentState);
        return allowedTransitions ? allowedTransitions.has(targetState) : false;
    }

    /**
     * Transition to a new state
     * @param {string} newState - Target state name
     * @param {Object} [stateData={}] - Data to pass to the new state
     * @param {boolean} [force=false] - Force transition even if not in transition map
     * @returns {boolean} True if transition was successful
     */
    setState(newState, stateData = {}, force = false) {
        // Validate state exists
        if (!this.states[newState]) {
            console.warn(`GameStateManager: State '${newState}' does not exist`);
            return false;
        }

        // Check if already in target state
        if (this.currentState === newState) {
            // Update state data but don't trigger transitions
            this.stateData = { ...this.stateData, ...stateData };
            return true;
        }

        // Validate transition
        if (!force && !this.canTransitionTo(newState)) {
            console.warn(`GameStateManager: Invalid transition from '${this.currentState}' to '${newState}'`);
            if (this.onTransitionDenied) {
                this.onTransitionDenied(this.currentState, newState);
            }
            return false;
        }

        const oldState = this.currentState;
        
        // Exit current state
        if (this.currentState && this.states[this.currentState].exit) {
            try {
                this.states[this.currentState].exit(this.stateData);
            } catch (error) {
                console.error(`GameStateManager: Error in exit handler for state '${this.currentState}':`, error);
            }
        }

        // Update state tracking
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateData = stateData;
        this.stateStartTime = Date.now();

        // Add to history
        this.stateHistory.push({
            state: newState,
            timestamp: this.stateStartTime,
            from: oldState
        });
        
        // Trim history if too long
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }

        // Enter new state
        if (this.states[newState].enter) {
            try {
                this.states[newState].enter(this.stateData);
            } catch (error) {
                console.error(`GameStateManager: Error in enter handler for state '${newState}':`, error);
            }
        }

        // Global state change callback
        if (this.onStateChange) {
            try {
                this.onStateChange(oldState, newState, this.stateData);
            } catch (error) {
                console.error(`GameStateManager: Error in global state change handler:`, error);
            }
        }

        return true;
    }

    /**
     * Update the current state (call from game loop)
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (this.currentState && this.states[this.currentState].update) {
            try {
                this.states[this.currentState].update(deltaTime, this.stateData);
            } catch (error) {
                console.error(`GameStateManager: Error in update handler for state '${this.currentState}':`, error);
            }
        }
    }

    /**
     * Render the current state (call from render loop)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (this.currentState && this.states[this.currentState].render) {
            try {
                this.states[this.currentState].render(ctx, this.stateData);
            } catch (error) {
                console.error(`GameStateManager: Error in render handler for state '${this.currentState}':`, error);
            }
        }
    }

    /**
     * Add a new state definition
     * @param {string} stateName - Name of the state
     * @param {Object} stateDefinition - State definition with enter/exit/update/render handlers
     */
    addState(stateName, stateDefinition) {
        this.states[stateName] = stateDefinition;
    }

    /**
     * Remove a state definition
     * @param {string} stateName - Name of the state to remove
     */
    removeState(stateName) {
        if (this.currentState === stateName) {
            console.warn(`GameStateManager: Cannot remove current state '${stateName}'`);
            return false;
        }
        delete this.states[stateName];
        return true;
    }

    /**
     * Add valid transition between states
     * @param {string} fromState - Source state
     * @param {string} toState - Target state
     */
    addTransition(fromState, toState) {
        if (!this.validTransitions.has(fromState)) {
            this.validTransitions.set(fromState, new Set());
        }
        this.validTransitions.get(fromState).add(toState);
    }

    /**
     * Remove valid transition between states
     * @param {string} fromState - Source state
     * @param {string} toState - Target state
     */
    removeTransition(fromState, toState) {
        const transitions = this.validTransitions.get(fromState);
        if (transitions) {
            transitions.delete(toState);
        }
    }

    /**
     * Get state history for debugging
     * @param {number} [count=10] - Number of recent states to return
     * @returns {Array} Array of state history entries
     */
    getStateHistory(count = 10) {
        return this.stateHistory.slice(-count);
    }

    /**
     * Export current state for persistence
     * @returns {Object} Serializable state object
     */
    exportState() {
        return {
            currentState: this.currentState,
            stateData: JSON.parse(JSON.stringify(this.stateData)),
            stateStartTime: this.stateStartTime
        };
    }

    /**
     * Import state from persistence
     * @param {Object} savedState - Previously exported state
     * @param {boolean} [force=true] - Force the state transition
     */
    importState(savedState, force = true) {
        if (savedState.currentState) {
            this.stateStartTime = savedState.stateStartTime || Date.now();
            this.setState(savedState.currentState, savedState.stateData || {}, force);
        }
    }

    /**
     * Reset to initial state
     * @param {Object} [initialData={}] - Data for initial state
     */
    reset(initialData = {}) {
        if (this.stateHistory.length > 0) {
            const firstState = this.stateHistory[0].state;
            this.setState(firstState, initialData, true);
        }
    }

    /**
     * Create a conditional state transition helper
     * @param {string} targetState - State to transition to
     * @param {Function} condition - Function that returns boolean
     * @param {Object} [stateData={}] - Data to pass if transition occurs
     * @returns {Function} Function that can be called to attempt conditional transition
     */
    createConditionalTransition(targetState, condition, stateData = {}) {
        return () => {
            if (condition(this.currentState, this.stateData)) {
                return this.setState(targetState, stateData);
            }
            return false;
        };
    }

    /**
     * Create a timed state transition
     * @param {string} targetState - State to transition to after timeout
     * @param {number} delay - Delay in milliseconds
     * @param {Object} [stateData={}] - Data to pass when transitioning
     * @returns {number} Timeout ID that can be used to cancel
     */
    createTimedTransition(targetState, delay, stateData = {}) {
        return setTimeout(() => {
            this.setState(targetState, stateData);
        }, delay);
    }
}
