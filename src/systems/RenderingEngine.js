/**
 * @fileoverview Basic RenderingEngine for the Hatch engine using Canvas2D for Phase 1.
 */

class RenderingEngine {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx; // Assumes HatchEngine passes its context

        if (!this.canvas || !this.ctx) {
            const errorMsg = "RenderingEngine: Canvas or 2D context is not available from the engine.";
            console.error(errorMsg);
            this.engine.eventSystem.emit('engineError', { error: new Error(errorMsg), context: "RenderingEngine Constructor" });
            throw new Error(errorMsg);
        }

        // Advanced features from spec (not for this stub):
        // this.dirtyRectManager = new DirtyRectManager();
        // this.renderBatcher = new RenderBatcher();
        // this.cullManager = new CullManager();
        // this.layers = new Map();
        // this.camera = new Camera();
        // this.viewport = new Viewport();

        console.info("RenderingEngine initialized.");
        this.engine.eventSystem.emit('renderingEngineConstructed', { engine: this.engine, renderer: this }, true);
    }

    /**
     * Initializes the RenderingEngine.
     */
    init() {
        console.log("RenderingEngine.init() called.");
        // Potential setup: default styles, etc.
        this.ctx.strokeStyle = "#ccc"; // Default grid line color
        this.ctx.fillStyle = "#f0f0f0";   // Default tile color
        this.ctx.lineWidth = 1;
        this.engine.eventSystem.emit('renderingEngineInitialized', { renderer: this }, true);
    }

    /**
     * Clears the entire canvas.
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // console.log("Canvas cleared by RenderingEngine.");
    }

    /**
     * Main render method called by the HatchEngine.
     * For Phase 1, this might just call clear, or delegate to more specific render methods
     * if the SceneManager/current scene logic was more developed.
     * For now, it's a placeholder or can be used to orchestrate stub rendering.
     */
    render() {
        // This method would typically be called by HatchEngine.render()
        // and would orchestrate the rendering of the current scene's contents.
        // For the stub, we'll assume specific render methods are called directly by game logic if needed,
        // or this method is called and it decides what to draw.
        // console.log("RenderingEngine.render() called by main engine loop.");
        // Example: this.clear(); // Often the first step in a render cycle
    }


    /**
     * Renders a grid structure.
     * For this stub, it draws simple lines.
     * @param {Object} grid - The grid object from GridManager. Expected to have properties like:
     *                        `width` (number of columns), `height` (number of rows),
     *                        `cellSize` (size of each cell in pixels).
     * @param {Object} [options={}] - Rendering options.
     * @param {string} [options.lineColor='#CCCCCC'] - Color of the grid lines.
     * @param {number} [options.lineWidth=1] - Width of the grid lines.
     */
    renderGrid(grid, options = {}) {
        if (!grid || !grid.width || !grid.height || !grid.cellSize) {
            console.warn("RenderingEngine.renderGrid: Invalid grid data provided.");
            return;
        }

        const { lineColor = '#CCCCCC', lineWidth = 1 } = options;
        const { width: numCols, height: numRows, cellSize } = grid;

        const totalWidth = numCols * cellSize;
        const totalHeight = numRows * cellSize;

        this.ctx.save();
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = lineWidth;

        // Draw vertical lines
        for (let i = 0; i <= numCols; i++) {
            const x = i * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, totalHeight);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let j = 0; j <= numRows; j++) {
            const y = j * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(totalWidth, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
        // console.log(`Grid rendered: ${numCols}x${numRows}, cell size ${cellSize}`);
    }

    /**
     * Renders tiles on the grid.
     * For this stub, it draws colored rectangles or simple images if assetManager is provided.
     * @param {Array<Array<Object>>} tilesData - A 2D array representing the grid's tiles.
     *                                          Each tile object could have { x, y, type, color, imageName, ... }.
     * @param {Object} gridConfig - Config for the grid { cellSize, ... }.
     * @param {AssetManager} [assetManager=null] - Optional. The asset manager to fetch images.
     */
    renderTiles(tilesData, gridConfig, assetManager = null) {
        if (!tilesData || !gridConfig || !gridConfig.cellSize) {
            console.warn("RenderingEngine.renderTiles: Invalid tilesData or gridConfig provided.");
            return;
        }

        const { cellSize } = gridConfig;

        this.ctx.save();
        for (let r = 0; r < tilesData.length; r++) { // Assuming tilesData is row-major: [row][col]
            for (let c = 0; c < tilesData[r].length; c++) {
                const tile = tilesData[r][c]; // tile object for grid cell [r][c]
                if (tile) { // If null/undefined, cell is empty
                    const screenX = c * cellSize; // tile.x refers to grid col index
                    const screenY = r * cellSize; // tile.y refers to grid row index

                    if (tile.imageName && assetManager) {
                        const image = assetManager.getImage(tile.imageName);
                        if (image) {
                            this.ctx.drawImage(image, screenX, screenY, cellSize, cellSize);
                        } else {
                            // Fallback if image not found or not loaded
                            this.ctx.fillStyle = tile.color || '#FF00FF'; // Magenta for missing image
                            this.ctx.fillRect(screenX, screenY, cellSize, cellSize);
                            // console.warn(`Image '${tile.imageName}' not found for tile at (${c},${r}). Drawing fallback.`);
                        }
                    } else if (tile.color) {
                        this.ctx.fillStyle = tile.color;
                        this.ctx.fillRect(screenX, screenY, cellSize, cellSize);
                    } else {
                        // Default representation if no color or image
                        // this.ctx.strokeStyle = '#E0E0E0';
                        // this.ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                    }
                }
            }
        }
        this.ctx.restore();
        // console.log("Tiles rendered.");
    }

    /**
     * Renders a single sprite or image.
     * @param {Image} image - The image object to render.
     * @param {number} x - The x-coordinate on the canvas.
     * @param {number} y - The y-coordinate on the canvas.
     * @param {number} [width] - Optional width to draw the image. Defaults to image width.
     * @param {number} [height] - Optional height to draw the image. Defaults to image height.
     */
    renderSprite(image, x, y, width, height) {
        if (!image) {
            console.warn("RenderingEngine.renderSprite: Image is null or undefined.");
            return;
        }
        const w = width || image.width;
        const h = height || image.height;
        this.ctx.drawImage(image, x, y, w, h);
    }

    /**
     * Placeholder for debug rendering (e.g., bounding boxes, FPS).
     */
    renderDebugInfo(debugData = {}) {
        // Example: Display FPS
        // if (debugData.fps) {
        //     this.ctx.save();
        //     this.ctx.fillStyle = "black";
        //     this.ctx.font = "16px Arial";
        //     this.ctx.fillText(`FPS: ${debugData.fps.toFixed(2)}`, 10, 20);
        //     this.ctx.restore();
        // }
        // console.log("RenderingEngine.renderDebugInfo called with data:", debugData);
    }

    /**
     * Destroys the RenderingEngine, cleaning up resources.
     */
    destroy() {
        console.log("RenderingEngine.destroy() called.");
        // No specific resources to clean for this basic stub (canvas/ctx owned by HatchEngine)
        this.engine.eventSystem.emit('renderingEngineDestroyed', { renderer: this }, true);
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderingEngine;
}
