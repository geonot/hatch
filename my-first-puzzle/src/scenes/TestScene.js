/**
 * @file TestScene.js
 * @description A sample scene for testing basic functionality.
 */

import Scene from '../../../engine/scenes/Scene.js';
import Sprite from '../../../engine/rendering/Sprite.js';
import GridManager from '../../../engine/grid/GridManager.js';
import TileManager from '../../../engine/tiles/TileManager.js'; // Import TileManager

class TestScene extends Scene {
    constructor(engine) {
        super(engine);
        this.playerSprite = null; // Renamed from mySprite for clarity
        this.playerSpriteImage = null; // Renamed from spriteImage
        this.rotationSpeed = Math.PI / 2;
        this.message = "Welcome to TestScene with Tiles!";
        this.gridManager = null;
        this.tileManager = null; // Add TileManager instance
        this.selectedGridCellText = "";
    }

    /**
     * Load scene-specific assets.
     */
    async load() {
        // await super.load(); // Call if base Scene class has its own async load tasks
        console.log("TestScene: Loading assets...");
        try {
            this.playerSpriteImage = await this.assetManager.loadAsset({
                name: 'playerSprite', // More specific name for player asset
                path: 'assets/images/test-sprite.png', // Path relative to index.html
                type: 'image'
            });
            console.log("TestScene: Player assets loaded.");
            if (!this.playerSpriteImage) {
                 console.error("TestScene: Player sprite image failed to load.");
            }
            // Tile assets (grass.png, wall.png) will be loaded by TileManager on demand when createTile is called.
        } catch (error) {
            console.error("TestScene: Error loading player assets:", error);
        }
    }

    /**
     * Initialize scene state and objects.
     * @param {string} [customMessage] - An optional message passed from switchTo.
     */
    init(customMessage) {
        console.log("TestScene: init() called.");
        if (customMessage) {
            this.message = customMessage;
        }
        console.log("TestScene Message:", this.message);

        // Calculate offset to center the grid on the canvas as an example
        const tileW = 32, tileH = 32;
        const mapW = 10, mapH = 8;
        const gridTotalWidth = mapW * tileW;
        const gridTotalHeight = mapH * tileH;

        // Center grid in camera's initial view (0,0 world) if camera is centered
        // Or, more robustly, center on screen if camera might not be at 0,0
        // Assuming camera looks at 0,0 world and canvas is viewportWidth x viewportHeight
        // For now, let's assume the grid is placed relative to world origin 0,0
        // And the camera is also initially at 0,0
        // super.init(customMessage); // If Scene base class had init
        console.log("TestScene: init() called.");
        if (customMessage) {
            this.message = customMessage;
        }
        console.log("TestScene Message:", this.message);

        const tileW = 32, tileH = 32;
        const mapW = 10, mapH = 8;
        const gridTotalWidth = mapW * tileW;
        const gridTotalHeight = mapH * tileH;

        // Centering logic (same as before)
        // Assuming camera looks at 0,0 world for initial centering calculation.
        // If camera is moved, grid stays at this world position.
        const cam = this.renderingEngine.camera;
        const centeredOffsetX = (cam.viewportWidth - gridTotalWidth) / 2 - cam.viewportWidth / 2;
        const centeredOffsetY = (cam.viewportHeight - gridTotalHeight) / 2 - cam.viewportHeight / 2;

        this.gridManager = new GridManager({
            engine: this.engine,
            tileWidth: tileW, tileHeight: tileH,
            mapWidth: mapW, mapHeight: mapH,
            offsetX: centeredOffsetX + cam.x, // Adjust for camera's initial world position
            offsetY: centeredOffsetY + cam.y
        });
        console.log(`TestScene: GridManager created. Offset: (${this.gridManager.offsetX}, ${this.gridManager.offsetY})`);

        this.tileManager = new TileManager({ engine: this.engine, gridManager: this.gridManager });

        // Define tile types
        this.tileManager.defineTileType('empty', { color: '#222' }); // A dark color for empty space
        this.tileManager.defineTileType('grass', { spritePath: 'assets/images/grass.png', color: 'darkgreen', properties: { traversable: true } });
        this.tileManager.defineTileType('wall', { spritePath: 'assets/images/wall.png', color: 'saddlebrown', properties: { solid: true } });

        // IIFE to handle async tile creation within init
        (async () => {
            console.log("TestScene: Starting tile creation...");
            for (let r = 0; r < this.gridManager.mapHeight; r++) {
                for (let c = 0; c < this.gridManager.mapWidth; c++) {
                    if (c === 0 || c === this.gridManager.mapWidth - 1 || r === 0 || r === this.gridManager.mapHeight - 1 || (c === 5 && r > 1 && r < 6)) {
                        await this.tileManager.createTile('wall', c, r);
                    } else {
                        await this.tileManager.createTile('grass', c, r);
                    }
                }
            }
            console.log("TestScene: Tile creation complete.");

            // Place player sprite on a valid starting tile
            if (this.playerSpriteImage) {
                const startGridX = 1, startGridY = 1; // Ensure this is a 'grass' tile
                const worldPos = this.gridManager.gridToWorld(startGridX, startGridY, true); // Centered on the tile
                this.playerSprite = new Sprite({
                    image: this.playerSpriteImage,
                    x: worldPos.x,
                    y: worldPos.y,
                    width: tileW * 0.8, // Slightly smaller than tile
                    height: tileH * 0.8,
                    anchorX: 0.5, // Centered anchor for rotation
                    anchorY: 0.5
                });
                console.log("TestScene: Player sprite created at grid (" + startGridX + "," + startGridY + ").");
            } else {
                console.error("TestScene: Player sprite image not loaded, cannot create player sprite.");
            }
        })();
    }

    enter() {
        console.log("TestScene: Entered.");
        this.renderingEngine.clearDrawables(); // Ensure clean slate for this scene's drawables
    }

    exit() {
        console.log("TestScene: Exited.");
        if (this.tileManager) {
            this.tileManager.clearAllTiles(); // Example cleanup
        }
    }

    update(deltaTime) {
        if (this.playerSprite) {
            this.playerSprite.rotation += this.rotationSpeed * deltaTime;
        }

        if (this.inputManager.isMouseButtonJustPressed(0)) {
            const mousePos = this.inputManager.getMousePosition();
            const worldMousePos = this.renderingEngine.camera.screenToWorld(mousePos.x, mousePos.y);

            if (this.gridManager && this.tileManager) {
                const gridCoords = this.gridManager.worldToGrid(worldMousePos.x, worldMousePos.y);
                const tile = this.tileManager.getTileAt(gridCoords.x, gridCoords.y);

                if (tile) {
                    this.selectedGridCellText = `Clicked: (${gridCoords.x},${gridCoords.y}) Type: ${tile.type} Solid: ${tile.data.solid || false}`;
                    console.log(`TestScene: Clicked tile (${gridCoords.x},${gridCoords.y}), Type: ${tile.type}, Data:`, tile.data);
                    if (this.playerSprite && (!tile.data.solid && tile.data.traversable !== false)) { // Check for solid or explicitly non-traversable
                        const newSpritePos = this.gridManager.gridToWorld(gridCoords.x, gridCoords.y, true);
                        this.playerSprite.setPosition(newSpritePos.x, newSpritePos.y);
                    }
                } else {
                    this.selectedGridCellText = `Clicked: (${gridCoords.x},${gridCoords.y}) No tile data`;
                     console.log(`TestScene: Clicked empty or invalid grid cell (${gridCoords.x},${gridCoords.y})`);
                }
            }
        }
    }

    render(renderingEngine) {
        // It's good practice for the scene to clear drawables from the PREVIOUS frame if HatchEngine doesn't do it before SceneManager.render
        // However, current HatchEngine._loop does renderingEngine.clear() then scene.render() then RE.renderManagedDrawables().
        // And SceneManager clears drawables on switchTo. So this specific clearDrawables might be redundant here but safe.
        renderingEngine.clearDrawables();

        if (this.gridManager) {
            this.gridManager.renderGridLines(renderingEngine, 'rgba(100, 100, 100, 0.3)', 0.5); // Thinner, semi-transparent lines
        }

        if (this.tileManager) {
            this.tileManager.renderTiles(renderingEngine); // Adds all visible tiles to RE's drawable list
        }

        if (this.playerSprite && this.playerSprite.visible) {
            renderingEngine.add(this.playerSprite);
        }

        if (this.selectedGridCellText) {
            renderingEngine.context.save();
            renderingEngine.context.setTransform(this.renderingEngine.pixelRatio, 0, 0, this.renderingEngine.pixelRatio, 0, 0);
            renderingEngine.drawText(this.selectedGridCellText, 10, this.renderingEngine.height - 10, "12px Arial", "white", "left", "bottom");
            renderingEngine.context.restore();
        }
    }

    destroy() {
        console.log("TestScene: Destroyed.");
        this.playerSprite = null;
        this.playerSpriteImage = null;
        if (this.tileManager) {
            this.tileManager.clearAllTiles();
            this.tileManager = null;
        }
        this.gridManager = null;
    }
}

export default TestScene;
