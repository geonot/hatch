import { Scene } from '/engine/core/Scene.js';
import { GridManager } from '/engine/grid/GridManager.js';
import { TileManager } from '/engine/tiles/TileManager.js';
import { InputEvents } from '/engine/core/Constants.js';

export class GridTestScene extends Scene {
    constructor(engine) {
        super(engine, 'GridTestScene');
        this.gridManager = null;
        this.tileManager = null;
        this.onGridMouseDown = null;
    }

    async load() {
        this.engine.errorHandler.info('GridTestScene: Loading assets...', { component: 'GridTestScene' });
        // AssetManager should load manifests defined in hatch.config.yaml or via direct calls
        // For this test, assume simpleAtlas is loaded if defined in hatch.config.yaml's manifest
        // or ensure it's loaded before switching to this scene.
        // If hatch.config.yaml does not specify a manifest, we might need to load it here.
        // The main.js will attempt to load simpleAtlas as a fallback.
    }

    init() {
        this.engine.errorHandler.info('GridTestScene: Initializing...', { component: 'GridTestScene' });

        const gridConfig = {
            numCols: 10,
            numRows: 8,
            tileWidth: 32,
            tileHeight: 32,
            showGridLines: true
        };
        this.gridManager = new GridManager(this.engine, gridConfig);
        this.tileManager = new TileManager(this.engine, this.gridManager);

        // Define tile types
        this.tileManager.defineTileType('light', {
            atlasName: 'simpleAtlas',
            frameName: 'tile_light', // Adjusted frame name
            isInteractive: true
        });
        this.tileManager.defineTileType('dark', {
            atlasName: 'simpleAtlas',
            frameName: 'tile_dark', // Adjusted frame name
            isInteractive: false
        });

        // Create tiles
        for (let r = 0; r < this.gridManager.numRows; r++) {
            for (let c = 0; c < this.gridManager.numCols; c++) {
                const type = (r + c) % 2 === 0 ? 'light' : 'dark';
                this.tileManager.createTile(type, c, r);
            }
        }

        // Set this scene's grid manager as the active one for the engine (for debug overlay)
        this.engine.gridManager = this.gridManager;

        // Event listeners for grid interaction
        this.onGridMouseDown = this.handleGridMouseDown.bind(this);
        this.engine.eventBus.on(InputEvents.GRID_MOUSEDOWN, this.onGridMouseDown);

        this.engine.errorHandler.info('GridTestScene: Initialized with grid and tiles.', { component: 'GridTestScene' });
    }

    handleGridMouseDown({ gridX, gridY, button, screenX, screenY }) {
        this.engine.errorHandler.info(
            `GridTestScene: Grid mouse down at (${gridX}, ${gridY}), button: ${button}`,
            { component: 'GridTestScene', method: 'handleGridMouseDown' }
        );
        const tile = this.tileManager.getTile(gridX, gridY);
        if (tile) {
            const typeProps = this.tileManager.getTileTypeProperties(tile.type);
            if (typeProps && typeProps.isInteractive) {
                // Example interaction: toggle tile type
                const newType = tile.type === 'light' ? 'dark' : 'light';
                // Clear old sprite instance if it exists
                if (tile.data && tile.data.spriteInstance) {
                    tile.data.spriteInstance = null;
                }
                this.tileManager.createTile(newType, gridX, gridY, tile.data);
                this.engine.errorHandler.info(`Toggled tile at (${gridX},${gridY}) to ${newType}`, { component: 'GridTestScene' });
            }
        }
    }

    update(deltaTime) {
        // Scene-specific updates if any
    }

    render(renderingEngine) {
        if (this.gridManager) {
            this.gridManager.renderGridLines(renderingEngine);
        }
        if (this.tileManager) {
            this.tileManager.renderTiles(renderingEngine);
        }
    }

    exit() {
        this.engine.errorHandler.info('GridTestScene: Exiting...', { component: 'GridTestScene' });
        if (this.onGridMouseDown) {
            this.engine.eventBus.off(InputEvents.GRID_MOUSEDOWN, this.onGridMouseDown);
        }
        // Clear the engine's gridManager reference if it was set by this scene
        if (this.engine.gridManager === this.gridManager) {
            this.engine.gridManager = null;
        }
    }

    destroy() {
        this.engine.errorHandler.info('GridTestScene: Destroying...', { component: 'GridTestScene' });
        if (this.tileManager) this.tileManager.clearAll(); // This should also handle clearing sprites on tiles if any
        this.gridManager = null;
        this.tileManager = null;
        // Note: sprite instances on tiles are in tile.data.spriteInstance.
        // TileManager.clearAll() clears the 'tiles' map. If sprites need explicit destruction
        // (e.g. removing from a global rendering list if they were added there permanently),
        // TileManager.clearAll or a Tile.destroy() method would need to handle that.
        // For now, sprites are added to renderingEngine on each frame in TileManager.renderTiles,
        // so direct cleanup of sprites from RE isn't needed here if TileManager stops rendering them.
    }
}
