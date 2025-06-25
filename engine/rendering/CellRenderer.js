/**
 * @file CellRenderer.js
 * @description Configurable rendering system for cell states.
 * Maps cell states to visual representations using sprites, colors, or custom rendering functions.
 */

import { getLogger } from '../core/Logger.js';

/**
 * @class CellRenderer
 * @classdesc Handles rendering of cells based on their states.
 * Supports multiple rendering modes: color, sprite, and custom functions.
 */
export class CellRenderer {
    /**
     * Create a CellRenderer instance
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The engine instance
     * @param {Object} config - Configuration options
     * @param {Object} [config.defaultStyle] - Default style for unspecified states
     * @param {boolean} [config.enableAnimations=false] - Enable state transition animations
     * @param {number} [config.animationDuration=300] - Animation duration in milliseconds
     */
    constructor(engine, config = {}) {
        this.engine = engine;
        this.logger = getLogger('CellRenderer');
        
        this.config = {
            defaultStyle: {
                fill: '#e0e0e0',
                stroke: '#999999',
                strokeWidth: 1
            },
            enableAnimations: false,
            animationDuration: 300,
            ...config
        };
        
        // State visual definitions
        this.stateVisuals = new Map();
        
        // Animation state tracking
        this.animatingCells = new Map();
        
        // Cache for frequently used visuals
        this.visualCache = new Map();
        
        this.logger.info('CellRenderer initialized');
    }

    /**
     * Define visual representation for a state
     * @param {string} stateName - Name of the state
     * @param {Object} visual - Visual definition
     * @param {string} [visual.type='color'] - Rendering type: 'color', 'sprite', 'custom'
     * @param {string} [visual.fill] - Fill color (for color type)
     * @param {string} [visual.stroke] - Stroke color (for color type)
     * @param {number} [visual.strokeWidth] - Stroke width (for color type)
     * @param {string} [visual.sprite] - Sprite asset name (for sprite type)
     * @param {string} [visual.frame] - Sprite frame name (for sprite type)
     * @param {Function} [visual.customRender] - Custom render function (for custom type)
     * @param {Object} [visual.animation] - Animation properties
     * @param {number} [visual.zIndex=0] - Rendering order
     */
    defineStateVisual(stateName, visual) {
        const visualConfig = {
            type: 'color',
            fill: this.config.defaultStyle.fill,
            stroke: this.config.defaultStyle.stroke,
            strokeWidth: this.config.defaultStyle.strokeWidth,
            zIndex: 0,
            ...visual
        };
        
        this.stateVisuals.set(stateName, visualConfig);
        this.logger.info(`Visual defined for state: ${stateName}`, { 
            type: visualConfig.type, 
            fill: visualConfig.fill,
            totalVisuals: this.stateVisuals.size 
        });
    }

    /**
     * Render a single cell based on its state
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} col - Cell column
     * @param {number} row - Cell row
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} size - Cell size
     * @param {Object} cellState - Cell state object
     * @param {Object} [options={}] - Rendering options
     */
    renderCell(ctx, col, row, x, y, size, cellState, options = {}) {
        const visual = this.getVisualForState(cellState.state);
        const cellKey = `${col}_${row}`;
        
        // Check for animations
        const animationState = this.animatingCells.get(cellKey);
        if (animationState) {
            this._renderAnimatedCell(ctx, x, y, size, visual, animationState);
            return;
        }
        
        // Render based on visual type
        switch (visual.type) {
            case 'color':
                this._renderColorCell(ctx, x, y, size, visual, cellState);
                break;
            case 'sprite':
                this._renderSpriteCell(ctx, x, y, size, visual, cellState);
                break;
            case 'custom':
                this._renderCustomCell(ctx, col, row, x, y, size, visual, cellState, options);
                break;
            default:
                this.logger.warn(`Unknown visual type: ${visual.type}`);
                this._renderColorCell(ctx, x, y, size, this.config.defaultStyle, cellState);
        }
    }

    /**
     * Render multiple cells efficiently
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {import('./CellStateManager.js').CellStateManager} stateManager - State manager
     * @param {number} cellSize - Size of each cell
     * @param {number} offsetX - Grid offset X
     * @param {number} offsetY - Grid offset Y
     * @param {Object} [options={}] - Rendering options
     */
    renderGrid(ctx, stateManager, cellSize, offsetX, offsetY, options = {}) {
        const startTime = performance.now();
        let renderedCells = 0;

        // Group cells by visual type for efficient rendering
        const cellGroups = this._groupCellsByVisual(stateManager);
        
        // Render in zIndex order
        const sortedGroups = Array.from(cellGroups.entries())
            .sort(([, a], [, b]) => (a.visual.zIndex || 0) - (b.visual.zIndex || 0));

        for (const [visualKey, group] of sortedGroups) {
            for (const cellData of group.cells) {
                const { col, row, cellState } = cellData;
                const x = offsetX + col * cellSize;
                const y = offsetY + row * cellSize;
                
                this.renderCell(ctx, col, row, x, y, cellSize, cellState, options);
                renderedCells++;
            }
        }

        const renderTime = performance.now() - startTime;
        this.logger.debug(`Rendered ${renderedCells} cells in ${renderTime.toFixed(2)}ms`);
    }

    /**
     * Get visual definition for a state
     * @param {string} stateName - State name
     * @returns {Object} Visual definition
     */
    getVisualForState(stateName) {
        const visual = this.stateVisuals.get(stateName);
        if (!visual) {
            this.logger.warn(`No visual defined for state: ${stateName}, using default. Available states: ${Array.from(this.stateVisuals.keys()).join(', ')}`);
            // Return a proper visual object with type
            return {
                type: 'color',
                ...this.config.defaultStyle
            };
        }
        this.logger.debug(`Visual found for state: ${stateName}`, { type: visual.type });
        return visual;
    }

    /**
     * Start animation for a cell state transition
     * @param {number} col - Cell column
     * @param {number} row - Cell row
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {number} [duration] - Animation duration override
     */
    animateStateTransition(col, row, fromState, toState, duration) {
        if (!this.config.enableAnimations) return;

        const cellKey = `${col}_${row}`;
        const animDuration = duration || this.config.animationDuration;
        
        const animationState = {
            fromVisual: this.getVisualForState(fromState),
            toVisual: this.getVisualForState(toState),
            startTime: Date.now(),
            duration: animDuration,
            progress: 0
        };
        
        this.animatingCells.set(cellKey, animationState);
        
        // Schedule animation removal
        setTimeout(() => {
            this.animatingCells.delete(cellKey);
        }, animDuration);
    }

    /**
     * Create a visual style for common cell states
     * @param {Object} config - Style configuration
     * @returns {Object} Visual configuration object
     */
    static createColorStyle(config) {
        return {
            type: 'color',
            fill: config.fill || '#e0e0e0',
            stroke: config.stroke || '#999999',
            strokeWidth: config.strokeWidth || 1,
            zIndex: config.zIndex || 0
        };
    }

    /**
     * Create a sprite-based visual style
     * @param {Object} config - Sprite configuration
     * @returns {Object} Visual configuration object
     */
    static createSpriteStyle(config) {
        return {
            type: 'sprite',
            sprite: config.sprite,
            frame: config.frame,
            scale: config.scale || 1,
            zIndex: config.zIndex || 0
        };
    }

    /**
     * Create a custom render function style
     * @param {Function} renderFunction - Custom render function
     * @param {Object} [config={}] - Additional configuration
     * @returns {Object} Visual configuration object
     */
    static createCustomStyle(renderFunction, config = {}) {
        return {
            type: 'custom',
            customRender: renderFunction,
            zIndex: config.zIndex || 0,
            ...config
        };
    }

    /**
     * Render a color-based cell
     * @private
     */
    _renderColorCell(ctx, x, y, size, visual, cellState) {
        // Fill cell
        ctx.fillStyle = visual.fill;
        ctx.fillRect(x, y, size, size);
        
        // Stroke cell
        if (visual.stroke && visual.strokeWidth > 0) {
            ctx.strokeStyle = visual.stroke;
            ctx.lineWidth = visual.strokeWidth;
            ctx.strokeRect(x, y, size, size);
        }
    }

    /**
     * Render a sprite-based cell
     * @private
     */
    _renderSpriteCell(ctx, x, y, size, visual, cellState) {
        const sprite = this.engine.assetManager?.get(visual.sprite);
        if (sprite && sprite.image) {
            const scale = visual.scale || 1;
            const spriteSize = size * scale;
            const offsetX = (size - spriteSize) / 2;
            const offsetY = (size - spriteSize) / 2;
            
            ctx.drawImage(
                sprite.image,
                x + offsetX,
                y + offsetY,
                spriteSize,
                spriteSize
            );
        } else {
            // Fallback to color if sprite not available
            this._renderColorCell(ctx, x, y, size, this.config.defaultStyle, cellState);
        }
    }

    /**
     * Render a custom cell
     * @private
     */
    _renderCustomCell(ctx, col, row, x, y, size, visual, cellState, options) {
        if (typeof visual.customRender === 'function') {
            try {
                visual.customRender(ctx, col, row, x, y, size, cellState, options);
            } catch (error) {
                console.error(`❌ CellRenderer: Error in custom render for (${col}, ${row}):`, error);
                this.logger.error(`Error in custom render function for state ${cellState.state}:`, error);
                this._renderColorCell(ctx, x, y, size, this.config.defaultStyle, cellState);
            }
        } else {
            console.warn(`⚠️ CellRenderer: No custom render function for state: ${cellState.state}`);
            this.logger.warn(`No custom render function defined for state: ${cellState.state}`);
            this._renderColorCell(ctx, x, y, size, this.config.defaultStyle, cellState);
        }
    }

    /**
     * Render an animated cell
     * @private
     */
    _renderAnimatedCell(ctx, x, y, size, targetVisual, animationState) {
        const elapsed = Date.now() - animationState.startTime;
        const progress = Math.min(elapsed / animationState.duration, 1);
        
        // Linear interpolation for color properties
        if (animationState.fromVisual.type === 'color' && targetVisual.type === 'color') {
            const fill = this._interpolateColor(animationState.fromVisual.fill, targetVisual.fill, progress);
            const stroke = this._interpolateColor(animationState.fromVisual.stroke, targetVisual.stroke, progress);
            
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, size, size);
            
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = targetVisual.strokeWidth;
                ctx.strokeRect(x, y, size, size);
            }
        } else {
            // For non-color animations, just render the target
            this._renderColorCell(ctx, x, y, size, targetVisual, {});
        }
    }

    /**
     * Group cells by their visual type for efficient rendering
     * @private
     */
    _groupCellsByVisual(stateManager) {
        const groups = new Map();
        
        for (let row = 0; row < stateManager.rows; row++) {
            for (let col = 0; col < stateManager.cols; col++) {
                const cellState = stateManager.getCellState(col, row);
                const visual = this.getVisualForState(cellState.state);
                const visualKey = this._getVisualKey(visual);
                
                if (!groups.has(visualKey)) {
                    groups.set(visualKey, { visual, cells: [] });
                }
                
                groups.get(visualKey).cells.push({ col, row, cellState });
            }
        }
        
        return groups;
    }

    /**
     * Generate a unique key for a visual style
     * @private
     */
    _getVisualKey(visual) {
        return `${visual.type}_${visual.zIndex || 0}_${JSON.stringify(visual)}`;
    }

    /**
     * Interpolate between two colors
     * @private
     */
    _interpolateColor(color1, color2, progress) {
        // Simple hex color interpolation
        if (!color1 || !color2) return color1 || color2;
        
        // For now, just return the target color
        // TODO: Implement proper color interpolation
        return progress > 0.5 ? color2 : color1;
    }

    /**
     * Clear all animations
     */
    clearAnimations() {
        this.animatingCells.clear();
    }

    /**
     * Get rendering statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            definedVisuals: this.stateVisuals.size,
            activeAnimations: this.animatingCells.size,
            cacheSize: this.visualCache.size
        };
    }
}

export default CellRenderer;
