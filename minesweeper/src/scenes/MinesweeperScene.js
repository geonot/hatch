import GridGameScene from 'hatch-engine/scenes/GridGameScene.js';
import { StateConfiguration } from 'hatch-engine/grid/StateConfiguration.js';
import { getLogger } from 'hatch-engine/core/Logger.js';
// InputEvents is no longer directly used for mousedown, GridGameScene handles it.

// Game-specific constants for Minesweeper visuals
const MINESWEEPER_CONSTANTS = {
    COLORS: {
        HIDDEN: '#c0c0c0',
        REVEALED: '#ffffff',
        MINE_BG: '#ff4444', // Used when a mine is revealed and it's game over
        BORDER: '#808080',
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
        MIN_LINE_WIDTH: 1.5, // Adjusted slightly from StateConfiguration for direct use
    }
};

// const DIFFICULTY_LEVELS = { // Now loaded from engine.hatchConfig
//     BEGINNER: { cols: 9, rows: 9, mines: 10, name: 'BEGINNER' },
//     INTERMEDIATE: { cols: 16, rows: 16, mines: 40, name: 'INTERMEDIATE' },
//     EXPERT: { cols: 30, rows: 16, mines: 99, name: 'EXPERT' }
// };

// Scene game states, matching GridGameScene's new system
// const GAME_STATE = { // No longer need this local const, use scene.isGameState()
//     READY: 'ready',
//     PLAYING: 'playing',
//     WON: 'won',
//     LOST: 'lost'
// };

export default class MinesweeperScene extends GridGameScene {
    constructor(engine) {
        // Load difficulties from engine config
        this.DIFFICULTY_LEVELS = engine.hatchConfig.difficultyLevels || {};
        const defaultDifficultyName = engine.hatchConfig.defaultDifficulty || Object.keys(this.DIFFICULTY_LEVELS)[0] || 'BEGINNER';
        const initialDifficulty = this.DIFFICULTY_LEVELS[defaultDifficultyName] || { cols: 9, rows: 9, mines: 10, name: 'FALLBACK_BEGINNER' };

        if (Object.keys(this.DIFFICULTY_LEVELS).length === 0) {
            getLogger('Minesweeper').warn('No difficultyLevels found in hatch.config.yaml. Using fallback.');
            // Define a minimal fallback if none are loaded
            this.DIFFICULTY_LEVELS = { FALLBACK_BEGINNER: initialDifficulty };
        }
        
        super(engine, { // GridConfig
            cols: initialDifficulty.cols,
            rows: initialDifficulty.rows,
            maxCellSize: 40,
            minCellSize: 20,
            margins: { top: 80, bottom: 80, left: 20, right: 20 },
            showGridLines: false, // Minesweeper cells usually have their own borders
            autoResize: true
        }, { // StateConfig
            configuration: StateConfiguration.createMinesweeperConfig(), // This now returns data-driven config
            enableAnimations: false, // Keep animations off for classic feel
            enableDebug: false
        });
        
        this.logger = getLogger('Minesweeper');
        this.difficulty = initialDifficulty;
        // this.gameState is now managed by GridGameScene's setGameState/getGameState
        this.mines = new Set(); // Stores "col,row" strings for mine locations
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.flagCount = 0;

        // Register custom cell renderers
        // These functions will be called by CellRenderer when a cell with
        // 'custom' type and matching 'renderKey' is encountered.
        if (this.cellRenderer) {
            this.cellRenderer.registerCustomRenderer('minesweeperRevealed', this.renderRevealedCellContent.bind(this));
            this.cellRenderer.registerCustomRenderer('minesweeperFlagged', this.renderFlaggedCellContent.bind(this));
        } else {
            this.logger.error("CellRenderer not available in MinesweeperScene constructor to register custom renderers.");
        }
    }

    init() {
        super.init(); // Calls initializeGrid, initializeStateSystem etc. from GridGameScene

        // Setup initial cell states (all hidden)
        this.resetGridForNewGame();

        // Set up input mappings using the new GridGameScene system
        // Ensure DIFFICULTY_LEVELS is accessible or pass names directly
        this.mapInput('KeyR', this.restartGame);
        if (this.DIFFICULTY_LEVELS.BEGINNER) this.mapInput('Digit1', () => this.changeDifficulty(this.DIFFICULTY_LEVELS.BEGINNER.name));
        if (this.DIFFICULTY_LEVELS.INTERMEDIATE) this.mapInput('Digit2', () => this.changeDifficulty(this.DIFFICULTY_LEVELS.INTERMEDIATE.name));
        if (this.DIFFICULTY_LEVELS.EXPERT) this.mapInput('Digit3', () => this.changeDifficulty(this.DIFFICULTY_LEVELS.EXPERT.name));
        // Note: H for instructions is handled by the engine's UIManager based on hatch.config.yaml

        // Make canvas focusable for keyboard inputs if not handled by engine
        if (this.engine.canvas) {
            this.engine.canvas.setAttribute('tabindex', '0'); // Allows canvas to receive focus
            // this.engine.canvas.focus(); // Optional: auto-focus on scene start
            this.engine.canvas.style.outline = 'none'; // Removes focus outline
        }

        // GridGameScene now sets gameState to 'ready' in its init.
        // If we need specific logic for Minesweeper's ready state:
        // this.setGameState('ready'); // This will call onEnterReadyState if defined
    }

    // Override GridGameScene's onCellInteraction to handle game logic
    onCellInteraction(col, row, action, event) {
        super.onCellInteraction(col, row, action, event); // Good practice to call super if it might do something

        if (this.isGameState('won') || this.isGameState('lost')) {
            if (action === 'click') { // Only restart on click if game is over
                this.restartGame();
            }
            return;
        }

        if (action === 'click') { // Left click
            this.handleCellClick(col, row);
        } else if (action === 'rightclick') { // Right click
            this.handleCellRightClick(col, row);
        }
    }


    resetGridForNewGame() {
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

    // Removed setupEventListeners as GridGameScene now handles basic click routing via onCellInteraction

    handleCellClick(col, row) {
        const cellState = this.getCellState(col, row); // Use getter from GridGameScene
        
        if (!cellState || cellState.state !== 'hidden' || cellState.data.flagged) { // Cannot click flagged cells
            return;
        }

        if (this.firstClick) {
            this.generateMines(col, row);
            this.calculateNeighborNumbers();
            this.firstClick = false;
            this.setGameState('playing'); // Use new game state method
            this.startTime = Date.now();
        }

        this.revealCell(col, row); // This will also update game state if mine is hit
        if (!this.isGameState('lost')) { // Only check for win if not lost
            this.checkGameEnd();
        }
    }

    handleCellRightClick(col, row) {
        const cellState = this.getCellState(col, row); // Use getter
        
        if (!cellState || cellState.state === 'revealed') { // Cannot flag/unflag revealed cells
            return;
        }

        const currentData = { ...cellState.data }; // Preserve existing data

        if (cellState.state === 'hidden') {
            currentData.flagged = true;
            this.setCellState(col, row, 'flagged', currentData); // Use setter
            this.flagCount++;
        } else if (cellState.state === 'flagged') {
            currentData.flagged = false;
            this.setCellState(col, row, 'hidden', currentData); // Use setter
            this.flagCount--;
        }
    }

    generateMines(avoidCol, avoidRow) {
        this.mines.clear();
        const availablePositions = [];
        
        for (let r = 0; r < this.gridConfig.rows; r++) {
            for (let c = 0; c < this.gridConfig.cols; c++) {
                if (c !== avoidCol || r !== avoidRow) {
                    availablePositions.push({ col: c, row: r });
                }
            }
        }
        
        let minesToPlace = this.difficulty.mines;
        while (minesToPlace > 0 && availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const { col, row } = availablePositions.splice(randomIndex, 1)[0];
            
            this.mines.add(`${col},${row}`);
            const cellState = this.getCellState(col, row);
            if (cellState) { // Should always exist after grid init
                const updatedData = { ...cellState.data, isMine: true };
                 // Keep current state ('hidden'), only update data
                this.setCellState(col, row, cellState.state, updatedData);
            }
            minesToPlace--;
        }
    }

    calculateNeighborNumbers() {
        for (let r = 0; r < this.gridConfig.rows; r++) {
            for (let c = 0; c < this.gridConfig.cols; c++) {
                const cellState = this.getCellState(c, r);
                if (cellState && !cellState.data.isMine) {
                    let mineCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nc = c + dx;
                            const nr = r + dy;
                            if (this.isValidPosition(nc, nr)) {
                                const neighborState = this.getCellState(nc, nr);
                                if (neighborState?.data?.isMine) {
                                    mineCount++;
                                }
                            }
                        }
                    }
                    // Update data directly on the existing cell state object if possible,
                    // or create new data object for setCellState
                    const updatedData = { ...cellState.data, neighborMines: mineCount };
                    this.setCellState(c, r, cellState.state, updatedData);
                }
            }
        }
    }

    revealCell(col, row) {
        const cellState = this.getCellState(col, row);
        
        // Don't reveal if already revealed or flagged
        if (!cellState || cellState.state === 'revealed' || cellState.data.flagged) {
            return;
        }

        const updatedData = { ...cellState.data, revealed: true, flagged: false };
        this.setCellState(col, row, 'revealed', updatedData);

        if (updatedData.isMine) {
            this.setGameState('lost', { triggeredMine: { col, row } }); // Pass info about the mine
            this.endTime = Date.now();
            this.revealAllMines();
            return;
        }

        if (cellState.data.neighborMines === 0) {
            this.floodFillReveal(col, row); // Use the GridGameScene's stateManager floodFill
        }
    }

    // This floodFillReveal is specific to Minesweeper's logic (revealing neighbors)
    // It's different from CellStateManager's floodFill which changes states.
    // We are revealing cells, which means changing their state to 'revealed'
    // and potentially adding their data.
    floodFillReveal(startCol, startRow) {
        const queue = [{ col: startCol, row: startRow }];
        const visited = new Set(); // To avoid processing the same cell multiple times

        while (queue.length > 0) {
            const { col, row } = queue.shift();
            const cellKey = `${col},${row}`;

            if (visited.has(cellKey)) continue;
            visited.add(cellKey);

            const cellState = this.getCellState(col, row);

            // Process only hidden, non-mine cells. If already revealed (e.g. by initial click), skip.
            // If it's flagged, it shouldn't be flood-filled.
            if (cellState && cellState.state === 'hidden' && !cellState.data.isMine && !cellState.data.flagged) {
                const updatedData = { ...cellState.data, revealed: true };
                this.setCellState(col, row, 'revealed', updatedData);

                // If this cell has 0 neighbor mines, add its neighbors to the queue
                if (updatedData.neighborMines === 0) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighborCol = col + dx;
                            const neighborRow = row + dy;

                            if (this.isValidPosition(neighborCol, neighborRow)) {
                                const neighborKey = `${neighborCol},${neighborRow}`;
                                if (!visited.has(neighborKey)) { // Only add if not already processed or in queue effectively
                                    const neighborCell = this.getCellState(neighborCol, neighborRow);
                                    // Ensure neighbor is hidden and not flagged before adding to queue
                                    if (neighborCell && neighborCell.state === 'hidden' && !neighborCell.data.flagged) {
                                        queue.push({ col: neighborCol, row: neighborRow });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    revealAllMines(triggeredMineCol, triggeredMineRow) {
        for (const mineKey of this.mines) {
            const [col, row] = mineKey.split(',').map(Number);
            const cellState = this.getCellState(col, row);
            
            if (cellState && (cellState.state === 'hidden' || cellState.state === 'flagged')) {
                const updatedData = {
                    ...cellState.data,
                    revealed: true,
                    // Mark the mine that ended the game for special rendering, if needed
                    gameOverMine: col === triggeredMineCol && row === triggeredMineRow
                };
                this.setCellState(col, row, 'revealed', updatedData);
            }
        }
    }

    checkGameEnd() {
        if (!this.isGameState('playing')) { // Use new game state check
            return;
        }

        let revealedNonMineCount = 0;
        const totalCells = this.gridConfig.cols * this.gridConfig.rows;
        
        for (let r = 0; r < this.gridConfig.rows; r++) {
            for (let c = 0; c < this.gridConfig.cols; c++) {
                const cellState = this.getCellState(c, r);
                if (cellState?.state === 'revealed' && !cellState.data.isMine) {
                    revealedNonMineCount++;
                }
            }
        }

        if (revealedNonMineCount === totalCells - this.difficulty.mines) {
            this.setGameState('won'); // Use new game state method
            this.endTime = Date.now();
            // Optionally, auto-flag remaining mines or other win effects
        }
    }

    isValidPosition(col, row) { // This helper is useful, keep it.
        return col >= 0 && col < this.gridConfig.cols && row >= 0 && row < this.gridConfig.rows;
    }

    // update(deltaTime) is handled by GridGameScene, which calls _processInputMappings
    // No need for handleKeyboardInput() anymore as inputs are mapped in init()

    // Game State Lifecycle Hooks (optional, called by setGameState)
    onEnterLostState(previousState, data) {
        this.logger.info('Game Over - Lost!', data);
        this.endTime = Date.now();
        if (data && data.triggeredMine) {
            this.revealAllMines(data.triggeredMine.col, data.triggeredMine.row);
        } else {
            this.revealAllMines();
        }
    }

    onEnterWonState(previousState, data) {
        this.logger.info('Game Over - Won!', data);
        this.endTime = Date.now();
        // Reveal all remaining mines as flags (or just reveal them)
        for (const mineKey of this.mines) {
            const [col, row] = mineKey.split(',').map(Number);
            const cellState = this.getCellState(col, row);
            if (cellState && (cellState.state === 'hidden')) {
                 this.setCellState(col, row, 'flagged', {...cellState.data, flagged: true });
                 this.flagCount++; // Ensure flag count is accurate for UI
            }
        }
    }

    onEnterReadyState(previousState, data){
        this.logger.info('Game Ready!', data);
        // This is called when scene starts or after a restart.
    }

    onEnterPlayingState(previousState, data){
        this.logger.info('Game Playing!', data);
         this.startTime = Date.now(); // Start timer when playing state begins
    }


    restartGame() {
        this.setGameState('ready'); // Use new game state method
        this.mines.clear();
        this.firstClick = true;
        this.startTime = null;
        this.endTime = null;
        this.flagCount = 0;
        this.resetGridForNewGame(); // Resets cell states and their data
        
        if (this.cellRenderer) {
            this.cellRenderer.clearAnimations(); // If any were somehow active
        }
        // Timer and firstClick are reset when 'playing' state is entered.
    }

    changeDifficulty(newDifficultyName) {
        const newDifficulty = this.DIFFICULTY_LEVELS[newDifficultyName]; // Use this.DIFFICULTY_LEVELS
        if (!newDifficulty) {
            this.logger.warn(`Unknown difficulty: ${newDifficultyName}`);
            return;
        }

        // It's possible this.difficulty might be undefined if config was bad, handle this.
        if (this.difficulty && this.difficulty.name === newDifficulty.name) {
            // If same difficulty, just restart the game
            this.restartGame();
            return;
        }
        
        this.difficulty = newDifficulty;

        // Update gridConfig in GridGameScene and re-initialize
        this.gridConfig.cols = this.difficulty.cols;
        this.gridConfig.rows = this.difficulty.rows;
        
        // GridGameScene's initializeGrid will be called, which also updates GridManager
        this.initializeGrid();

        // Scene's stateManager needs to be updated for new dimensions.
        // GridGameScene's initializeStateSystem can be called again if it handles this gracefully.
        // For now, let's assume it needs to be robust enough or we do it manually.
        // This might involve creating a new CellStateManager or resizing the existing one.
        // For simplicity, we'll re-initialize the state system.
        // The StateConfiguration itself (MinesweeperConfig) doesn't change with difficulty.
        if (this.stateConfig.configuration) {
            this.initializeStateSystem(this.stateConfig.configuration);
             // Re-register custom renderers as cellRenderer might be new
            if (this.cellRenderer) {
                this.cellRenderer.registerCustomRenderer('minesweeperRevealed', this.renderRevealedCellContent.bind(this));
                this.cellRenderer.registerCustomRenderer('minesweeperFlagged', this.renderFlaggedCellContent.bind(this));
            }
        }
        
        this.engine.gridManager = this.gridManager; // Ensure engine has the latest grid manager reference
        this.restartGame(); // This will set game to ready and reset cell states
    }

    // Custom rendering function for 'revealed' state
    renderRevealedCellContent(ctx, col, row, x, y, size, cellState, visualData, engine) {
        // visualData here is what was defined in StateConfiguration.createMinesweeperConfig().visuals.revealed
        const baseStyle = visualData.baseStyle || MINESWEEPER_CONSTANTS.COLORS; // Fallback

        // 1. Draw base revealed background (from visualData or constants)
        ctx.fillStyle = baseStyle.fill || MINESWEEPER_CONSTANTS.COLORS.REVEALED;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = baseStyle.stroke || MINESWEEPER_CONSTANTS.COLORS.BORDER;
        ctx.lineWidth = baseStyle.strokeWidth || Math.max(1, size * 0.02);
        ctx.strokeRect(x, y, size, size);

        // 2. Draw content (mine or number)
        const data = cellState.data;
        if (data && data.isMine) {
            if (data.gameOverMine) { // Highlight the mine that ended the game
                ctx.fillStyle = visualData.mineBackgroundColor || MINESWEEPER_CONSTANTS.COLORS.MINE_BG;
                ctx.fillRect(x, y, size, size); // Red background for the losing mine
                 // Redraw border on top of the red background
                ctx.strokeStyle = baseStyle.stroke || MINESWEEPER_CONSTANTS.COLORS.BORDER;
                ctx.lineWidth = baseStyle.strokeWidth || Math.max(1, size * 0.02);
                ctx.strokeRect(x, y, size, size);
            }

            const centerX = x + size / 2;
            const centerY = y + size / 2;
            const radius = size * (visualData.mineRadiusRatio || MINESWEEPER_CONSTANTS.SIZING.MINE_RADIUS_RATIO);

            ctx.fillStyle = visualData.mineColor || MINESWEEPER_CONSTANTS.COLORS.MINE_BLACK;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            const spikeLength = radius * (visualData.spikeLengthRatio || MINESWEEPER_CONSTANTS.SIZING.SPIKE_LENGTH_RATIO);
            ctx.strokeStyle = visualData.mineColor || MINESWEEPER_CONSTANTS.COLORS.MINE_BLACK;
            ctx.lineWidth = Math.max(MINESWEEPER_CONSTANTS.SIZING.MIN_LINE_WIDTH, size * 0.05);
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
                ctx.lineTo(centerX + Math.cos(angle) * (radius + spikeLength), centerY + Math.sin(angle) * (radius + spikeLength));
                ctx.stroke();
            }
        } else if (data && data.neighborMines > 0) {
            const number = data.neighborMines;
            const numberColors = visualData.numberColors || MINESWEEPER_CONSTANTS.COLORS.NUMBERS;
            ctx.fillStyle = numberColors[number] || numberColors[8]; // Fallback to color for '8'
            ctx.font = `bold ${Math.floor(size * (visualData.numberFontRatio || MINESWEEPER_CONSTANTS.SIZING.NUMBER_FONT_RATIO))}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(number.toString(), x + size / 2, y + size / 2 + size*0.05); // Minor Y offset for better centering
        }
    }

    // Custom rendering function for 'flagged' state
    renderFlaggedCellContent(ctx, col, row, x, y, size, cellState, visualData, engine) {
        // visualData from StateConfiguration.createMinesweeperConfig().visuals.flagged
        const baseStyle = visualData.baseStyle || MINESWEEPER_CONSTANTS.COLORS;

        // 1. Draw hidden background (as flags are on hidden cells)
        ctx.fillStyle = baseStyle.fill || MINESWEEPER_CONSTANTS.COLORS.HIDDEN;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = baseStyle.stroke || MINESWEEPER_CONSTANTS.COLORS.BORDER;
        ctx.lineWidth = baseStyle.strokeWidth || Math.max(1, size * 0.02);
        ctx.strokeRect(x, y, size, size);

        // 2. Draw flag
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const flagWidth = size * (visualData.flagWidthRatio || MINESWEEPER_CONSTANTS.SIZING.FLAG_WIDTH_RATIO);
        const flagHeight = size * (visualData.flagHeightRatio || MINESWEEPER_CONSTANTS.SIZING.FLAG_HEIGHT_RATIO);
        const poleHeight = size * (visualData.poleHeightRatio || MINESWEEPER_CONSTANTS.SIZING.POLE_HEIGHT_RATIO);

        ctx.strokeStyle = visualData.poleColor || MINESWEEPER_CONSTANTS.COLORS.FLAG_POLE;
        ctx.lineWidth = Math.max(MINESWEEPER_CONSTANTS.SIZING.MIN_LINE_WIDTH, size * 0.04);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - poleHeight / 2);
        ctx.lineTo(centerX, centerY + poleHeight / 2);
        ctx.stroke();

        ctx.fillStyle = visualData.flagColor || MINESWEEPER_CONSTANTS.COLORS.FLAG_RED;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - poleHeight / 2);
        ctx.lineTo(centerX + flagWidth, centerY - poleHeight / 2 + flagHeight / 3); // Adjusted for better triangle shape
        ctx.lineTo(centerX, centerY - poleHeight / 2 + (flagHeight * 2/3)); // Adjusted
        ctx.closePath();
        ctx.fill();
    }


    render(renderingEngine) {
        super.render(renderingEngine); // GridGameScene handles rendering the grid via CellRenderer
        this.renderUI(renderingEngine); // Minesweeper-specific UI overlays
    }

    renderUI(renderingEngine) {
        // This UI rendering logic remains largely the same, but uses this.getGameState()
        if (!renderingEngine || !renderingEngine.context || !renderingEngine.canvas) {
            return;
        }
        const ctx = renderingEngine.context;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI overlay

        const uiTopY = Math.max(20, this.gridOffsetY - 40); // Position above the grid
        const uiBottomY = this.gridOffsetY + (this.gridConfig.rows * this.cellSize) + 20; // Position below grid

        // Mines left display
        const minesLeft = this.difficulty.mines - this.flagCount;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Mines: ${minesLeft}`, this.gridOffsetX, uiTopY);

        // Time display
        let timeText = '00:00';
        if (this.startTime && (this.isGameState('playing') || this.isGameState('won') || this.isGameState('lost'))) {
            const now = this.isGameState('playing') ? Date.now() : (this.endTime || Date.now());
            const elapsed = now - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            timeText = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        ctx.textAlign = 'right';
        const gridActualWidth = this.gridConfig.cols * this.cellSize;
        ctx.fillText(`Time: ${timeText}`, this.gridOffsetX + gridActualWidth, uiTopY);

        // Game status message (Won/Lost)
        let statusText = '';
        let statusColor = '#000000';
        if (this.isGameState('won')) {
            statusText = 'You Win! Click to restart';
            statusColor = '#00AA00';
        } else if (this.isGameState('lost')) {
            statusText = 'Game Over! Click to restart';
            statusColor = '#CC0000';
        }

        if (statusText) {
            ctx.fillStyle = statusColor;
            ctx.textAlign = 'center';
            ctx.font = 'bold 18px Arial';
            const centerX = this.gridOffsetX + gridActualWidth / 2;
            ctx.fillText(statusText, centerX, uiBottomY);
        }

        // Difficulty display
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const centerX = this.gridOffsetX + gridActualWidth / 2;
        ctx.fillText(`Difficulty: ${this.difficulty.name} (${this.difficulty.cols}×${this.difficulty.rows})`, centerX, uiBottomY + 30);
        
        ctx.restore();
    }

    destroy() {
        // GridGameScene's destroy will handle unmapping inputs if we make it do so.
        // For now, manually clear if needed, or ensure GridGameScene does it.
        this.unmapInput(); // Clear all input mappings for this scene

        if (this.engine.gridManager === this.gridManager) { // Avoid issues if gridManager was replaced
            this.engine.gridManager = null;
        }
        super.destroy(); // Calls parent's destroy method
    }
}
