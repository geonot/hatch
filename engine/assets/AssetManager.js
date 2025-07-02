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
     * Auto-discover assets in a directory structure
     * @param {string} basePath - Base path to scan for assets
     * @returns {Promise<Object>} Asset manifest organized by type
     */
    async discoverAssets(basePath = './assets/') {
        const manifest = {
            images: [],
            audio: [],
            fonts: [],
            data: [],
            discovered: new Date().toISOString()
        };

        try {
            // Common asset patterns based on file extensions
            const commonAssets = this._getCommonAssetPaths(basePath);
            
            // Categorize assets by type
            commonAssets.forEach(asset => {
                const category = this._categorizeAsset(asset);
                if (category && manifest[category]) {
                    manifest[category].push(asset);
                }
            });

            this.engine.errorHandler.info('Assets discovered', { 
                component: 'AssetManager', 
                method: 'discoverAssets',
                manifest 
            });
            
            return manifest;
        } catch (error) {
            this.engine.errorHandler.warn(`Failed to discover assets in ${basePath}`, {
                component: 'AssetManager',
                method: 'discoverAssets',
                error: error.message
            });
            return manifest;
        }
    }

    /**
     * Load assets from a manifest with progress tracking
     * @param {Object|Array} manifest - Asset manifest or array of paths
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Object>} Object containing loaded assets
     */
    async loadManifest(manifest, progressCallback = null) {
        let assetInfosToLoad = [];

        if (typeof manifest === 'string') { // It's a URL to a manifest file
            this.engine.errorHandler.info(`Fetching manifest from URL: ${manifest}`, { component: 'AssetManager', method: 'loadManifest' });
            try {
                const fetchedManifest = await this.loadAsset({ name: `manifest_${this._getAssetName(manifest)}`, path: manifest, type: AssetTypes.JSON });
                if (fetchedManifest && fetchedManifest.assets && Array.isArray(fetchedManifest.assets)) {
                    assetInfosToLoad = fetchedManifest.assets;
                } else {
                    this.engine.errorHandler.warn(`Fetched manifest from '${manifest}' is invalid or missing 'assets' array.`, { component: 'AssetManager', method: 'loadManifest', params: { manifestPath: manifest }});
                    return {}; // Return empty if manifest format is wrong
                }
            } catch (error) {
                this.engine.errorHandler.error(`Failed to fetch manifest from '${manifest}'. ${error.message}`, { component: 'AssetManager', method: 'loadManifest', params: { manifestPath: manifest }, originalError: error });
                return {}; // Return empty on fetch error
            }
        } else if (Array.isArray(manifest)) { // It's an array of asset info objects (or potentially paths, though paths are less robust here)
            assetInfosToLoad = manifest.map(item =>
                typeof item === 'string' ? { name: this._getAssetName(item), path: item, type: this._inferAssetTypeFromPath(item) } : item
            );
        } else if (typeof manifest === 'object' && manifest !== null && manifest.assets && Array.isArray(manifest.assets)) { // It's a manifest object
            assetInfosToLoad = manifest.assets;
        } else if (typeof manifest === 'object' && manifest !== null) { // It's a flat manifest object with categories
             Object.values(manifest).forEach(category => {
                if (Array.isArray(category)) {
                    assetInfosToLoad.push(...category);
                }
            });
        } else {
            this.engine.errorHandler.warn("Manifest object is invalid or missing the 'assets' array.", { component: 'AssetManager', method: 'loadManifest', params: { manifest }});
            return {};
        }

        // Filter out any invalid entries before batching
        assetInfosToLoad = assetInfosToLoad.filter(assetInfo => {
            if (assetInfo && typeof assetInfo.name === 'string' && typeof assetInfo.type === 'string') {
                return true;
            }
            this.engine.errorHandler.warn(`Skipping invalid asset entry in manifest. Missing 'name' or 'type'.`, { component: 'AssetManager', method: 'loadManifest', params: { assetInfo } });
            return false;
        });

        return this.loadBatch(assetInfosToLoad, progressCallback);
    }

    /**
     * Load a batch of assets with progress tracking
     * @param {Array<Object>} assetInfos - Array of asset info objects.
     * @param {Function} [progressCallback] - Progress callback (progress, assetName, assetPathOrInfo)
     * @returns {Promise<Object>} Object containing loaded assets, keyed by name.
     */
    async loadBatch(assetInfos, progressCallback = null) {
        const results = {};
        if (!Array.isArray(assetInfos) || assetInfos.length === 0) {
            this.engine.errorHandler.debug('loadBatch called with empty or invalid assetInfos array.', { component: 'AssetManager', method: 'loadBatch' });
            return results;
        }
        const totalAssets = assetInfos.length;
        let loadedCount = 0;

        this.engine.errorHandler.info(`Loading batch of ${totalAssets} assets.`, {
            component: 'AssetManager',
            method: 'loadBatch'
        });

        const loadPromises = assetInfos.map(async (assetInfo) => {
            // Ensure assetInfo is a valid object with name and type
            if (!assetInfo || typeof assetInfo.name !== 'string' || typeof assetInfo.type !== 'string') {
                this.engine.errorHandler.warn('Skipping invalid assetInfo in loadBatch.', { component: 'AssetManager', method: 'loadBatch', params: { assetInfo }});
                loadedCount++; // Still count it towards progress to avoid getting stuck
                if (progressCallback) {
                    progressCallback(loadedCount / totalAssets, null, assetInfo);
                }
                return null; // Skip this invalid entry
            }

            try {
                const asset = await this.loadAsset(assetInfo); // Use loadAsset
                if (asset) { // loadAsset might resolve to null for unsupported types
                  results[assetInfo.name] = asset;
                }
                
                loadedCount++;
                if (progressCallback) {
                    progressCallback(loadedCount / totalAssets, assetInfo.name, assetInfo.path || assetInfo.name);
                }
                return asset;
            } catch (error) {
                // loadAsset already logs to errorHandler.critical and re-throws.
                // Here, we just ensure progress callback is called.
                this.engine.errorHandler.warn(`Asset '${assetInfo.name}' (from batch) failed to load. Reason: ${error.message}`, { component: 'AssetManager', method: 'loadBatch', params: { assetInfo } });
                loadedCount++;
                if (progressCallback) {
                    // Pass assetInfo or its path for context in the callback
                    progressCallback(loadedCount / totalAssets, assetInfo.name, assetInfo.path || assetInfo.name, true /* indicate error */);
                }
                return null; // Indicate failure for this specific asset
            }
        });

        // Use Promise.allSettled to ensure all attempts complete, even if some fail.
        // loadAsset already handles individual errors and caching.
        await Promise.allSettled(loadPromises);
        
        this.engine.errorHandler.info(`Batch loading process completed. Successfully loaded: ${Object.keys(results).length}/${totalAssets}`, {
            component: 'AssetManager',
            method: 'loadBatch'
        });
        
        return results;
    }

    _inferAssetTypeFromPath(path) {
        const ext = this._getExtension(path);
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) return AssetTypes.IMAGE;
        if (['.mp3', '.wav', '.ogg'].includes(ext)) return AssetTypes.AUDIO;
        if (['.json'].includes(ext)) return AssetTypes.JSON;
        // Add more inferences as needed
        this.engine.errorHandler.warn(`Could not infer asset type from path: ${path}. Defaulting to AssetTypes.JSON. Please specify type explicitly.`, { component: 'AssetManager', method: '_inferAssetTypeFromPath' });
        return AssetTypes.JSON; // A default, or could be an error/null
    }

    /**
     * Load assets specific to a scene
     * @param {string} sceneName - Name of the scene
     * @param {Object} additionalAssets - Additional assets to load
     * @returns {Promise<Object>} Loaded scene assets
     */
    async loadSceneAssets(sceneName, additionalAssets = {}) {
        // Auto-discover scene-specific assets
        const sceneBasePath = `./assets/scenes/${sceneName}/`;
        const discoveredAssets = await this.discoverAssets(sceneBasePath);
        
        // Merge with additional assets
        const mergedAssets = this._mergeManifests(discoveredAssets, additionalAssets);
        
        // Load all assets
        const loadedAssets = await this.loadManifest(mergedAssets);
        
        this.engine.errorHandler.info(`Scene assets loaded for: ${sceneName}`, {
            component: 'AssetManager',
            method: 'loadSceneAssets',
            sceneName,
            assetCount: Object.keys(loadedAssets).length
        });
        
        return loadedAssets;
    }

    /**
     * Preload common assets that are used across multiple scenes
     * @returns {Promise<Object>} Loaded common assets
     */
    async preloadCommonAssets() {
        const commonPath = './assets/common/';
        const commonManifest = await this.discoverAssets(commonPath);
        
        this.engine.errorHandler.info('Preloading common assets', {
            component: 'AssetManager',
            method: 'preloadCommonAssets'
        });
        
        return this.loadManifest(commonManifest);
    }

    /**
     * Get loading statistics
     * @returns {Object} Statistics about loaded assets
     */
    getStats() {
        return {
            totalAssets: this.assets.size,
            loadingAssets: this.promises.size,
            assetTypes: this._getAssetTypeStats(),
            memoryEstimate: this._estimateMemoryUsage()
        };
    }

    /**
     * Check if an asset is loaded
     * @param {string} name - Asset name
     * @returns {boolean} True if asset is loaded
     */
    isLoaded(name) {
        return this.assets.has(name);
    }

    /**
     * Unload specific assets to free memory
     * @param {string|Array} names - Asset name(s) to unload
     */
    unload(names) {
        const nameArray = Array.isArray(names) ? names : [names];
        
        nameArray.forEach(name => {
            if (this.assets.has(name)) {
                const asset = this.assets.get(name);
                this._cleanupAsset(asset);
                this.assets.delete(name);
                
                this.engine.errorHandler.info(`Asset unloaded: ${name}`, {
                    component: 'AssetManager',
                    method: 'unload'
                });
            }
        });
    }

    /**
     * Clear all cached assets
     */
    clear() {
        this.engine.errorHandler.info('Clearing all cached assets', {
            component: 'AssetManager',
            method: 'clear'
        });
        
        for (const [name, asset] of this.assets.entries()) {
            this._cleanupAsset(asset);
        }
        
        this.assets.clear();
        this.promises.clear();
    }

    /**
     * Alias for clear().
     */
    clearAll() {
        this.clear();
    }

    /**
     * Loads an image asset using a conventional path if only a name is provided.
     * @param {string} nameOrPath - The asset name (e.g., 'player.png') or full path.
     * @returns {Promise<HTMLImageElement>}
     */
    async getImage(nameOrPath) {
        const isPath = nameOrPath.includes('/');
        const name = isPath ? this._getAssetName(nameOrPath) : nameOrPath;
        const path = isPath ? nameOrPath : `assets/images/${nameOrPath}`;
        return this.loadAsset({ name, path, type: AssetTypes.IMAGE });
    }

    /**
     * Loads an audio asset using a conventional path if only a name is provided.
     * @param {string} nameOrPath - The asset name (e.g., 'music.mp3') or full path.
     * @returns {Promise<HTMLAudioElement>}
     */
    async getAudio(nameOrPath) {
        const isPath = nameOrPath.includes('/');
        const name = isPath ? this._getAssetName(nameOrPath) : nameOrPath;
        const path = isPath ? nameOrPath : `assets/audio/${nameOrPath}`;
        return this.loadAsset({ name, path, type: AssetTypes.AUDIO });
    }

    /**
     * Loads a JSON asset using a conventional path if only a name is provided.
     * @param {string} nameOrPath - The asset name (e.g., 'config.json') or full path.
     * @returns {Promise<Object>}
     */
    async getJSON(nameOrPath) {
        const isPath = nameOrPath.includes('/');
        const name = isPath ? this._getAssetName(nameOrPath) : nameOrPath;
        const path = isPath ? nameOrPath : `assets/data/${nameOrPath}`;
        return this.loadAsset({ name, path, type: AssetTypes.JSON });
    }

    // Private helper methods for enhanced functionality
    
    _getCommonAssetPaths(basePath) {
        // Simulate common asset discovery patterns
        const commonAssets = [];
        
        // Common UI assets
        if (basePath.includes('common') || basePath === './assets/') {
            commonAssets.push(
                'ui/button.png',
                'ui/panel.png',
                'ui/icon-close.png',
                'ui/icon-settings.png',
                'fonts/game-font.ttf',
                'fonts/ui-font.woff2',
                'audio/click.wav',
                'audio/hover.wav',
                'audio/error.wav',
                'data/config.json',
                'data/localization.json'
            );
        }
        
        // Scene-specific assets
        if (basePath.includes('scenes/')) {
            const pathParts = basePath.split('/');
            const sceneIndex = pathParts.indexOf('scenes');
            if (sceneIndex !== -1 && pathParts[sceneIndex + 1]) {
                const sceneName = pathParts[sceneIndex + 1];
                commonAssets.push(
                    `scenes/${sceneName}/background.png`,
                    `scenes/${sceneName}/sprites.png`,
                    `scenes/${sceneName}/music.mp3`,
                    `scenes/${sceneName}/data.json`
                );
            }
        }
        
        return commonAssets.map(path => basePath + path);
    }

    _categorizeAsset(path) {
        const extension = this._getExtension(path);
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        const audioExts = ['.mp3', '.wav', '.ogg', '.m4a'];
        const fontExts = ['.ttf', '.otf', '.woff', '.woff2'];
        const dataExts = ['.json', '.xml', '.csv', '.txt'];
        
        if (imageExts.includes(extension)) return 'images';
        if (audioExts.includes(extension)) return 'audio';
        if (fontExts.includes(extension)) return 'fonts';
        if (dataExts.includes(extension)) return 'data';
        
        return null;
    }

    _getExtension(path) {
        const lastDot = path.lastIndexOf('.');
        return lastDot > -1 ? path.substring(lastDot).toLowerCase() : '';
    }

    _getAssetName(path) {
        const lastSlash = path.lastIndexOf('/');
        const lastDot = path.lastIndexOf('.');
        const start = lastSlash > -1 ? lastSlash + 1 : 0;
        const end = lastDot > -1 ? lastDot : path.length;
        return path.substring(start, end);
    }

    _mergeManifests(manifest1, manifest2) {
        const merged = { ...manifest1 };
        
        Object.keys(manifest2).forEach(category => {
            if (merged[category] && Array.isArray(merged[category])) {
                merged[category] = [...merged[category], ...manifest2[category]];
            } else {
                merged[category] = manifest2[category];
            }
        });
        
        return merged;
    }

    _getAssetTypeStats() {
        const stats = {};
        
        for (const [name, asset] of this.assets.entries()) {
            let type = 'unknown';
            
            if (asset instanceof HTMLImageElement) {
                type = 'image';
            } else if (asset instanceof HTMLAudioElement) {
                type = 'audio';
            } else if (asset instanceof SpriteAtlas) {
                type = 'spriteAtlas';
            } else if (typeof asset === 'object' && asset.data) {
                type = 'data';
            }
            
            stats[type] = (stats[type] || 0) + 1;
        }
        
        return stats;
    }

    _estimateMemoryUsage() {
        let totalBytes = 0;
        
        for (const [name, asset] of this.assets.entries()) {
            if (asset instanceof HTMLImageElement) {
                // Estimate: width * height * 4 bytes (RGBA)
                totalBytes += (asset.naturalWidth || asset.width) * (asset.naturalHeight || asset.height) * 4;
            } else if (typeof asset === 'object' && asset.data) {
                // Estimate JSON size
                totalBytes += JSON.stringify(asset.data).length * 2; // Unicode characters
            } else {
                // Generic estimate
                totalBytes += 1024; // 1KB fallback
            }
        }
        
        return {
            bytes: totalBytes,
            mb: (totalBytes / (1024 * 1024)).toFixed(2)
        };
    }

    _cleanupAsset(asset) {
        // Clean up asset resources
        if (asset && typeof asset.dispose === 'function') {
            asset.dispose();
        }
        
        // For images with blob URLs
        if (asset instanceof HTMLImageElement && asset.src.startsWith('blob:')) {
            URL.revokeObjectURL(asset.src);
        }
    }
}

export default AssetManager;
