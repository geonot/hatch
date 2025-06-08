/**
 * @fileoverview Phase 1 Demo for the Hatch Game Engine.
 * Demonstrates basic instantiation and interaction of core engine components.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Phase 1 Demo: DOMContentLoaded");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Phase 1 Demo: Canvas element #gameCanvas not found!");
        return;
    }

    // 1. Initialize Engine
    // -------------------------------------------------------------------------
    let engine;
    try {
        engine = new HatchEngine({
            canvas: canvas,
            width: 400, // Desired canvas width
            height: 300, // Desired canvas height
            targetFPS: 60
        });
        console.log("Phase 1 Demo: HatchEngine instantiated.");
    } catch (e) {
        console.error("Phase 1 Demo: Error instantiating HatchEngine:", e);
        return;
    }

    // Manually assign and initialize managers to the engine instance
    // This is how the stubs were implicitly designed to be integrated.
    try {
        engine.inputManager = new InputManager(engine);
        engine.assetManager = new AssetManager(engine);
        engine.gridManager = new GridManager(engine);
        engine.tileManager = new TileManager(engine);
        engine.renderingEngine = new RenderingEngine(engine); // RenderingEngine constructor takes engine

        // Initialize managers
        engine.inputManager.init();
        await engine.assetManager.init(); // assetManager.init is async in stub
        engine.gridManager.init();
        engine.tileManager.init();
        engine.renderingEngine.init(); // renderingEngine.init is sync in stub

        console.log("Phase 1 Demo: All managers instantiated and initialized.");
    } catch (e) {
        console.error("Phase 1 Demo: Error instantiating or initializing managers:", e);
        return;
    }


    // 2. Game Setup (Assets, Grid, Tiles)
    // -------------------------------------------------------------------------
    const GRID_COLS = 8;
    const GRID_ROWS = 6;
    const CELL_SIZE = 50; // Canvas width should be GRID_COLS * CELL_SIZE, height GRID_ROWS * CELL_SIZE

    canvas.width = GRID_COLS * CELL_SIZE;
    canvas.height = GRID_ROWS * CELL_SIZE;
    engine.resize(canvas.width, canvas.height); // Inform engine of new canvas size

    // Placeholder image (1x1 red pixel as a Data URI)
    const placeholderRedTileURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const placeholderGreenTileURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA células DUlEQVR42mNk+A/wHwMyASPJAhQAAAAASUVORK5CYII="; // Green

    async function setupGame() {
        console.log("Phase 1 Demo: setupGame() started.");
        try {
            // Load assets
            await engine.assetManager.loadImage(placeholderRedTileURI, "redTile");
            await engine.assetManager.loadImage(placeholderGreenTileURI, "greenTile");
            console.log("Phase 1 Demo: Placeholder assets loaded.");

            // Define tile types
            engine.tileManager.defineTileType("wall", {
                imageName: "redTile", // Use the loaded asset name
                solid: true,
                description: "A solid red wall tile"
            });
            engine.tileManager.defineTileType("floor", {
                imageName: "greenTile", // Use the loaded asset name
                solid: false,
                description: "A passable green floor tile"
            });
            engine.tileManager.defineTileType("empty", {
                color: "#FAFAFA", // A light color for empty cells if no image
                description: "An empty tile"
            });
            console.log("Phase 1 Demo: Tile types defined.");

            // Create grid
            engine.gridManager.createSquareGrid(GRID_COLS, GRID_ROWS, CELL_SIZE, (col, row) => {
                // Initialize all as 'empty' by default
                return { typeName: 'empty', col, row, color: '#FAFAFA' };
            });
            console.log("Phase 1 Demo: Grid created.");

            // Place some tiles
            engine.tileManager.createTile("wall", 0, 0);
            engine.tileManager.createTile("wall", 1, 0);
            engine.tileManager.createTile("wall", 0, 1);
            engine.tileManager.createTile("floor", 1, 1);
            engine.tileManager.createTile("floor", 2, 2);
            engine.tileManager.createTile("wall", GRID_COLS - 1, GRID_ROWS - 1);

            // Place a floor tile that will be queried by click
            engine.tileManager.createTile("floor", 3,3, {isSpecial: true});

            console.log("Phase 1 Demo: Initial tiles placed.");
            console.log("Phase 1 Demo: setupGame() completed.");

        } catch (error) {
            console.error("Phase 1 Demo: Error during game setup:", error);
            engine.errorHandler.handleError(error, { phase: "setupGame" });
        }
    }


    // 3. Game Loop (Update and Render customization)
    // -------------------------------------------------------------------------

    // We can override the engine's update and render methods for the demo,
    // or listen to 'engineUpdate' and 'engineRender' events.
    // For simplicity in the stub, let's try overriding.

    const originalEngineUpdate = engine.update.bind(engine);
    engine.update = function(deltaTime) {
        originalEngineUpdate(deltaTime); // Call base engine update first (if it does anything)

        // Call input manager's update at the beginning of our game update logic
        if (this.inputManager) {
            this.inputManager.update(deltaTime);
        }

        // Demo specific update logic here (if any)
        // For example, check for input
        if (this.inputManager && this.inputManager.isMouseButtonJustPressed(0)) { // Left click
            const mousePos = this.inputManager.getMousePosition();
            if (this.gridManager && this.gridManager.getActiveGrid()) {
                const gridCoords = this.gridManager.screenToGrid(mousePos.x, mousePos.y);
                if (gridCoords && this.gridManager.isValidPosition(gridCoords.col, gridCoords.row)) {
                    const tile = this.gridManager.getTile(gridCoords.col, gridCoords.row);
                    console.log(`Clicked on grid cell: (${gridCoords.col}, ${gridCoords.row})`, "Tile data:", tile);

                    // Example of using ErrorHandler
                    if (tile && tile.typeName === 'wall') {
                        try {
                            // throw new Error("Clicked on a wall!"); // Test error
                        } catch (e) {
                            this.errorHandler.handleError(e, {action: "clickWall", coords: gridCoords});
                        }
                    }
                }
            }
        }
    };

    const originalEngineRender = engine.render.bind(engine);
    engine.render = function() {
        originalEngineRender(); // Call base engine render (if it does anything)

        if (!this.renderingEngine || !this.gridManager || !this.tileManager) {
            console.warn("Phase 1 Demo: Render called before managers are fully ready.");
            return;
        }

        this.renderingEngine.clear();

        const activeGrid = this.gridManager.getActiveGrid();
        if (activeGrid) {
            // Render grid lines
            this.renderingEngine.renderGrid(activeGrid, { lineColor: '#DDDDDD' });

            // Render tiles: activeGrid.data is the 2D array of tile instances
            this.renderingEngine.renderTiles(activeGrid.data, activeGrid, this.assetManager);
        }

        // Add FPS counter (simple version)
        // this.renderingEngine.renderDebugInfo({ fps: 1000 / this.deltaTime }); // This might be too noisy
    };


    // 4. Start the Engine
    // -------------------------------------------------------------------------
    await setupGame(); // Ensure setup is complete before starting engine

    try {
        await engine.init(); // Engine init
        engine.start();
        console.log("Phase 1 Demo: HatchEngine started.");
    } catch (err) {
        console.error("Phase 1 Demo: Error during engine.init() or start():", err);
        if (engine.errorHandler) { // Check if errorHandler itself is initialized
            engine.errorHandler.handleError(err, { phase: "engine.init/start" });
        }
    }
});
