/**
 * @fileoverview Basic TileManager for the Hatch engine for Phase 1.
 * Handles tile type definitions and placing tiles onto a grid.
 */

class TileManager {
    constructor(engine) {
        this.engine = engine;
        this.tileTypes = new Map(); // Stores definitions for tile types (typeName -> properties)

        console.info("TileManager initialized.");
        this.engine.eventSystem.emit('tileManagerConstructed', { manager: this }, true);
    }

    /**
     * Initializes the TileManager.
     */
    init() {
        console.log("TileManager.init() called.");
        // Could load default tile types from a configuration file in a real system.
        this.engine.eventSystem.emit('tileManagerInitialized', { manager: this }, true);
    }

    /**
     * Defines a new type of tile.
     * @param {string} name - The unique name for this tile type (e.g., 'wall', 'floor', 'playerStart').
     * @param {Object} properties - An object containing properties for this tile type.
     *                              Examples: { color: 'red', imageName: 'wall_sprite.png', solid: true, customData: {} }
     * @returns {boolean} True if the tile type was defined successfully, false if name is missing or already exists.
     */
    defineTileType(name, properties = {}) {
        if (!name) {
            console.error("TileManager.defineTileType: Tile type name cannot be empty.");
            return false;
        }
        if (this.tileTypes.has(name)) {
            console.warn(`TileManager.defineTileType: Tile type '${name}' already exists. Overwriting.`);
            // Allow overwriting for flexibility during development, or return false for stricter control.
        }

        this.tileTypes.set(name, { ...properties, typeName: name }); // Ensure typeName is part of properties
        console.log(`Tile type '${name}' defined with properties:`, properties);
        this.engine.eventSystem.emit('tileTypeDefined', { name, properties }, true);
        return true;
    }

    /**
     * Gets the properties for a defined tile type.
     * @param {string} name - The name of the tile type.
     * @returns {Object | null} The properties object for the tile type, or null if not found.
     */
    getTileType(name) {
        if (!this.tileTypes.has(name)) {
            // console.warn(`TileManager.getTileType: Tile type '${name}' not found.`);
            return null;
        }
        return this.tileTypes.get(name);
    }

    /**
     * Creates a tile instance of a given type and places it on the active grid.
     * @param {string} typeName - The name of the tile type to create (must be predefined).
     * @param {number} gridCol - The grid column where the tile should be placed.
     * @param {number} gridRow - The grid row where the tile should be placed.
     * @param {Object} [instanceProperties={}] - Optional properties to add to or override on this specific instance.
     * @returns {Object | null} The created tile instance object that was placed on the grid,
     *                          or null if the type is not defined or placement fails.
     */
    createTile(typeName, gridCol, gridRow, instanceProperties = {}) {
        const typeDefinition = this.getTileType(typeName);
        if (!typeDefinition) {
            console.error(`TileManager.createTile: Tile type '${typeName}' is not defined.`);
            return null;
        }

        if (!this.engine.gridManager) {
            console.error("TileManager.createTile: GridManager is not available on the engine.");
            return null;
        }

        const activeGrid = this.engine.gridManager.getActiveGrid();
        if (!activeGrid) {
            console.warn("TileManager.createTile: No active grid in GridManager.");
            return null;
        }

        // Create the tile instance by combining type definition and instance-specific properties
        const tileInstance = {
            ...typeDefinition, // Base properties from type definition
            col: gridCol,      // Grid position
            row: gridRow,
            ...instanceProperties // Instance-specific overrides or additions
        };
        // Ensure 'typeName' is correctly set if not already by typeDefinition spread
        tileInstance.typeName = typeName;

        const success = this.engine.gridManager.setTile(gridCol, gridRow, tileInstance);
        if (success) {
            // console.log(`Tile '${typeName}' created and placed at (${gridCol}, ${gridRow}).`);
            this.engine.eventSystem.emit('tileCreated', { tile: tileInstance, col: gridCol, row: gridRow }, true);
            return tileInstance;
        } else {
            console.warn(`TileManager.createTile: Failed to place tile '${typeName}' at (${gridCol}, ${gridRow}) via GridManager.`);
            return null;
        }
    }

    /**
     * Removes a tile from a specified grid location.
     * This essentially sets the grid cell at (gridCol, gridRow) to null or an empty state.
     * @param {number} gridCol - The column of the tile to remove.
     * @param {number} gridRow - The row of the tile to remove.
     * @returns {boolean} True if the tile was successfully "removed" (cell set to null), false otherwise.
     */
    removeTile(gridCol, gridRow) {
        if (!this.engine.gridManager) {
            console.error("TileManager.removeTile: GridManager is not available on the engine.");
            return false;
        }
        const removedTile = this.engine.gridManager.getTile(gridCol, gridRow);
        const success = this.engine.gridManager.setTile(gridCol, gridRow, null); // Set to null to "remove"
        if (success) {
            this.engine.eventSystem.emit('tileRemoved', { col: gridCol, row: gridRow, removedTile: removedTile }, true);
            // console.log(`Tile removed from (${gridCol}, ${gridRow}).`);
        }
        return success;
    }


    /**
     * Destroys the TileManager, cleaning up resources.
     */
    destroy() {
        console.log("TileManager.destroy() called.");
        this.tileTypes.clear();
        // Any other specific cleanup
        this.engine.eventSystem.emit('tileManagerDestroyed', { manager: this }, true);
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileManager;
}
