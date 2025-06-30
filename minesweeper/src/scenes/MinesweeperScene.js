// filepath: /home/rome/Code/hatch/hatch/minesweeper/src/scenes/MinesweeperScene.js
import { GameScene } from 'hatch-engine/ui/SceneTemplates.js';
import { InputBindings } from 'hatch-engine/input/InputBindings.js';
import { UIBuilderEnhanced } from 'hatch-engine/ui/UIBuilderEnhanced.js';
import { StateConfiguration } from 'hatch-engine/grid/StateConfiguration.js';

const DIFFICULTY_LEVELS = {
    BEGINNER: { name: 'Beginner', cols: 9, rows: 9, mines: 10, key: '1' },
    INTERMEDIATE: { name: 'Intermediate', cols: 16, rows: 16, mines: 40, key: '2' },
    EXPERT: { name: 'Expert', cols: 30, rows: 16, mines: 99, key: '3' }
};

export default class MinesweeperScene extends GameScene {
    constructor(engine) {
        super(engine, {
            // GameScene template handles UI setup, performance monitoring, input bindings, etc.
            title: 'Minesweeper',
            showPerformanceOverlay: false,
            enableAutoWiring: true,
            theme: 'minesweeper'
        });
        
        // Game state - much simpler with template handling setup
        this.difficulty = DIFFICULTY_LEVELS.BEGINNER;
        this.gameState = 'ready';
        this.mines = new Set();
        this.firstClick = true;
        this.flagCount = 0;
        
        // Grid will be created automatically by setupGrid()
        this.gridManager = null;
        this.stateManager = null;
    }

    init() {
        super.init(); // GameScene handles UI, performance monitoring, etc.
        
        this.setupGrid();
        this.setupInputBindings();
        this.setupUI();
        this.setupTheme();
    }

    setupGrid() {
        // Create grid manager with current difficulty
        this.gridManager = this.engine.createGridManager({
            cols: this.difficulty.cols,
            rows: this.difficulty.rows,
            maxCellSize: 40,
            minCellSize: 20,
            margins: { top: 100, bottom: 120, left: 20, right: 20 },
            showGridLines: false,
            autoResize: true
        });

        // Create state manager for cell states
        this.stateManager = this.engine.createStateManager({
            configuration: StateConfiguration.createMinesweeperConfig(),
            enableAnimations: false,
            enableDebug: false
        });

        // Initialize all cells
        for (let row = 0; row < this.difficulty.rows; row++) {
            for (let col = 0; col < this.difficulty.cols; col++) {
                this.stateManager.setCellState(col, row, 'hidden', {
                    isMine: false,
                    neighborMines: 0,
                    revealed: false
                });
            }
        }

        // Auto-wire grid events using naming convention
        this.autoWire({
            'cellClick': (col, row) => this.onCellClick(col, row),
            'cellRightClick': (col, row) => this.onCellRightClick(col, row)
        });
    }

    setupInputBindings() {
        // Use declarative input binding system
        this.bindInput('minesweeper', {
            'restart': 'KeyR',
            'difficulty1': 'Digit1', 
            'difficulty2': 'Digit2',
            'difficulty3': 'Digit3'
        });
    }

    setupUI() {
        // Use enhanced UI builder for modern UI
        this.ui.builder()
            .panel('header')
                .top().center().padding(20)
                .layout('flex', { direction: 'row', justify: 'space-between', align: 'center' })
                .children([
                    this.ui.label('mineCounter')
                        .text(() => `Mines: ${this.difficulty.mines - this.flagCount}`)
                        .variant('counter'),
                    
                    this.ui.label('timer')
                        .text(() => this.formatTime())
                        .variant('counter'),
                        
                    this.ui.button('restartBtn')
                        .text('New Game')
                        .variant('primary')
                        .onClick(() => this.restartGame())
                ])
            .end()
            
            .panel('footer')
                .bottom().center().padding(20)
                .layout('flex', { direction: 'column', align: 'center', gap: 10 })
                .children([
                    this.ui.label('status')
                        .text(() => this.getStatusText())
                        .variant('status')
                        .conditional(() => this.gameState !== 'ready' && this.gameState !== 'playing'),
                        
                    this.ui.label('difficulty')
                        .text(() => `${this.difficulty.name} (${this.difficulty.cols}×${this.difficulty.rows})`)
                        .variant('info'),
                        
                    this.ui.label('controls')
                        .text('Left: Reveal | Right: Flag | R: Restart | 1/2/3: Difficulty')
                        .variant('hint')
                ])
            .end()
            
            .modal('gameOver')
                .conditional(() => this.gameState === 'won' || this.gameState === 'lost')
                .children([
                    this.ui.label('gameOverText')
                        .text(() => this.gameState === 'won' ? '🎉 You Won!' : '💣 Game Over!')
                        .variant('title'),
                        
                    this.ui.label('gameTime')
                        .text(() => `Time: ${this.formatTime()}`)
                        .variant('subtitle'),
                        
                    this.ui.button('playAgain')
                        .text('Play Again')
                        .variant('primary')
                        .onClick(() => this.restartGame())
                ])
            .end();
    }

    setupTheme() {
        // Define Minesweeper-specific theme
        this.ui.registerTheme('minesweeper', {
            colors: {
                primary: '#2196F3',
                success: '#4CAF50', 
                danger: '#F44336',
                background: '#f5f5f5',
                surface: '#ffffff',
                text: '#333333',
                textSecondary: '#666666'
            },
            variants: {
                counter: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#2196F3',
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '2px solid #e0e0e0'
                },
                status: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: (state) => state.gameState === 'won' ? '#4CAF50' : '#F44336'
                },
                info: {
                    fontSize: 16,
                    color: '#666666'
                },
                hint: {
                    fontSize: 14,
                    color: '#999999',
                    fontStyle: 'italic'
                }
            }
        });
    }

    // Auto-wired input handlers (naming convention)
    onRestart() {
        this.restartGame();
    }

    onDifficulty1() {
        this.changeDifficulty('BEGINNER');
    }

    onDifficulty2() {
        this.changeDifficulty('INTERMEDIATE');
    }

    onDifficulty3() {
        this.changeDifficulty('EXPERT');
    }

    // Auto-wired grid event handlers
    onCellClick(col, row) {
        if (this.gameState === 'won' || this.gameState === 'lost') {
            this.restartGame();
            return;
        }

        if (this.firstClick) {
            this.generateMines(col, row);
            this.calculateNeighborNumbers();
            this.firstClick = false;
            this.gameState = 'playing';
            this.startTimer();
        }

        this.revealCell(col, row);
        this.checkGameEnd();
    }

    onCellRightClick(col, row) {
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
        
        for (let row = 0; row < this.difficulty.rows; row++) {
            for (let col = 0; col < this.difficulty.cols; col++) {
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
        for (let row = 0; row < this.difficulty.rows; row++) {
            for (let col = 0; col < this.difficulty.cols; col++) {
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
            this.gameState = 'lost';
            this.stopTimer();
            this.revealAllMines();
            return;
        }

        // Auto-reveal connected empty cells using flood fill
        if (cellState.data.neighborMines === 0) {
            this.floodFillReveal(col, row);
        }
    }

    floodFillReveal(startCol, startRow) {
        const stack = [{col: startCol, row: startRow}];
        const visited = new Set();

        while (stack.length > 0) {
            const {col, row} = stack.pop();
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
                                const neighborKey = `${neighborCol},${neighborRow}`;
                                if (!visited.has(neighborKey)) {
                                    stack.push({col: neighborCol, row: neighborRow});
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    revealAllMines() {
        for (let row = 0; row < this.difficulty.rows; row++) {
            for (let col = 0; col < this.difficulty.cols; col++) {
                const cellState = this.stateManager.getCellState(col, row);
                if (cellState?.data?.isMine) {
                    this.stateManager.setCellState(col, row, 'revealed', cellState.data);
                }
            }
        }
    }

    checkGameEnd() {
        if (this.gameState !== 'playing') {
            return;
        }

        let revealedCount = 0;
        const totalCells = this.difficulty.cols * this.difficulty.rows;
        
        for (let row = 0; row < this.difficulty.rows; row++) {
            for (let col = 0; col < this.difficulty.cols; col++) {
                const cellState = this.stateManager.getCellState(col, row);
                if (cellState?.state === 'revealed' && !cellState.data.isMine) {
                    revealedCount++;
                }
            }
        }

        if (revealedCount === totalCells - this.difficulty.mines) {
            this.gameState = 'won';
            this.stopTimer();
        }
    }

    changeDifficulty(level) {
        if (DIFFICULTY_LEVELS[level]) {
            this.difficulty = DIFFICULTY_LEVELS[level];
            this.restartGame();
        }
    }

    restartGame() {
        this.gameState = 'ready';
        this.mines.clear();
        this.firstClick = true;
        this.flagCount = 0;
        this.resetTimer();
        
        // Recreate grid with new difficulty
        this.setupGrid();
    }

    isValidPosition(col, row) {
        return col >= 0 && col < this.difficulty.cols && row >= 0 && row < this.difficulty.rows;
    }

    // UI helper methods
    formatTime() {
        if (!this.startTime) return '00:00';
        
        const elapsed = this.endTime ? (this.endTime - this.startTime) : (Date.now() - this.startTime);
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    getStatusText() {
        switch (this.gameState) {
            case 'won':
                return '�� You Won!';
            case 'lost':
                return '💣 Game Over!';
            default:
                return '';
        }
    }

    // Timer methods (enhanced by GameScene template)
    startTimer() {
        this.startTime = Date.now();
        this.endTime = null;
    }

    stopTimer() {
        this.endTime = Date.now();
    }

    resetTimer() {
        this.startTime = null;
        this.endTime = null;
    }

    // Scene lifecycle - enhanced by GameScene template
    update(deltaTime) {
        super.update(deltaTime); // GameScene handles input binding updates, performance monitoring, etc.
        
        // Game-specific updates can go here
    }

    render(renderingEngine) {
        super.render(renderingEngine); // GameScene handles UI rendering, performance overlay, etc.
        
        // Additional custom rendering can go here if needed
    }

    destroy() {
        // GameScene template handles most cleanup automatically
        super.destroy();
    }
}
