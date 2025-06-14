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

    /**
     * Loads an audio asset from the given path.
     * @param {string} path - The URL or path to the audio file.
     * @param {string} name - The unique name used to identify this asset (for error reporting).
     * @returns {Promise<HTMLAudioElement>} A promise that resolves with the loaded HTMLAudioElement
     *                                      or rejects with an Error if loading fails.
     * @private
     */
    _loadAudio(path, name) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            const onCanPlayThrough = () => {
                cleanup();
                resolve(audio);
            };

            const onError = () => {
                cleanup();
                reject(new Error(`AssetManager: Failed to load audio '${name}' at path '${path}'. Check network or console for details.`));
            };

            const cleanup = () => {
                audio.removeEventListener('canplaythrough', onCanPlayThrough);
                audio.removeEventListener('error', onError);
            };

            audio.addEventListener('canplaythrough', onCanPlayThrough);
            audio.addEventListener('error', onError);

            audio.src = path;
            audio.preload = 'auto';
            audio.load();
        });
    }

    /**
     * Loads a JSON asset from the given path.
     * @param {string} path - The URL or path to the JSON file.
     * @param {string} name - The unique name used to identify this asset (for error reporting).
     * @returns {Promise<Object>} A promise that resolves with the parsed JSON object
     *                            or rejects with an Error if loading or parsing fails.
     * @private
     */
    _loadJSON(path, name) {
        return new Promise((resolve, reject) => {
            fetch(path)
                .then(response => {
                    if (!response.ok) {
                        reject(new Error(`AssetManager: Failed to fetch JSON '${name}' from '${path}'. Status: ${response.status}`));
                    }
                    return response.json();
                })
                .then(data => {
                    resolve(data);
                })
                .catch(error => {
                    // This will catch network errors or errors from response.json() if parsing fails
                    reject(new Error(`AssetManager: Error loading or parsing JSON '${name}' from '${path}'. ${error.message}`));
                });
        });
    }

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
            case 'audio':
                console.log(`AssetManager: Loading audio asset: '${name}' from path: ${path}`);
                loadPromise = this._loadAudio(path, name);
                break;
            case 'json':
                console.log(`AssetManager: Loading JSON asset: '${name}' from path: ${path}`);
                loadPromise = this._loadJSON(path, name);
                break;
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
            // Using critical as it logs the error and re-throws, matching previous behavior.
            this.engine.errorHandler.critical(
                error.message, // Pass the error message string
                {
                    phase: 'AssetLoading',
                    assetName: name,
                    assetPath: path,
                    assetType: type,
                    originalError: error // Pass the original error object for more context
                }
            );
            // critical already throws, so no need to re-throw here.
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
     */
    async loadManifest(manifest) {
        if (typeof manifest === 'string') {
            const manifestPath = manifest; // Keep original path for error reporting
            try {
                console.log(`AssetManager.loadManifest: Fetching manifest from URL: ${manifestPath}`);
                const response = await fetch(manifestPath);
                if (!response.ok) {
                    const errorMsg = `AssetManager: Failed to fetch manifest from '${manifestPath}'. Status: ${response.status}`;
                    this.engine.errorHandler.error(errorMsg, { context: 'ManifestLoading', manifestPath });
                    return; // Stop processing if manifest fetch fails
                }
                manifest = await response.json();
                console.log(`AssetManager.loadManifest: Manifest successfully loaded and parsed from ${manifestPath}.`);
            } catch (error) {
                // This catches network errors or errors from response.json() if parsing fails
                const errorMsg = `AssetManager: Error loading or parsing manifest JSON from '${manifestPath}'. Original error: ${error.message}`;
                this.engine.errorHandler.error(errorMsg, { context: 'ManifestLoading', manifestPath, originalError: error });
                return; // Stop processing if manifest loading/parsing fails
            }
        }

        if (manifest && manifest.assets && Array.isArray(manifest.assets)) {
            const loadPromises = [];
            for (const assetInfo of manifest.assets) {
                if (!assetInfo.name || !assetInfo.path || !assetInfo.type) {
                    this.engine.errorHandler.warn(
                        "AssetManager.loadManifest: Skipping invalid asset entry in manifest (missing name, path, or type).",
                        { context: 'ManifestLoading.invalidEntry', assetInfo }
                    );
                    continue;
                }
                loadPromises.push(this.loadAsset(assetInfo));
            }

            const results = await Promise.allSettled(loadPromises);
            // Log any errors from manifest loading, though loadAsset already handles individual error reporting.
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const assetInfo = manifest.assets[index];
                    // This console.warn is acceptable as loadAsset itself would have used errorHandler.critical
                    // This is more of a summary log for the manifest loading process.
                    console.warn(`AssetManager.loadManifest: Asset '${assetInfo.name}' (from manifest) failed to load. Reason: ${result.reason?.message || 'Unknown error'}`);
                }
            });
        } else {
            const errorMsg = "AssetManager.loadManifest: Manifest object is invalid or missing the 'assets' array.";
            this.engine.errorHandler.warn(errorMsg, { context: 'ManifestLoading.invalidManifest', manifestObject: manifest });
        }
    }

    /**
     * Loads an image asset by name, assuming a convention-based path.
     * The path is constructed as 'assets/images/[name]'.
     * @param {string} name - The filename of the image (e.g., 'player.png').
     *                        This name is also used as the cache key.
     * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded HTMLImageElement.
     */
    getImage(name) {
        const path = `assets/images/${name}`;
        return this.loadAsset({ name, path, type: 'image' });
    }

    /**
     * Loads an audio asset by name, assuming a convention-based path.
     * The path is constructed as 'assets/audio/[name]'.
     * @param {string} name - The filename of the audio asset (e.g., 'shoot.wav').
     *                        This name is also used as the cache key.
     * @returns {Promise<HTMLAudioElement>} A promise that resolves with the loaded HTMLAudioElement.
     */
    getAudio(name) {
        const path = `assets/audio/${name}`;
        return this.loadAsset({ name, path, type: 'audio' });
    }

    /**
     * Loads a JSON data file by name, assuming a convention-based path.
     * The path is constructed as 'assets/data/[name]'.
     * @param {string} name - The filename of the JSON file (e.g., 'level1.json').
     *                        This name is also used as the cache key.
     * @returns {Promise<Object>} A promise that resolves with the parsed JSON object.
     */
    getJSON(name) {
        const path = `assets/data/${name}`;
        return this.loadAsset({ name, path, type: 'json' });
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
