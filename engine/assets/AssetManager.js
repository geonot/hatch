/**
 * @file AssetManager.js
 * @description Manages the loading, storage, and retrieval of game assets such as images,
 * audio files, and JSON data. It supports caching loaded assets and prevents
 * redundant loading of assets already in memory or in the process of being loaded.
 */

/**
 * @class AssetManager
 * @classdesc Handles asynchronous loading and caching of game assets.
 * It provides methods to load individual assets or asset manifests.
 * Errors during loading are delegated to the engine's ErrorHandler.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
 * @property {Map<string, any>} assets - A cache for successfully loaded assets, keyed by their unique name.
 * @property {Map<string, Promise<any>>} promises - A map to store promises for assets currently being loaded,
 *                                                 keyed by asset name. This prevents duplicate load attempts.
 */
class AssetManager {
    /**
     * Creates an instance of AssetManager.
     * @param {import('../core/HatchEngine.js').default} engine - A reference to the HatchEngine instance.
     *        Used for accessing other engine systems like ErrorHandler.
     */
    constructor(engine) {
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {Map<string, any>} Stores loaded assets, keyed by name. */
        this.assets = new Map();
        /** @type {Map<string, Promise<any>>} Stores promises for assets currently loading, keyed by name. */
        this.promises = new Map();
        console.log("AssetManager: Initialized.");
    }

    /**
     * Loads an image asset from the given path.
     * @param {string} path - The URL or path to the image file.
     * @param {string} name - The unique name used to identify this asset (for error reporting).
     * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded HTMLImageElement
     *                                      or rejects with an Error if loading fails.
     * @private
     */
    _loadImage(path, name) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // console.log(`AssetManager: Image '${name}' loaded from ${path}`);
                resolve(img);
            };
            img.onerror = (errorEvent) => {
                // errorEvent itself is often not very descriptive for network/file errors.
                // The console usually shows more details about the actual network request failure.
                reject(new Error(`AssetManager: Failed to load image '${name}' at path '${path}'. Check network tab for details.`));
            };
            img.src = path;
        });
    }

    // Example for other asset types (not fully implemented yet)
    // _loadAudio(path, name) { /* ... */ }
    // _loadJSON(path, name) { /* ... fetch(path).then(res => res.json()) ... */ }

    /**
     * Loads an asset based on its description (name, path, type).
     * If the asset is already loaded, it returns the cached asset.
     * If the asset is currently being loaded, it returns the existing loading promise.
     * Handles errors using the engine's ErrorHandler and re-throws them.
     *
     * @param {Object} assetInfo - Information about the asset to load.
     * @param {string} assetInfo.name - A unique name to identify and cache the asset.
     * @param {string} assetInfo.path - The path or URL to the asset file.
     * @param {string} assetInfo.type - The type of asset to load (e.g., 'image', 'audio', 'json').
     * @returns {Promise<any>} A promise that resolves with the loaded asset.
     *                         The type of the resolved asset depends on `assetInfo.type`.
     *                         Returns `Promise.resolve(null)` for unsupported asset types.
     * @throws {Error} If loading fails, the promise will reject with an error.
     */
    async loadAsset({ name, path, type }) {
        if (this.assets.has(name)) {
            // console.log(`AssetManager: Asset '${name}' already loaded. Returning cached version.`);
            return this.assets.get(name);
        }

        if (this.promises.has(name)) {
            // console.log(`AssetManager: Asset '${name}' currently loading. Returning existing promise.`);
            return this.promises.get(name);
        }

        let loadPromise;

        switch (type.toLowerCase()) {
            case 'image':
                console.log(`AssetManager: Loading image asset: '${name}' from path: ${path}`);
                loadPromise = this._loadImage(path, name);
                break;
            // TODO: Implement other asset types
            // case 'audio':
            //     console.log(`AssetManager: Loading audio asset: '${name}' from ${path}`);
            //     loadPromise = this._loadAudio(path, name); // Assuming _loadAudio exists
            //     break;
            // case 'json':
            //     console.log(`AssetManager: Loading JSON asset: '${name}' from ${path}`);
            //     loadPromise = this._loadJSON(path, name); // Assuming _loadJSON exists
            //     break;
            default:
                console.warn(`AssetManager: Asset type '${type}' for asset '${name}' is not currently supported.`);
                return Promise.resolve(null); // Or reject(new Error(...))
        }

        this.promises.set(name, loadPromise);

        try {
            const asset = await loadPromise;
            this.assets.set(name, asset);
            console.log(`AssetManager: Asset '${name}' (type: ${type}) loaded successfully.`);
            return asset;
        } catch (error) {
            // The error from _loadImage or other loaders should be an Error instance.
            this.engine.errorHandler.handle(error, {
                phase: 'AssetLoading',
                assetName: name,
                assetPath: path,
                assetType: type
            }, true); // Consider asset loading failures as potentially critical for scene setup.
            throw error; // Re-throw to allow the caller (e.g., Scene.load) to handle it.
        } finally {
            // Remove the promise from the map once it has settled (either resolved or rejected).
            this.promises.delete(name);
        }
    }

    /**
     * Retrieves a loaded asset by its unique name.
     * @param {string} name - The name of the asset to retrieve.
     * @returns {any|undefined} The loaded asset if found in the cache, otherwise undefined.
     */
    get(name) {
        if (!this.assets.has(name)) {
            // console.warn(`AssetManager.get: Asset '${name}' not found in cache.`);
            return undefined;
        }
        return this.assets.get(name);
    }

    /**
     * Loads multiple assets defined in a manifest object.
     * The manifest should contain an `assets` array, where each element is an object
     * conforming to the `assetInfo` structure expected by `loadAsset`.
     *
     * @param {Object} manifest - The asset manifest object.
     * @param {Array<Object>} manifest.assets - An array of asset definitions.
     *        Each definition should have `name`, `path`, and `type` properties.
     * @returns {Promise<void>} A promise that resolves when all assets in the manifest
     *                          have been attempted to load. It uses `Promise.allSettled`
     *                          so one failed asset doesn't prevent others from loading.
     * @todo Implement loading manifest from a JSON file path.
     */
    async loadManifest(manifest) {
        if (typeof manifest === 'string') {
            console.warn("AssetManager.loadManifest: Loading manifest from a file path is not yet implemented. Please provide a manifest object.");
            // Future: Fetch and parse manifest if it's a string (URL/path)
            // try {
            //     const response = await fetch(manifest);
            //     if (!response.ok) throw new Error(`Failed to fetch manifest from ${manifest}: ${response.statusText}`);
            //     manifest = await response.json();
            // } catch (error) {
            //     this.engine.errorHandler.handle(error, { context: 'ManifestLoading', manifestPath: manifest }, true);
            //     return; // Or throw
            // }
            return;
        }

        if (manifest && manifest.assets && Array.isArray(manifest.assets)) {
            const loadPromises = [];
            for (const assetInfo of manifest.assets) {
                if (!assetInfo.name || !assetInfo.path || !assetInfo.type) {
                    console.warn("AssetManager.loadManifest: Skipping invalid asset entry in manifest (missing name, path, or type):", assetInfo);
                    continue;
                }
                loadPromises.push(this.loadAsset(assetInfo));
            }

            const results = await Promise.allSettled(loadPromises);
            // Log any errors from manifest loading, though loadAsset already handles individual error reporting.
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const assetInfo = manifest.assets[index];
                    console.warn(`AssetManager.loadManifest: Failed to load asset '${assetInfo.name}' from manifest. Reason: ${result.reason?.message || 'Unknown error'}`);
                }
            });
        } else {
            const errorMsg = "AssetManager.loadManifest: Manifest object is invalid or missing the 'assets' array.";
            console.warn(errorMsg, manifest);
            // this.engine.errorHandler.handle(new Error(errorMsg), { context: 'ManifestLoading', manifestObject: manifest });
        }
    }

    /**
     * Clears all loaded assets from the cache and removes any pending load promises.
     * This is useful for freeing up memory, for example, during scene transitions
     * if assets are scene-specific and not globally needed.
     * Note: This does not cancel in-flight network requests for assets already being fetched.
     */
    clearAll() {
        this.assets.clear();
        this.promises.clear();
        console.log("AssetManager: All cached assets and pending load promises cleared.");
    }
}

export default AssetManager;
