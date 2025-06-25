import Scene from './Scene.js';
import { GridManager } from '../grid/GridManager.js';
import { CellStateManager } from '../grid/CellStateManager.js';
import { CellRenderer } from '../rendering/CellRenderer.js';
import { StateConfiguration } from '../grid/StateConfiguration.js';
import { getLogger } from '../core/Logger.js';

export class GridGameScene extends Scene {
    constructor(engine, gridConfig, stateConfig = {}) {
        super(engine);
        
        this.logger = getLogger(`${this.constructor.name}`);
        
        this.gridConfig = {
            cols: gridConfig.cols,
            rows: gridConfig.rows,
            maxCellSize: gridConfig.maxCellSize || 48,
            minCellSize: gridConfig.minCellSize || 16,
            margins: {
                top: 80,
                bottom: 60,
                left: 20,
                right: 20,
                ...gridConfig.margins
            },
            showGridLines: gridConfig.showGridLines || false,
            autoResize: gridConfig.autoResize !== false
        };

        this.stateConfig = {
            enableDebug: false,
            rendererOptions: {},
            ...stateConfig
        };

        this.gridManager = null;
        this.cellSize = 0;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        this.hoveredCell = null;
        this.selectedCell = null;
        
        this.cellStyles = {
            default: {
                fill: '#e0e0e0',
                stroke: '#999999',
                strokeWidth: 1
            },
            hover: {
                fill: '#f0f0f0',
                stroke: '#666666',
                strokeWidth: 1
            },
            selected: {
                fill: '#bbdefb',
                stroke: '#2196f3',
                strokeWidth: 2
            }
        };

        this.stateManager = null;
        this.cellRenderer = null;
        this.stateConfiguration = null;
        this.stateChangeListeners = [];

        if (this.gridConfig.autoResize) {
            this._resizeHandler = this._handleResize.bind(this);
        }
    }

    initializeStateSystem(configInput) {
        if (configInput instanceof StateConfiguration) {
            this.stateConfiguration = configInput;
        } else if (configInput) {
            this.stateConfiguration = new StateConfiguration(configInput);
        } else if (this.stateConfig.configuration) {
            this.stateConfiguration = this.stateConfig.configuration;
        } else if (this.stateConfig.config) {
            this.stateConfiguration = new StateConfiguration(this.stateConfig.config);
        } else {
            this.stateConfiguration = new StateConfiguration();
        }

        const config = this.stateConfiguration.exportConfiguration();
        const defaultState = config.defaultState || Object.keys(config.states)[0] || 'default';
        
        this.stateManager = new CellStateManager(
            this.engine,
            this.gridConfig.cols,
            this.gridConfig.rows,
            {
                defaultState: defaultState,
                stateDefinitions: config.states
            }
        );

        this.cellRenderer = new CellRenderer(this.engine, {
            defaultStyle: this.cellStyles.default,
            enableAnimations: this.stateConfig.enableAnimations || false,
            ...this.stateConfig.rendererOptions
        });

        this.stateConfiguration.configureStateManager(this.stateManager);
        this.stateConfiguration.configureRenderer(this.cellRenderer);
        this.stateManager.onStateChange(this._onStateChange.bind(this));
    }

    renderCell(ctx, col, row, x, y, size) {
        if (this.cellRenderer && this.stateManager) {
            const cellState = this.stateManager.getCellState(col, row);
            if (cellState) {
                this.cellRenderer.renderCell(ctx, col, row, x, y, size, cellState);
                return;
            }
        }
        
        const isHovered = this.hoveredCell && this.hoveredCell.col === col && this.hoveredCell.row === row;
        const isSelected = this.selectedCell && this.selectedCell.col === col && this.selectedCell.row === row;
        
        let style = this.cellStyles.default;
        if (isSelected) {
            style = this.cellStyles.selected;
        } else if (isHovered) {
            style = this.cellStyles.hover;
        }

        ctx.fillStyle = style.fill;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeRect(x, y, size, size);
    }

    onCellInteraction(col, row, action, event) {
        if (this.stateManager) {
            const cellState = this.stateManager.getCellState(col, row);
            this.onCellStateInteraction(col, row, action, event, cellState);
        }
    }

    onCellStateInteraction(col, row, action, event, cellState) {
        
    }

    screenToGrid(screenX, screenY) {
        const col = Math.floor((screenX - this.gridOffsetX) / this.cellSize);
        const row = Math.floor((screenY - this.gridOffsetY) / this.cellSize);
        
        if (col >= 0 && col < this.gridConfig.cols && row >= 0 && row < this.gridConfig.rows) {
            return { col, row };
        }
        return null;
    }

    gridToScreen(col, row) {
        return {
            x: this.gridOffsetX + col * this.cellSize + this.cellSize / 2,
            y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2
        };
    }

    initializeGrid() {
        const canvas = this.engine.canvas;
        const rect = canvas.getBoundingClientRect();
        const availableWidth = rect.width - this.gridConfig.margins.left - this.gridConfig.margins.right;
        const availableHeight = rect.height - this.gridConfig.margins.top - this.gridConfig.margins.bottom;
        
        const maxCellWidth = Math.floor(availableWidth / this.gridConfig.cols);
        const maxCellHeight = Math.floor(availableHeight / this.gridConfig.rows);
        
        this.cellSize = Math.min(
            maxCellWidth,
            maxCellHeight,
            this.gridConfig.maxCellSize
        );
        this.cellSize = Math.max(this.cellSize, this.gridConfig.minCellSize);
        
        const totalGridWidth = this.gridConfig.cols * this.cellSize;
        const totalGridHeight = this.gridConfig.rows * this.cellSize;
        
        this.gridOffsetX = (rect.width - totalGridWidth) / 2;
        this.gridOffsetY = this.gridConfig.margins.top + 
                          (availableHeight - totalGridHeight) / 2;

        this.gridManager = new GridManager(this.engine, {
            numCols: this.gridConfig.cols,
            numRows: this.gridConfig.rows,
            tileWidth: this.cellSize,
            tileHeight: this.cellSize,
            offsetX: this.gridOffsetX,
            offsetY: this.gridOffsetY,
            showGridLines: this.gridConfig.showGridLines
        });
    }

    _handleResize() {
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
        }
        this._resizeTimeout = setTimeout(() => {
            this.initializeGrid();
        }, 250);
    }

    setCellState(col, row, newState, data = {}, options = {}) {
        if (!this.stateManager) {
            return false;
        }
        return this.stateManager.setCellState(col, row, newState, data, options);
    }

    getCellState(col, row) {
        return this.stateManager?.getCellState(col, row) || null;
    }

    getCellsByState(stateName) {
        return this.stateManager?.getCellsByState(stateName) || [];
    }

    countCellsInState(stateName) {
        return this.stateManager?.countCellsInState(stateName) || 0;
    }

    floodFill(startCol, startRow, targetState, condition, data = {}, includeDiagonals = false) {
        if (!this.stateManager) {
            return [];
        }
        return this.stateManager.floodFill(startCol, startRow, targetState, condition, data, includeDiagonals);
    }

    batchUpdateCells(updates, options = {}) {
        if (!this.stateManager) {
            return [];
        }
        return this.stateManager.batchUpdateCells(updates, options);
    }

    resetCellStates(options = {}) {
        if (this.stateManager) {
            this.stateManager.resetGrid(options);
        }
    }

    onStateChange(listener) {
        this.stateChangeListeners.push(listener);
    }

    offStateChange(listener) {
        const index = this.stateChangeListeners.indexOf(listener);
        if (index !== -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    }

    _onStateChange(eventData) {
        if (this.cellRenderer && this.stateConfig.enableAnimations && eventData.col !== undefined) {
            this.cellRenderer.animateStateTransition(
                eventData.col,
                eventData.row,
                eventData.previousState.state,
                eventData.currentState.state
            );
        }

        for (const listener of this.stateChangeListeners) {
            try {
                listener(eventData);
            } catch (error) {
                this.logger.error('Error in state change listener:', error);
            }
        }

        this.onStateChanged(eventData);
    }

    onStateChanged(eventData) {
        
    }

    init() {
        this.initializeGrid();
        
        if (this.gridConfig.autoResize && typeof window !== 'undefined') {
            window.addEventListener('resize', this._resizeHandler);
        }

        if (this.stateConfig.configuration || this.stateConfig.config) {
            this.initializeStateSystem();
        }
    }

    update(deltaTime) {
        if (this.inputManager) {
            const mousePos = this.inputManager.getMousePosition();
            const gridPos = this.screenToGrid(mousePos.x, mousePos.y);
            
            const previousHover = this.hoveredCell;
            this.hoveredCell = gridPos;
            
            if (previousHover && (!gridPos || 
                previousHover.col !== gridPos.col || previousHover.row !== gridPos.row)) {
                this.onCellInteraction(previousHover.col, previousHover.row, 'unhover', { mousePos });
            }
            
            if (gridPos && (!previousHover || 
                previousHover.col !== gridPos.col || previousHover.row !== gridPos.row)) {
                this.onCellInteraction(gridPos.col, gridPos.row, 'hover', { mousePos });
            }
            
            if (gridPos) {
                if (this.inputManager.isMouseButtonJustPressed(0)) {
                    this.selectedCell = gridPos;
                    this.onCellInteraction(gridPos.col, gridPos.row, 'click', { mousePos, button: 0 });
                }
                
                if (this.inputManager.isMouseButtonJustPressed(2)) {
                    this.onCellInteraction(gridPos.col, gridPos.row, 'rightclick', { mousePos, button: 2 });
                }
            }
        }
    }

    render(renderingEngine) {
        renderingEngine.clearDrawables();
        
        const ctx = renderingEngine.context;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (this.cellRenderer && this.stateManager) {
            this.cellRenderer.renderGrid(
                ctx,
                this.stateManager,
                this.cellSize,
                this.gridOffsetX,
                this.gridOffsetY
            );
        } else {
            for (let row = 0; row < this.gridConfig.rows; row++) {
                for (let col = 0; col < this.gridConfig.cols; col++) {
                    const x = this.gridOffsetX + col * this.cellSize;
                    const y = this.gridOffsetY + row * this.cellSize;
                    this.renderCell(ctx, col, row, x, y, this.cellSize);
                }
            }
        }
        
        if (this.gridConfig.showGridLines && this.gridManager) {
            this.gridManager.renderGridLines(renderingEngine, '#cccccc', 1);
        }
        
        ctx.restore();
    }

    exit() {
        if (this.gridConfig.autoResize && typeof window !== 'undefined' && this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
        }
    }

    destroy() {
        this.exit();
        
        if (this.cellRenderer) {
            this.cellRenderer.clearAnimations();
        }
        
        this.gridManager = null;
        this.hoveredCell = null;
        this.selectedCell = null;
        this.stateManager = null;
        this.cellRenderer = null;
        this.stateConfiguration = null;
        this.stateChangeListeners = [];
    }
}

export default GridGameScene;
