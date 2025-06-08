/**
 * @fileoverview Basic asset manager for the Hatch engine, focusing on image loading for Phase 1.
 */

class AssetManager {
    constructor(engine) {
        this.engine = engine; // For event system or other context if needed
        this.assets = new Map(); // Stores loaded assets (name -> asset object)
        this.loadPromises = new Map(); // Stores promises for assets currently being loaded (name -> Promise)

        // More advanced features from spec (not for this stub but good to remember):
        // this.assetGroups = new Map();
        // this.loadingQueue = [];
        // this.isLoading = false;
        // this.loadProgress = 0;
        // ... etc.

        console.info("AssetManager initialized.");
        this.engine.eventSystem.emit('assetManagerConstructed', { manager: this }, true);
    }

    /**
     * Initializes the AssetManager.
     * For this stub, it doesn't do much.
     */
    async init() {
        console.log("AssetManager.init() called.");
        // In a real system, might preload common assets or setup cache
        this.engine.eventSystem.emit('assetManagerInitialized', { manager: this }, true);
    }

    /**
     * Loads an image asset.
     * @param {string} path The path to the image file.
     * @param {string} name The name to assign to the loaded asset. If null, path is used.
     * @param {object} [options={}] Additional options for loading.
     * @returns {Promise<Image>} A promise that resolves with the loaded Image object or rejects on error.
     */
    async loadImage(path, name = null, options = {}) {
        const assetName = name || path;

        if (this.assets.has(assetName)) {
            // console.log(`Asset '${assetName}' already loaded, returning cached version.`);
            return Promise.resolve(this.assets.get(assetName));
        }

        if (this.loadPromises.has(assetName)) {
            // console.log(`Asset '${assetName}' is already being loaded, returning existing promise.`);
            return this.loadPromises.get(assetName);
        }

        // Check for browser environment for Image object
        if (typeof Image === 'undefined') {
            const errorMsg = "Image object not available. Cannot load images in this environment.";
            console.error(`AssetManager: ${errorMsg} (Path: ${path})`);
            this.engine.eventSystem.emit('engineError', { error: new Error(errorMsg), context: `AssetManager.loadImage: ${path}`});
            return Promise.reject(new Error(errorMsg));
        }

        console.log(`Loading image: '${path}' as '${assetName}'`);
        this.engine.eventSystem.emit('assetLoadStart', { name: assetName, path: path, type: 'image' }, true);

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            const { crossOrigin = 'anonymous', timeout = 30000 } = options; // Timeout from spec

            img.crossOrigin = crossOrigin;

            let timeoutId = null;
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    const error = new Error(`Image load timeout: ${path}`);
                    this.engine.eventSystem.emit('assetLoadError', { name: assetName, path: path, type: 'image', error: error.message }, true);
                    this.loadPromises.delete(assetName); // Clean up promise
                    reject(error);
                }, timeout);
            }

            img.onload = () => {
                if (timeoutId) clearTimeout(timeoutId);
                this.assets.set(assetName, img);
                this.loadPromises.delete(assetName); // Clean up promise
                console.log(`Image '${assetName}' loaded successfully (${img.width}x${img.height}).`);
                this.engine.eventSystem.emit('assetLoadComplete', { name: assetName, path: path, type: 'image', asset: img }, true);
                resolve(img);
            };

            img.onerror = (err) => {
                if (timeoutId) clearTimeout(timeoutId);
                const error = new Error(`Failed to load image: ${path}. Error event: ${err}`);
                console.error(error.message);
                this.engine.eventSystem.emit('assetLoadError', { name: assetName, path: path, type: 'image', error: error.message }, true);
                this.loadPromises.delete(assetName); // Clean up promise
                reject(error);
            };

            img.src = path;
        });

        this.loadPromises.set(assetName, promise);
        return promise;
    }

    /**
     * Retrieves a loaded asset by its name.
     * @param {string} name The name of the asset.
     * @returns {any | null} The loaded asset, or null if not found.
     */
    getAsset(name) {
        if (this.assets.has(name)) {
            return this.assets.get(name);
        }
        // console.warn(`Asset '${name}' not found.`);
        return null;
    }

    /**
     * Retrieves a loaded image asset. Alias for getAsset for clarity.
     * @param {string} name The name of the image asset.
     * @returns {Image | null} The loaded Image object, or null if not found or not an image.
     */
    getImage(name) {
        const asset = this.getAsset(name);
        if (asset && asset instanceof Image) {
            return asset;
        }
        if (asset) {
            // console.warn(`Asset '${name}' found but is not an Image.`);
        }
        return null;
    }

    /**
     * Unloads an asset, removing it from the manager.
     * @param {string} name The name of the asset to unload.
     * @returns {boolean} True if the asset was found and unloaded, false otherwise.
     */
    unloadAsset(name) {
        if (this.assets.has(name)) {
            const asset = this.assets.get(name);
            // Spec mentions asset.close() for ImageBitmap, not directly applicable for basic Image object
            // but good to keep in mind for future enhancements.
            this.assets.delete(name);
            this.loadPromises.delete(name); // Also remove any pending load promise
            console.log(`Asset '${name}' unloaded.`);
            this.engine.eventSystem.emit('assetUnloaded', { name: name, asset: asset }, true);
            return true;
        }
        // console.warn(`Attempted to unload asset '${name}', but it was not found.`);
        return false;
    }

    /**
     * Clears all loaded assets.
     */
    unloadAllAssets() {
        const unloadedNames = Array.from(this.assets.keys());
        this.assets.clear();
        this.loadPromises.clear(); // Clear all pending promises as well
        console.log(`All (${unloadedNames.length}) assets unloaded.`);
        this.engine.eventSystem.emit('allAssetsUnloaded', { unloadedNames: unloadedNames }, true);
    }

    /**
     * Placeholder for destroying the AssetManager.
     */
    destroy() {
        console.log("AssetManager.destroy() called.");
        this.unloadAllAssets();
        // Any other specific cleanup for AssetManager
        this.engine.eventSystem.emit('assetManagerDestroyed', { manager: this }, true);
    }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetManager;
}
