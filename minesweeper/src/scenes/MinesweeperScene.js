import GridGameScene from 'hatch-engine/scenes/GridGameScene.js';
import { StateConfiguration } from 'hatch-engine/grid/StateConfiguration.js';
import { getLogger } from 'hatch-engine/core/Logger.js';
import { InputEvents } from 'hatch-engine/core/Constants.js';

const DIFFICULTY_LEVELS = {
    BEGINNER: { cols: 9, rows: 9, mines: 10 },
    INTERMEDIATE: { cols: 16, rows: 16, mines: 40 },
    EXPERT: { cols: 30, rows: 16, mines: 99 }
};

const GAME_STATE = {
    READY: 'ready',
    PLAYING: 'playing', 
    WON: 'won',
    LOST: 'lost'
};

export default class MinesweeperScene extends GridGameScene {
    constructor(engine) {
        const difficulty = DIFFICULTY_LEVELS.BEGINNER;
        
        super(engine, {
            cols: difficulty.cols,
            rows: difficulty.rows,
            maxCellSize: 40,
            minCellSize: 20,
            margins: { top: 80, bottom: 80, left: 20, right: 20 },
            showGridLines: false,
            autoResize: true
        }, {
            configuration: StateConfiguration.createMinesweeperConfig(),
            enableAnimations: false,
            enableDebug: false
        });
        
        this.logger = getLogger('Minesweeper');
        this.difficulty = difficulty;
        this.difficultyName = 'BEGINNER';
        this.gameState = GAME_STATE.READY;
        this.mines = new Set();
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.flagCount = 0;
    }

    init() {
        try {
            super.init();
            this.setupGrid();
            this.setupEventListeners();
            this.engine.gridManager = this.gridManager;
            
            if (this.engine.canvas) {
                this.engine.canvas.setAttribute('tabindex', '0');
                this.engine.canvas.focus();
                this.engine.canvas.style.outline = 'none';
            }
        } catch (error) {
            this.logger.error('Failed to initialize Minesweeper scene:', error);
            throw new Error(`Minesweeper Scene init() error: ${error.message}`);
        }
    }

    setupGrid() {
        for (let row = 0; row < this.gridConfig.rows; row++) {
            for (let col = 0; col < this.gridConfig.cols; col++) {
                this.stateManager.setCellState(col, row, 'hidden', {
                    isMine: false,
                    neighborMines: 0,
                    revealed: false,
                    flagged: false
                });
            }
        }
    }

    setupEventListeners() {
        this.eventBus.on(InputEvents.GRID_MOUSEDOWN, (event) => {
            if (this.gameState === GAME_STATE.WON || this.gameState === GAME_STATE.LOST) {
                this.restartGame();
                return;
            }

            const { gridX, gridY, button } = event;
            
            if (button === 0) {
                this.handleCellClick(gridX, gridY);
            } else if (button === 2) {
                this.handleCellRightClick(gridX, gridY);
            }
        });
    }

    handleCellClick(col, row) {
        const cellState = this.stateManager.getCellState(col, row);
        
        if (!cellState || cellState.state !== 'hidden') {
            return;
        }

        if (this.firstClick) {
            this.generateMines(col, row);
            this.calculateNeighborNumbers();
            this.firstClick = false;
            this.gameState = GAME_STATE.PLAYING;
            this.startTime = Date.now();
        }

        this.revealCell(col, row);
        this.checkGameEnd();
    }

    handleCellRightClick(col, row) {
        const cellState = this.stateManager.getCellState(col, row);
        
        if (!cellState || cellState.state === 'revealed') {
            return;
        }

        if (cellState.state === 'hidden') {
            this.stateManager.setCellState(col, row, 'flagged', cellState.data);
            this.flagCount++;
        } else if (cellState.state === 'flagged') {
            this.stateManager.setCellState(col, row, 'hidden', cellState.data);
            this.flagCount--;
        }
    }

    generateMines(avoidCol, avoidRow) {
        this.mines.clear();
        const availablePositions = [];
        
        for (let row = 0; row < this.gridConfig.rows; row++) {
            for (let col = 0; col < this.gridConfig.cols; col++) {
                if (col !== avoidCol || row !== avoidRow) {
                    availablePositions.push({ col, row });
                }
            }
        }
        
        for (let i = 0; i < this.difficulty.mines && availablePositions.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const position = availablePositions.splice(randomIndex, 1)[0];
            
            this.mines.add(`${position.col},${position.row}`);
            
            const cellState = this.stateManager.getCellState(position.col, position.row);
            if (cellState) {
                cellState.data.isMine = true;
                this.stateManager.setCellState(position.col, position.row, cellState.state, cellState.data);
            }
        }
    }

    calculateNeighborNumbers() {
        for (let row = 0; row < this.gridConfig.rows; row++) {
            for (let col = 0; col < this.gridConfig.cols; col++) {
                const cellState = this.stateManager.getCellState(col, row);
                if (cellState && !cellState.data.isMine) {
                    let mineCount = 0;
                    
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const neighborCol = col + dx;
                            const neighborRow = row + dy;
                            
                            if (this.isValidPosition(neighborCol, neighborRow)) {
                                const neighborState = this.stateManager.getCellState(neighborCol, neighborRow);
                                if (neighborState?.data?.isMine) {
                                    mineCount++;
                                }
                            }
                        }
                    }
                    
                    cellState.data.neighborMines = mineCount;
                    this.stateManager.setCellState(col, row, cellState.state, cellState.data);
                }
            }
        }
    }

    revealCell(col, row) {
        const cellState = this.stateManager.getCellState(col, row);
        
        if (!cellState || cellState.state !== 'hidden') {
            return;
        }

        cellState.data.revealed = true;
        this.stateManager.setCellState(col, row, 'revealed', cellState.data);

        if (cellState.data.isMine) {
            this.gameState = GAME_STATE.LOST;
            this.endTime = Date.now();
            this.revealAllMines();
            return;
        }

        if (cellState.data.neighborMines === 0) {
            this.floodFillReveal(col, row);
        }
    }

    floodFillReveal(startCol, startRow) {
        const toReveal = [{col: startCol, row: startRow}];
        const visited = new Set();
        
        while (toReveal.length > 0) {
            const {col, row} = toReveal.pop();
            const key = `${col},${row}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const neighborCol = col + dx;
                    const neighborRow = row + dy;
                    
                    if (this.isValidPosition(neighborCol, neighborRow)) {
                        const neighborState = this.stateManager.getCellState(neighborCol, neighborRow);
                        
                        if (neighborState?.state === 'hidden' && !neighborState.data.isMine) {
                            neighborState.data.revealed = true;
                            this.stateManager.setCellState(neighborCol, neighborRow, 'revealed', neighborState.data);
                            
                            if (neighborState.data.neighborMines === 0) {
                                toReveal.push({col: neighborCol, row: neighborRow});
                            }
                        }
                    }
                }
            }
        }
    }

    revealAllMines() {
        for (const mineKey of this.mines) {
            const [col, row] = mineKey.split(',').map(Number);
            const cellState = this.stateManager.getCellState(col, row);
            
            if (cellState && cellState.state !== 'revealed') {
                cellState.data.revealed = true;
                this.stateManager.setCellState(col, row, 'revealed', cellState.data);
            }
        }
    }

    checkGameEnd() {
        if (this.gameState !== GAME_STATE.PLAYING) {
            return;
        }

        let revealedCount = 0;
        const totalCells = this.gridConfig.cols * this.gridConfig.rows;
        
        for (let row = 0; row < this.gridConfig.rows; row++) {
            for (let col = 0; col < this.gridConfig.cols; col++) {
                const cellState = this.stateManager.getCellState(col, row);
                if (cellState?.state === 'revealed' && !cellState.data.isMine) {
                    revealedCount++;
                }
            }
        }

        if (revealedCount === totalCells - this.difficulty.mines) {
            this.gameState = GAME_STATE.WON;
            this.endTime = Date.now();
        }
    }

    isValidPosition(col, row) {
        return col >= 0 && col < this.gridConfig.cols && row >= 0 && row < this.gridConfig.rows;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.handleKeyboardInput();
    }

    handleKeyboardInput() {
        if (!this.engine.inputManager) {
            return;
        }

        if (this.engine.inputManager.isKeyJustPressed('KeyR')) {
            this.restartGame();
        }

        if (this.engine.inputManager.isKeyJustPressed('Digit1')) {
            this.changeDifficulty('BEGINNER');
        }
        if (this.engine.inputManager.isKeyJustPressed('Digit2')) {
            this.changeDifficulty('INTERMEDIATE');
        }
        if (this.engine.inputManager.isKeyJustPressed('Digit3')) {
            this.changeDifficulty('EXPERT');
        }
    }

    restartGame() {
        this.gameState = GAME_STATE.READY;
        this.mines.clear();
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.flagCount = 0;
        
        for (let row = 0; row < this.gridConfig.rows; row++) {
            for (let col = 0; col < this.gridConfig.cols; col++) {
                this.stateManager.setCellState(col, row, 'hidden', {
                    isMine: false,
                    neighborMines: 0,
                    revealed: false,
                    flagged: false
                }, { force: true });
            }
        }
        
        if (this.cellRenderer) {
            this.cellRenderer.clearAnimations();
        }
    }

    changeDifficulty(difficultyName) {
        if (!DIFFICULTY_LEVELS[difficultyName]) {
            return;
        }
        if (this.difficultyName === difficultyName) {
            this.restartGame();
            return;
        }
        
        this.difficulty = DIFFICULTY_LEVELS[difficultyName];
        this.difficultyName = difficultyName;
        this.gridConfig.cols = this.difficulty.cols;
        this.gridConfig.rows = this.difficulty.rows;
        this.initializeGrid();
        this.engine.gridManager = this.gridManager;
        
        if (this.stateManager) {
            this.initializeStateSystem();
        }
        
        this.restartGame();
    }

    render(renderingEngine) {
        super.render(renderingEngine);
        this.renderUI(renderingEngine);
    }

    renderUI(renderingEngine) {
        if (!renderingEngine || !renderingEngine.context || !renderingEngine.canvas) {
            return;
        }
        
        const ctx = renderingEngine.context;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const uiTopY = Math.max(20, this.gridOffsetY - 40);
        const uiBottomY = this.gridOffsetY + (this.gridConfig.rows * this.cellSize) + 20;
        
        const minesLeft = this.difficulty.mines - this.flagCount;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Mines: ${minesLeft}`, this.gridOffsetX, uiTopY);
        
        let timeText = '00:00';
        if (this.startTime) {
            const elapsed = this.endTime ? (this.endTime - this.startTime) : (Date.now() - this.startTime);
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            timeText = `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        
        ctx.textAlign = 'right';
        const rightX = this.gridOffsetX + (this.gridConfig.cols * this.cellSize);
        ctx.fillText(`Time: ${timeText}`, rightX, uiTopY);
        
        let statusText = '';
        let statusColor = '#000000';
        
        switch (this.gameState) {
            case GAME_STATE.WON:
                statusText = 'You Win! Click to restart';
                statusColor = '#00aa00';
                break;
            case GAME_STATE.LOST:
                statusText = 'Game Over! Click to restart';
                statusColor = '#cc0000';
                break;
        }
        
        if (statusText) {
            ctx.fillStyle = statusColor;
            ctx.textAlign = 'center';
            ctx.font = 'bold 18px Arial';
            const centerX = this.gridOffsetX + (this.gridConfig.cols * this.cellSize) / 2;
            ctx.fillText(statusText, centerX, uiBottomY);
        }
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const centerX = this.gridOffsetX + (this.gridConfig.cols * this.cellSize) / 2;
        ctx.fillText(`Difficulty: ${this.difficultyName} (${this.difficulty.cols}×${this.difficulty.rows})`, centerX, uiBottomY + 40);
        
        ctx.restore();
    }

    destroy() {
        if (this.engine.gridManager === this.gridManager) {
            this.engine.gridManager = null;
        }
        super.destroy();
    }
}
