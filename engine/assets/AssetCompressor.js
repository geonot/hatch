/**
 * @file AssetCompressor.js
 * @description Asset compression and optimization system for the Hatch engine.
 * Provides WebP/AVIF conversion, texture atlasing, and compression utilities.
 */

import { getLogger } from '../core/Logger.js';

/**
 * @class AssetCompressor
 * @classdesc Handles asset compression, format conversion, and optimization.
 * Supports WebP/AVIF conversion, texture atlas generation, and size optimization.
 */
export class AssetCompressor {
    constructor(engine) {
        this.engine = engine;
        this.logger = getLogger('AssetCompressor');
        
        // Compression settings
        this.config = {
            webpQuality: 80,
            avifQuality: 60,
            jpegQuality: 85,
            textureAtlasMaxSize: 2048,
            compressionThreshold: 1024, // Min size to attempt compression
            enableAvif: false, // AVIF support detection
            enableWebp: false  // WebP support detection
        };
        
        // Format support detection
        this.formatSupport = {
            webp: false,
            avif: false,
            jpegxl: false
        };
        
        // Compression statistics
        this.stats = {
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0,
            processedFiles: 0,
            errors: 0
        };
        
        this.init();
    }

    /**
     * Initialize compression system and detect format support
     */
    async init() {
        try {
            await this.detectFormatSupport();
            this.logger.info('AssetCompressor initialized', {
                supportedFormats: this.formatSupport,
                config: this.config
            });
        } catch (error) {
            this.logger.error('Failed to initialize AssetCompressor', error);
        }
    }

    /**
     * Detect browser support for modern image formats
     */
    async detectFormatSupport() {
        // Test WebP support
        try {
            const webpTest = await this.canPlayFormat('data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=');
            this.formatSupport.webp = webpTest;
            this.config.enableWebp = webpTest;
        } catch (e) {
            this.formatSupport.webp = false;
        }

        // Test AVIF support  
        try {
            const avifTest = await this.canPlayFormat('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=');
            this.formatSupport.avif = avifTest;
            this.config.enableAvif = avifTest;
        } catch (e) {
            this.formatSupport.avif = false;
        }

        this.logger.debug('Format support detected', this.formatSupport);
    }

    /**
     * Test if a format can be decoded
     */
    canPlayFormat(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = dataUrl;
        });
    }

    /**
     * Compress an image asset to optimal format
     * @param {HTMLImageElement} image - Source image
     * @param {Object} options - Compression options
     * @returns {Promise<{data: ArrayBuffer, format: string, size: number}>}
     */
    async compressImage(image, options = {}) {
        const config = { ...this.config, ...options };
        
        try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            
            let bestResult = null;
            let bestSize = Infinity;
            
            // Try different formats and qualities
            const formats = this.getSupportedFormats();
            
            for (const format of formats) {
                try {
                    const result = await this.convertToFormat(canvas, format, config);
                    if (result.size < bestSize) {
                        bestSize = result.size;
                        bestResult = result;
                    }
                } catch (error) {
                    this.logger.warn(`Failed to convert to ${format}`, error);
                }
            }
            
            if (bestResult) {
                this.updateStats(image.width * image.height * 4, bestResult.size);
                this.logger.debug(`Compressed image: ${this.formatFileSize(bestResult.size)}`);
                return bestResult;
            }
            
            throw new Error('No compression format succeeded');
            
        } catch (error) {
            this.stats.errors++;
            this.logger.error('Image compression failed', error);
            throw error;
        }
    }

    /**
     * Convert canvas to specific format
     */
    async convertToFormat(canvas, format, config) {
        return new Promise((resolve, reject) => {
            let mimeType, quality;
            
            switch (format) {
                case 'webp':
                    mimeType = 'image/webp';
                    quality = config.webpQuality / 100;
                    break;
                case 'avif':
                    mimeType = 'image/avif';
                    quality = config.avifQuality / 100;
                    break;
                case 'jpeg':
                    mimeType = 'image/jpeg';
                    quality = config.jpegQuality / 100;
                    break;
                default:
                    mimeType = 'image/png';
                    quality = undefined;
            }
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        blob.arrayBuffer().then(data => {
                            resolve({
                                data,
                                format,
                                mimeType,
                                size: data.byteLength
                            });
                        });
                    } else {
                        reject(new Error(`Failed to convert to ${format}`));
                    }
                },
                mimeType,
                quality
            );
        });
    }

    /**
     * Create texture atlas from multiple images
     * @param {Array<{name: string, image: HTMLImageElement}>} images
     * @param {Object} options - Atlas options
     * @returns {Promise<{atlas: HTMLCanvasElement, mapping: Object}>}
     */
    async createTextureAtlas(images, options = {}) {
        const config = {
            maxSize: options.maxSize || this.config.textureAtlasMaxSize,
            padding: options.padding || 2,
            algorithm: options.algorithm || 'binpack'
        };
        
        try {
            this.logger.info(`Creating texture atlas with ${images.length} images`);
            
            // Sort images by area (largest first)
            const sortedImages = images.slice().sort((a, b) => {
                const areaA = a.image.width * a.image.height;
                const areaB = b.image.width * b.image.height;
                return areaB - areaA;
            });
            
            let atlasResult;
            
            switch (config.algorithm) {
                case 'binpack':
                    atlasResult = await this.binPackAtlas(sortedImages, config);
                    break;
                case 'grid':
                    atlasResult = await this.gridAtlas(sortedImages, config);
                    break;
                default:
                    throw new Error(`Unknown atlas algorithm: ${config.algorithm}`);
            }
            
            this.logger.info('Texture atlas created', {
                size: `${atlasResult.atlas.width}x${atlasResult.atlas.height}`,
                images: images.length,
                efficiency: this.calculateAtlasEfficiency(atlasResult)
            });
            
            return atlasResult;
            
        } catch (error) {
            this.logger.error('Texture atlas creation failed', error);
            throw error;
        }
    }

    /**
     * Create atlas using bin packing algorithm
     */
    async binPackAtlas(images, config) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Start with reasonable size
        let atlasWidth = 512;
        let atlasHeight = 512;
        
        let packed = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!packed && attempts < maxAttempts) {
            canvas.width = atlasWidth;
            canvas.height = atlasHeight;
            ctx.clearRect(0, 0, atlasWidth, atlasHeight);
            
            const bins = [{ x: 0, y: 0, width: atlasWidth, height: atlasHeight, used: false }];
            const mapping = {};
            let allPacked = true;
            
            for (const imgInfo of images) {
                const { name, image } = imgInfo;
                const width = image.width + config.padding * 2;
                const height = image.height + config.padding * 2;
                
                const bin = this.findBin(bins, width, height);
                if (bin) {
                    // Split bin
                    this.splitBin(bins, bin, width, height);
                    
                    // Draw image
                    ctx.drawImage(
                        image,
                        bin.x + config.padding,
                        bin.y + config.padding
                    );
                    
                    mapping[name] = {
                        x: bin.x + config.padding,
                        y: bin.y + config.padding,
                        width: image.width,
                        height: image.height
                    };
                } else {
                    allPacked = false;
                    break;
                }
            }
            
            if (allPacked) {
                packed = true;
                return { atlas: canvas, mapping };
            } else {
                attempts++;
                if (atlasWidth < atlasHeight) {
                    atlasWidth *= 2;
                } else {
                    atlasHeight *= 2;
                }
                
                if (atlasWidth > config.maxSize || atlasHeight > config.maxSize) {
                    throw new Error('Images too large for maximum atlas size');
                }
            }
        }
        
        throw new Error('Failed to pack atlas after maximum attempts');
    }

    /**
     * Find suitable bin for image
     */
    findBin(bins, width, height) {
        for (const bin of bins) {
            if (!bin.used && bin.width >= width && bin.height >= height) {
                return bin;
            }
        }
        return null;
    }

    /**
     * Split bin after placing image
     */
    splitBin(bins, bin, width, height) {
        bin.used = true;
        
        // Create right bin if there's space
        if (bin.width > width) {
            bins.push({
                x: bin.x + width,
                y: bin.y,
                width: bin.width - width,
                height: height,
                used: false
            });
        }
        
        // Create bottom bin if there's space
        if (bin.height > height) {
            bins.push({
                x: bin.x,
                y: bin.y + height,
                width: bin.width,
                height: bin.height - height,
                used: false
            });
        }
    }

    /**
     * Create grid-based atlas
     */
    async gridAtlas(images, config) {
        const maxImageWidth = Math.max(...images.map(img => img.image.width));
        const maxImageHeight = Math.max(...images.map(img => img.image.height));
        
        const cellWidth = maxImageWidth + config.padding * 2;
        const cellHeight = maxImageHeight + config.padding * 2;
        
        const cols = Math.floor(config.maxSize / cellWidth);
        const rows = Math.ceil(images.length / cols);
        
        const atlasWidth = cols * cellWidth;
        const atlasHeight = rows * cellHeight;
        
        if (atlasHeight > config.maxSize) {
            throw new Error('Too many images for grid atlas');
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        
        const ctx = canvas.getContext('2d');
        const mapping = {};
        
        images.forEach((imgInfo, index) => {
            const { name, image } = imgInfo;
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = col * cellWidth + config.padding;
            const y = row * cellHeight + config.padding;
            
            ctx.drawImage(image, x, y);
            
            mapping[name] = {
                x,
                y,
                width: image.width,
                height: image.height
            };
        });
        
        return { atlas: canvas, mapping };
    }

    /**
     * Calculate atlas packing efficiency
     */
    calculateAtlasEfficiency(atlasResult) {
        const { atlas, mapping } = atlasResult;
        const totalArea = atlas.width * atlas.height;
        const usedArea = Object.values(mapping).reduce((sum, rect) => {
            return sum + (rect.width * rect.height);
        }, 0);
        
        return (usedArea / totalArea * 100).toFixed(1);
    }

    /**
     * Get list of supported compression formats
     */
    getSupportedFormats() {
        const formats = ['png']; // Always supported
        
        if (this.formatSupport.webp) {
            formats.unshift('webp');
        }
        
        if (this.formatSupport.avif) {
            formats.unshift('avif');
        }
        
        // Add JPEG for photos
        formats.push('jpeg');
        
        return formats;
    }

    /**
     * Update compression statistics
     */
    updateStats(originalSize, compressedSize) {
        this.stats.originalSize += originalSize;
        this.stats.compressedSize += compressedSize;
        this.stats.processedFiles++;
        this.stats.compressionRatio = (
            (this.stats.originalSize - this.stats.compressedSize) / 
            this.stats.originalSize * 100
        ).toFixed(1);
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Get compression statistics
     */
    getStats() {
        return {
            ...this.stats,
            originalSizeFormatted: this.formatFileSize(this.stats.originalSize),
            compressedSizeFormatted: this.formatFileSize(this.stats.compressedSize),
            savedSize: this.formatFileSize(this.stats.originalSize - this.stats.compressedSize),
            savedPercentage: `${this.stats.compressionRatio}%`
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0,
            processedFiles: 0,
            errors: 0
        };
    }

    /**
     * Update compression configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.debug('Compression config updated', this.config);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.resetStats();
        this.logger.info('AssetCompressor destroyed');
    }
}

export default AssetCompressor;
