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
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine instance.
 * @property {Map<string, any>} assets - A cache for successfully loaded assets, keyed by their unique name.
 * @property {Map<string, Promise<any>>} promises - A map to store promises for assets currently being loaded,
 *                                                 keyed by asset name. This prevents duplicate load attempts.
 */
import { AssetTypes } from '../core/Constants.js';
import { SpriteAtlas } from './SpriteAtlas.js';

class AssetManager {
    /**
     * Creates an instance of AssetManager.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - A reference to the HatchEngine instance.
     *        Used for accessing other engine systems like ErrorHandler.
     */
    constructor(engine) {
        if (!engine || !engine.errorHandler) {
            // Cannot use this.engine.errorHandler if engine or errorHandler itself is missing.
            const errorMsg = "AssetManager constructor: Valid 'engine' instance with 'errorHandler' is required.";
            console.error(errorMsg); // Fallback log
            throw new Error(errorMsg);
        }
        /** @type {import('../core/HatchEngine.js').HatchEngine} */
        this.engine = engine;
        /** @type {Map<string, any>} Stores loaded assets, keyed by their name. */
        this.assets = new Map();
        /** @type {Map<string, Promise<any>>} Stores promises for assets currently loading, keyed by their name. */
        this.promises = new Map();
        this.engine.errorHandler.info("AssetManager Initialized.", { component: 'AssetManager', method: 'constructor' });
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
     * @param {string} [assetInfo.path] - The path or URL to the asset file (used for IMAGE, AUDIO, JSON).
     * @param {string} [assetInfo.jsonPath] - Path to JSON file for SpriteAtlas.
     * @param {string} [assetInfo.imagePath] - Path to image file for SpriteAtlas.
     * @param {AssetTypes[keyof AssetTypes]} assetInfo.type - The type of asset to load (e.g., `AssetTypes.IMAGE`).
     * @returns {Promise<any>} A promise that resolves with the loaded asset.
     *                         The type of the resolved asset depends on `assetInfo.type`.
     *                         Returns `Promise.resolve(null)` for unsupported asset types.
     *                         The promise will reject if loading fails, after the error has been logged
     *                         via `this.engine.errorHandler.error()`.
     * @async
     */
    async loadAsset(assetInfo) {
        const { name, path, type } = assetInfo;

        if (typeof name !== 'string' || name.trim() === '') {
            const errorMsg = "AssetManager.loadAsset: 'name' must be a non-empty string.";
            this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'loadAsset', params: assetInfo });
            return Promise.reject(new Error(errorMsg));
        }

        if (typeof type !== 'string' || !Object.values(AssetTypes).includes(type)) {
            const errorMsg = `AssetManager.loadAsset: 'type' must be a valid AssetType. Received: ${type}`;
            this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'loadAsset', params: assetInfo, validTypes: Object.values(AssetTypes) });
            return Promise.reject(new Error(errorMsg));
        }

        if (this.assets.has(name)) {
            this.engine.errorHandler.debug(`Asset '${name}' already loaded. Returning cached version.`, { component: 'AssetManager', method: 'loadAsset', params: { name }});
            return this.assets.get(name);
        }

        if (this.promises.has(name)) {
            this.engine.errorHandler.debug(`Asset '${name}' currently loading. Returning existing promise.`, { component: 'AssetManager', method: 'loadAsset', params: { name }});
            return this.promises.get(name);
        }

        let loadPromise;

        // Ensure type is compared against AssetTypes constants
        switch (type) {
            case AssetTypes.IMAGE:
                if (typeof path !== 'string' || path.trim() === '') {
                    const errorMsg = "AssetManager.loadAsset (IMAGE): 'path' must be a non-empty string.";
                    this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'loadAsset', params: assetInfo });
                    return Promise.reject(new Error(errorMsg));
                }
                this.engine.errorHandler.info(`Loading image asset: '${name}' from path: ${path}`, { component: 'AssetManager', method: 'loadAsset', assetType: AssetTypes.IMAGE, params: { name, path } });
                loadPromise = this._loadImage(path, name);
                break;
            case AssetTypes.AUDIO:
                if (typeof path !== 'string' || path.trim() === '') {
                    const errorMsg = "AssetManager.loadAsset (AUDIO): 'path' must be a non-empty string.";
                    this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'loadAsset', params: assetInfo });
                    return Promise.reject(new Error(errorMsg));
                }
                this.engine.errorHandler.info(`Loading audio asset: '${name}' from path: ${path}`, { component: 'AssetManager', method: 'loadAsset', assetType: AssetTypes.AUDIO, params: { name, path } });
                loadPromise = this._loadAudio(path, name);
                break;
            case AssetTypes.JSON:
                if (typeof path !== 'string' || path.trim() === '') {
                    const errorMsg = "AssetManager.loadAsset (JSON): 'path' must be a non-empty string.";
                    this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'loadAsset', params: assetInfo });
                    return Promise.reject(new Error(errorMsg));
                }
                this.engine.errorHandler.info(`Loading json asset: '${name}' from path: ${path}`, { component: 'AssetManager', method: 'loadAsset', assetType: AssetTypes.JSON, params: { name, path } });
                loadPromise = this._loadJSON(path, name);
                break;
            case AssetTypes.SPRITE_ATLAS:
                if (!assetInfo.jsonPath || !assetInfo.imagePath) {
                    this.engine.errorHandler.error(`AssetManager: SpriteAtlas '${name}' requires 'jsonPath' and 'imagePath' in assetInfo.`, { component: 'AssetManager', method: 'loadAsset', params: { name }});
                    loadPromise = Promise.reject(new Error(`SpriteAtlas '${name}' definition missing jsonPath or imagePath.`));
                } else {
                    this.engine.errorHandler.info(`Loading SpriteAtlas asset: '${name}' from json: ${assetInfo.jsonPath}, image: ${assetInfo.imagePath}`, { component: 'AssetManager', method: 'loadAsset', assetType: AssetTypes.SPRITE_ATLAS, params: { name } });
                    loadPromise = this._loadSpriteAtlas(assetInfo.jsonPath, assetInfo.imagePath, name);
                }
                break;
            default:
                this.engine.errorHandler.warn(`Asset type '${type}' for asset '${name}' is not currently supported. Supported types are: ${Object.values(AssetTypes).join(', ')}.`, { component: 'AssetManager', method: 'loadAsset', params: { name, type }});
                return Promise.resolve(null);
        }

        this.promises.set(name, loadPromise);

        try {
            const asset = await loadPromise;
            this.assets.set(name, asset);
            this.engine.errorHandler.info(`Asset '${name}' (type: ${type}) loaded successfully.`, { component: 'AssetManager', method: 'loadAsset', params: assetInfo});
            return asset;
        } catch (error) {
            this.engine.errorHandler.critical(error.message, {
                component: 'AssetManager',
                method: 'loadAsset',
                params: { assetName: name, path: path || assetInfo.jsonPath, type },
                originalError: error
            });
            throw error; // Re-throw the error to reject the promise
        } finally {
            this.promises.delete(name);
        }
    }

    /**
     * Loads a SpriteAtlas asset, which consists of a JSON data file and an image file.
     * @param {string} jsonPath - Path to the JSON atlas data file.
     * @param {string} imagePath - Path to the atlas image file.
     * @param {string} name - Unique name for this atlas asset.
     * @returns {Promise<SpriteAtlas>} A promise that resolves with the loaded SpriteAtlas instance.
     * @private
     */
    async _loadSpriteAtlas(jsonPath, imagePath, name) {
        try {
            const jsonPromise = this._loadJSON(jsonPath, `${name}_json`);
            const imagePromise = this._loadImage(imagePath, `${name}_image`);

            const [jsonData, image] = await Promise.all([jsonPromise, imagePromise]);

            if (!jsonData || !image) {
                throw new Error(`Failed to load JSON or Image for SpriteAtlas '${name}'.`);
            }
            return new SpriteAtlas(this.engine, jsonData, image);
        } catch (error) {
            this.engine.errorHandler.error(`Failed to load SpriteAtlas '${name}'. ${error.message}`, { component: 'AssetManager', method: '_loadSpriteAtlas', originalError: error });
            throw error; // Re-throw to be caught by loadAsset
        }
    }

    /**
     * Retrieves a loaded asset by its unique name.
     * @param {string} name - The name of the asset to retrieve.
     * @returns {any|undefined} The loaded asset if found in the cache, otherwise undefined.
     */
    get(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            this.engine.errorHandler.error("AssetManager.get: 'name' must be a non-empty string.", { component: 'AssetManager', method: 'get', params: { name } });
            return undefined;
        }
        if (!this.assets.has(name)) {
            this.engine.errorHandler.warn(`Asset '${name}' not found in cache.`, { component: 'AssetManager', method: 'get', params: { name }});
            return undefined;
        }
        return this.assets.get(name);
    }

    /**
     * Loads multiple assets defined in a manifest object.
     * The manifest should contain an `assets` array, where each element is an object
     * conforming to the `assetInfo` structure expected by `loadAsset`.
     *
     * @param {string} url - The URL from which to fetch the manifest file.
     * @returns {Promise<object|null>} A promise that resolves with the parsed manifest object,
     *                                   or `null` if fetching or parsing fails.
     * @private
     * @async
     */
    async _fetchManifestFromUrl(url) {
        try {
            this.engine.errorHandler.info(`Fetching manifest from URL: ${url}`, { component: 'AssetManager', method: '_fetchManifestFromUrl', params: { url }});
            const response = await fetch(url);
            if (!response.ok) {
                const errorMsg = `Failed to fetch manifest from '${url}'. Status: ${response.status}`;
                this.engine.errorHandler.error(errorMsg, {
                    component: 'AssetManager',
                    method: '_fetchManifestFromUrl',
                    params: { manifestPath: url, status: response.status }
                });
                return null; // Indicate failure
            }
            const manifest = await response.json();
            this.engine.errorHandler.info(`Manifest successfully loaded and parsed from ${url}.`, { component: 'AssetManager', method: '_fetchManifestFromUrl', params: { url }});
            return manifest;
        } catch (error) {
            const errorMsg = `Error loading or parsing manifest JSON from URL.`;
            this.engine.errorHandler.error(errorMsg, {
                component: 'AssetManager',
                method: '_fetchManifestFromUrl',
                params: { url },
                originalError: error
            });
            return null;
        }
    }

    /**
     * Processes a manifest object, loading all assets defined within it.
     * @param {object} manifestObject - The manifest object.
     * @param {Array<object>} manifestObject.assets - An array of asset definitions.
     *        Each definition should have `name`, `path`, and `type` properties.
     * @returns {Promise<void>} A promise that resolves when all asset loading attempts are settled.
     * @private
     * @async
     */
    async _processManifestObject(manifestObject) {
        if (!manifestObject || !manifestObject.assets || !Array.isArray(manifestObject.assets)) {
            const errorMsg = "Manifest object is invalid or missing the 'assets' array.";
            this.engine.errorHandler.warn(errorMsg, {
                component: 'AssetManager',
                method: '_processManifestObject',
                params: { manifestType: typeof manifestObject } // Consider summarizing manifestObject if too large
            });
            return;
        }

        const loadPromises = [];
        for (const assetInfo of manifestObject.assets) {
            if (!assetInfo.name || !assetInfo.path || !assetInfo.type) {
                this.engine.errorHandler.warn(
                    "Skipping invalid asset entry in manifest (missing name, path, or type).",
                    {
                        component: 'AssetManager',
                        method: '_processManifestObject.invalidEntry',
                        params: { assetInfo }
                    }
                );
                continue;
            }
            loadPromises.push(this.loadAsset(assetInfo));
        }

        const results = await Promise.allSettled(loadPromises);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const assetInfo = manifestObject.assets[index];
                this.engine.errorHandler.warn(`Asset '${assetInfo.name}' (from manifest) failed to load. Reason: ${result.reason?.message || 'Unknown error'}`, { component: 'AssetManager', method: '_processManifestObject', params: { assetName: assetInfo.name, reason: result.reason?.message }});
            }
        });
    }

    /**
     * Loads multiple assets defined in a manifest. The manifest can be provided as a URL
     * (string) to a JSON file, or as a direct JavaScript object.
     *
     * @param {string|object} manifestOrUrl - The URL to the manifest JSON file, or the manifest object itself.
     * @param {Array<object>} manifestOrUrl.assets - If an object, it must have an `assets` array.
     *        Each asset definition in the array should have `name`, `path`, and `type` properties.
     * @returns {Promise<void>} A promise that resolves when all assets in the manifest
     *                          have been attempted to load. It uses `Promise.allSettled`
     *                          so one failed asset doesn't prevent others from loading.
     * @async
     */
    async loadManifest(manifestOrUrl) {
        if (typeof manifestOrUrl === 'string') {
            const manifestUrl = manifestOrUrl;
            const fetchedManifest = await this._fetchManifestFromUrl(manifestUrl);
            if (fetchedManifest) {
                await this._processManifestObject(fetchedManifest);
            } else {
                // Error already logged by _fetchManifestFromUrl
                this.engine.errorHandler.error('Failed to process manifest due to fetch/parse error.', {
                     component: 'AssetManager',
                     method: 'loadManifest',
                     params: { manifestPath: manifestUrl }
                });
            }
        } else if (typeof manifestOrUrl === 'object' && manifestOrUrl !== null) {
            await this._processManifestObject(manifestOrUrl);
        } else {
            this.engine.errorHandler.warn(
                'loadManifest: Invalid argument. Must be a URL string or a manifest object.',
                {
                    component: 'AssetManager',
                    method: 'loadManifest',
                    params: { type: typeof manifestOrUrl }
                }
            );
        }
    }

    /**
     * Loads an image asset by name, assuming a convention-based path.
     * The path is constructed as 'assets/images/[name]'.
     * @param {string} name - The filename of the image (e.g., 'player.png').
     *                        This name is also used as the cache key.
     * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded HTMLImageElement,
     *                                     or rejects/throws via `loadAsset` if loading fails.
     */
    getImage(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            const errorMsg = "AssetManager.getImage: 'name' must be a non-empty string.";
            this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'getImage', params: { name } });
            return Promise.reject(new Error(errorMsg));
        }
        const path = `assets/images/${name}`;
        return this.loadAsset({ name, path, type: AssetTypes.IMAGE });
    }

    /**
     * Loads an audio asset by name, assuming a convention-based path.
     * The path is constructed as 'assets/audio/[name]'.
     * @param {string} name - The filename of the audio asset (e.g., 'shoot.wav').
     *                        This name is also used as the cache key.
     * @returns {Promise<HTMLAudioElement>} A promise that resolves with the loaded HTMLAudioElement,
     *                                      or rejects/throws via `loadAsset` if loading fails.
     */
    getAudio(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            const errorMsg = "AssetManager.getAudio: 'name' must be a non-empty string.";
            this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'getAudio', params: { name } });
            return Promise.reject(new Error(errorMsg));
        }
        const path = `assets/audio/${name}`;
        return this.loadAsset({ name, path, type: AssetTypes.AUDIO });
    }

    /**
     * Loads a JSON data file by name, assuming a convention-based path.
     * The path is constructed as 'assets/data/[name]'.
     * @param {string} name - The filename of the JSON file (e.g., 'level1.json').
     *                        This name is also used as the cache key.
     * @returns {Promise<Object>} A promise that resolves with the parsed JSON object,
     *                             or rejects/throws via `loadAsset` if loading fails.
     */
    getJSON(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            const errorMsg = "AssetManager.getJSON: 'name' must be a non-empty string.";
            this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'getJSON', params: { name } });
            return Promise.reject(new Error(errorMsg));
        }
        const path = `assets/data/${name}`;
        return this.loadAsset({ name, path, type: AssetTypes.JSON });
    }

    /**
     * Loads a SpriteAtlas asset by name, requiring paths for its JSON and image components.
     * @param {string} name - The unique name for the SpriteAtlas asset.
     * @param {string} jsonPath - The path to the JSON definition file for the atlas.
     * @param {string} imagePath - The path to the image file (texture) for the atlas.
     * @returns {Promise<SpriteAtlas>} A promise that resolves with the loaded SpriteAtlas instance,
     *                                or rejects/throws via `loadAsset` if loading fails.
     */
    getSpriteAtlas(name, jsonPath, imagePath) {
       if (typeof name !== 'string' || !name.trim() || typeof jsonPath !== 'string' || !jsonPath.trim() || typeof imagePath !== 'string' || !imagePath.trim()) {
           const errorMsg = "AssetManager.getSpriteAtlas: 'name', 'jsonPath', and 'imagePath' must be non-empty strings.";
           this.engine.errorHandler.error(errorMsg, { component: 'AssetManager', method: 'getSpriteAtlas' });
           return Promise.reject(new Error(errorMsg));
       }
       return this.loadAsset({ name, type: AssetTypes.SPRITE_ATLAS, jsonPath, imagePath });
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
        // console.log("AssetManager: All cached assets and pending load promises cleared."); // Informational, could use ErrorHandler.info
        this.engine.errorHandler.info("All cached assets and pending load promises cleared.", {
            component: "AssetManager",
            method: "clearAll"
        });
    }
}

export default AssetManager;
