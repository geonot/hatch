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
            defaultStyle: { // This becomes the true default if a state has no visual defined
                type: 'color',
                fill: '#e0e0e0',
                stroke: '#999999',
                strokeWidth: 1,
                zIndex: 0,
            },
            enableAnimations: false,
            animationDuration: 300,
            ...config
        };

        // State visual definitions, keyed by stateName
        this.stateVisuals = new Map();
        // Custom rendering functions, keyed by visual.renderKey
        this.customRenderFunctions = new Map();
        // Animation state tracking
        this.animatingCells = new Map();
        // Cache for frequently used visuals
        this.visualCache = new Map();

        this.logger.info('CellRenderer initialized');
    }

    /**
     * Registers a custom rendering function.
     * @param {string} renderKey - The key used in StateConfiguration's visual definition (visual.renderKey).
     * @param {Function} renderFunction - The function to execute for rendering this visual.
     *                                    Expected signature: (ctx, col, row, x, y, size, cellState, visualData, engine)
     */
    registerCustomRenderer(renderKey, renderFunction) {
        if (typeof renderFunction !== 'function') {
            this.logger.error(`Attempted to register non-function for custom renderKey: ${renderKey}`);
            return;
        }
        this.customRenderFunctions.set(renderKey, renderFunction);
        this.logger.info(`Custom renderer registered for key: ${renderKey}`);
    }

    /**
     * Define visual representation for a state, typically from StateConfiguration.
     * @param {string} stateName - Name of the state.
     * @param {Object} visualData - Visual definition from StateConfiguration.
     *                               Example: { type: 'color', fill: '#ff0000', stroke: '#000000', strokeWidth: 1 }
     *                               Example: { type: 'sprite', spriteKey: 'gem_red', frame: 'idle' }
     *                               Example: { type: 'text', textKey: 'value', font: '16px Arial', color: 'black' }
     *                               Example: { type: 'custom', renderKey: 'myCustomRenderer', customProperty: 'abc' }
     */
    defineStateVisual(stateName, visualData) {
        // Ensure a base type if not specified, defaulting to color.
        const visualConfig = {
            type: visualData.type || 'color',
            zIndex: visualData.zIndex || 0,
            ...visualData // Spread the rest of the properties from visualData
        };

        // If type is color, ensure default fill/stroke if not provided in visualData
        if (visualConfig.type === 'color') {
            visualConfig.fill = visualData.fill || this.config.defaultStyle.fill;
            visualConfig.stroke = visualData.stroke || this.config.defaultStyle.stroke;
            visualConfig.strokeWidth = visualData.strokeWidth || this.config.defaultStyle.strokeWidth;
        }
        
        this.stateVisuals.set(stateName, visualConfig);
        this.logger.info(`Visual defined for state: ${stateName}`, {
            type: visualConfig.type,
            details: visualConfig,
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
            case 'text': // New case for text rendering
                this._renderTextCell(ctx, x, y, size, visual, cellState);
                break;
            case 'custom':
                this._renderCustomCell(ctx, col, row, x, y, size, visual, cellState, options);
                break;
            default:
                this.logger.warn(`Unknown visual type: ${visual.type} for state ${cellState.state}. Falling back to default.`);
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
        const visual = this.stateVisuals.get(stateName);
        if (!visual) {
            this.logger.warn(`No visual defined for state: ${stateName}, using default style. Available states: ${Array.from(this.stateVisuals.keys()).join(', ')}`);
            return { ...this.config.defaultStyle }; // Return a copy of the default style
        }
        // this.logger.debug(`Visual found for state: ${stateName}`, { type: visual.type }); // Can be too verbose
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
            // textKey: config.textKey, // Key in cellState.data to get text from
            // font: config.font,
            // textColor: config.textColor,
            // textAlign: config.textAlign,
            // textBaseline: config.textBaseline,
            ...config
        };
    }

    /**
     * Create a custom render function style
     * @param {string} renderKey - Key to identify the custom render function.
     * @param {Object} [config={}] - Additional configuration for this visual.
     * @returns {Object} Visual configuration object
     */
    static createCustomStyle(renderKey, config = {}) {
        return {
            type: 'custom',
            renderKey: renderKey,
            zIndex: config.zIndex || 0,
            ...config // Pass any other properties needed by the custom renderer
        };
    }

    /**
     * Render a color-based cell
     * @private
     */
    _renderColorCell(ctx, x, y, size, visual, cellState) {
        // Fill cell
        ctx.fillStyle = visual.fill || this.config.defaultStyle.fill;
        ctx.fillRect(x, y, size, size);

        // Stroke cell
        const strokeWidth = visual.strokeWidth || this.config.defaultStyle.strokeWidth;
        if (visual.stroke && strokeWidth > 0) {
            ctx.strokeStyle = visual.stroke;
            ctx.lineWidth = strokeWidth;
            ctx.strokeRect(x, y, size, size);
        }
    }

    /**
     * Render a sprite-based cell
     * @private
     */
    _renderSpriteCell(ctx, x, y, size, visual, cellState) {
        // Ensure assetManager is available
        if (!this.engine.assetManager) {
            this.logger.warn('AssetManager not available for sprite rendering. Falling back.');
            this._renderColorCell(ctx, x, y, size, visual.baseStyle || this.config.defaultStyle, cellState);
            return;
        }

        const spriteAsset = this.engine.assetManager.get(visual.spriteKey);
        if (spriteAsset && spriteAsset.image) { // Assuming spriteAsset is an image or has an image property
            const scale = visual.scale || 1;
            const spriteWidth = visual.frameWidth || spriteAsset.image.width;
            const spriteHeight = visual.frameHeight || spriteAsset.image.height;
            
            // Calculate aspect ratio to fit within the cell size while maintaining proportions
            let drawWidth = size * scale;
            let drawHeight = size * scale;
            const aspectRatio = spriteWidth / spriteHeight;

            if (drawWidth / aspectRatio > size * scale) { // Too tall
                drawWidth = (size*scale) * aspectRatio;
            } else { // Too wide or just right
                 drawHeight = (size*scale) / aspectRatio;
            }
            if (drawWidth > size*scale) drawWidth = size*scale;
            if (drawHeight > size*scale) drawHeight = size*scale;


            const offsetX = x + (size - drawWidth) / 2;
            const offsetY = y + (size - drawHeight) / 2;

            // TODO: Add support for sprite atlas frames if visual.frame is defined
            ctx.drawImage(
                spriteAsset.image, // Source image
                // TODO: Add sx, sy, sWidth, sHeight for sprite atlas frames
                offsetX, // Destination x
                offsetY, // Destination y
                drawWidth, // Destination width
                drawHeight // Destination height
            );
        } else {
            this.logger.warn(`Sprite asset not found or invalid: ${visual.spriteKey}. Falling back.`);
            this._renderColorCell(ctx, x, y, size, visual.baseStyle || this.config.defaultStyle, cellState);
        }
    }

    /**
     * Render a text-based cell
     * @private
     */
    _renderTextCell(ctx, x, y, size, visual, cellState) {
        // First, render the background (optional, could be part of visual.baseStyle)
        if (visual.fill) {
             this._renderColorCell(ctx, x, y, size, visual, cellState); // Use visual for bg
        }

        const textContent = cellState.data && visual.textKey ? cellState.data[visual.textKey] : (visual.defaultText || '');
        if (textContent === undefined || textContent === null) {
            this.logger.debug(`No text content for state ${cellState.state} with textKey ${visual.textKey}`);
            return;
        }

        ctx.font = visual.font || '16px Arial';
        ctx.fillStyle = visual.textColor || '#000000';
        ctx.textAlign = visual.textAlign || 'center';
        ctx.textBaseline = visual.textBaseline || 'middle';

        const textX = x + (visual.textAlign === 'center' ? size / 2 : (visual.textAlign === 'right' ? size - (visual.padding || 0) : (visual.padding || 0) ));
        const textY = y + (visual.textBaseline === 'middle' ? size / 2 : (visual.textBaseline === 'bottom' ? size - (visual.padding || 0) : (visual.padding || 0)));

        ctx.fillText(textContent.toString(), textX, textY);
    }


    /**
     * Render a custom cell
     * @private
     */
    _renderCustomCell(ctx, col, row, x, y, size, visual, cellState, options) {
        const renderFn = this.customRenderFunctions.get(visual.renderKey);
        if (typeof renderFn === 'function') {
            try {
                // Pass the visual data from StateConfiguration, the cellState, and the engine
                renderFn(ctx, col, row, x, y, size, cellState, visual, this.engine, options);
            } catch (error) {
                this.logger.error(`Error in custom render function for key ${visual.renderKey} (state ${cellState.state}):`, error);
                this._renderColorCell(ctx, x, y, size, visual.baseStyle || this.config.defaultStyle, cellState);
            }
        } else {
            this.logger.warn(`No custom render function registered for key: ${visual.renderKey} (state ${cellState.state}). Falling back.`);
            this._renderColorCell(ctx, x, y, size, visual.baseStyle || this.config.defaultStyle, cellState);
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
