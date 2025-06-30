/**
 * @file ViewportCuller.js
 * @description Viewport culling system for optimizing rendering performance.
 * Culls objects outside the visible area to reduce draw calls.
 */

import { getLogger } from '../core/Logger.js';

export class ViewportCuller {
    constructor() {
        this.logger = getLogger('ViewportCuller');
        
        this.viewportBounds = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        };
        
        this.cullingMargin = 100; // Extra pixels around viewport for smoother transitions
        this.culledObjects = new Set();
        this.visibleObjects = new Set();
        
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            cullingRatio: 0
        };
        
        this.logger.info('ViewportCuller initialized');
    }

    /**
     * Update the viewport bounds based on camera and canvas
     * @param {Object} camera - Camera object with transform information
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    updateViewport(camera, canvas) {
        if (!camera || !canvas) {
            this.logger.warn('Invalid camera or canvas provided to updateViewport');
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        
        // Get camera world position and scale
        const cameraX = camera.x || 0;
        const cameraY = camera.y || 0;
        const scale = camera.scale || 1;
        
        // Calculate world bounds visible in viewport
        const worldWidth = canvasRect.width / scale;
        const worldHeight = canvasRect.height / scale;
        
        // Add margin for smooth transitions
        this.viewportBounds = {
            left: cameraX - worldWidth / 2 - this.cullingMargin,
            top: cameraY - worldHeight / 2 - this.cullingMargin,
            right: cameraX + worldWidth / 2 + this.cullingMargin,
            bottom: cameraY + worldHeight / 2 + this.cullingMargin
        };
        
        this.logger.debug('Viewport bounds updated', this.viewportBounds);
    }

    /**
     * Update viewport from rendering engine camera
     * @param {Object} renderingEngine - Rendering engine with camera
     */
    updateFromRenderingEngine(renderingEngine) {
        if (!renderingEngine || !renderingEngine.camera || !renderingEngine.canvas) {
            return;
        }
        
        const camera = renderingEngine.camera;
        const canvas = renderingEngine.canvas;
        
        // Use camera's world bounds if available
        if (typeof camera.getWorldBounds === 'function') {
            const bounds = camera.getWorldBounds();
            this.viewportBounds = {
                left: bounds.left - this.cullingMargin,
                top: bounds.top - this.cullingMargin,
                right: bounds.right + this.cullingMargin,
                bottom: bounds.bottom + this.cullingMargin
            };
        } else {
            // Fallback to manual calculation
            this.updateViewport(camera, canvas);
        }
    }

    /**
     * Cull objects based on current viewport
     * @param {Array} objects - Array of objects to cull
     * @returns {Array} Array of visible objects
     */
    cullObjects(objects) {
        if (!Array.isArray(objects)) {
            this.logger.warn('cullObjects expects an array of objects');
            return [];
        }

        this.culledObjects.clear();
        this.visibleObjects.clear();

        for (const obj of objects) {
            if (this.isObjectVisible(obj)) {
                this.visibleObjects.add(obj);
            } else {
                this.culledObjects.add(obj);
            }
        }

        this.updateStats(objects.length);
        return Array.from(this.visibleObjects);
    }

    /**
     * Check if an object is visible within the viewport
     * @param {Object} obj - Object to check
     * @returns {boolean} True if object is visible
     */
    isObjectVisible(obj) {
        if (!obj) return false;

        // Get object bounds
        const bounds = this.getObjectBounds(obj);
        if (!bounds) return true; // If we can't determine bounds, assume visible

        // Check if object bounds intersect with viewport bounds
        return !(bounds.right < this.viewportBounds.left ||
                bounds.left > this.viewportBounds.right ||
                bounds.bottom < this.viewportBounds.top ||
                bounds.top > this.viewportBounds.bottom);
    }

    /**
     * Get bounds for an object
     * @param {Object} obj - Object to get bounds for
     * @returns {Object|null} Bounds object with left, top, right, bottom
     */
    getObjectBounds(obj) {
        // Try different methods to get bounds
        if (typeof obj.getBounds === 'function') {
            return obj.getBounds();
        }
        
        if (typeof obj.getWorldBounds === 'function') {
            return obj.getWorldBounds();
        }
        
        // Check for common properties
        if (obj.x !== undefined && obj.y !== undefined) {
            const width = obj.width || obj.w || 0;
            const height = obj.height || obj.h || 0;
            
            return {
                left: obj.x,
                top: obj.y,
                right: obj.x + width,
                bottom: obj.y + height
            };
        }
        
        // Check for position and size properties
        if (obj.position && obj.size) {
            return {
                left: obj.position.x,
                top: obj.position.y,
                right: obj.position.x + obj.size.width,
                bottom: obj.position.y + obj.size.height
            };
        }
        
        // Check for sprite-like objects
        if (obj.sprite && obj.sprite.x !== undefined) {
            const sprite = obj.sprite;
            const width = sprite.width || 0;
            const height = sprite.height || 0;
            
            return {
                left: sprite.x,
                top: sprite.y,
                right: sprite.x + width,
                bottom: sprite.y + height
            };
        }
        
        this.logger.debug('Unable to determine bounds for object', obj.constructor?.name || typeof obj);
        return null;
    }

    /**
     * Update culling statistics
     * @param {number} totalObjects - Total number of objects processed
     */
    updateStats(totalObjects) {
        this.stats.totalObjects = totalObjects;
        this.stats.visibleObjects = this.visibleObjects.size;
        this.stats.culledObjects = this.culledObjects.size;
        this.stats.cullingRatio = totalObjects > 0 ? this.culledObjects.size / totalObjects : 0;
    }

    /**
     * Get culling statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Set culling margin
     * @param {number} margin - Margin in pixels
     */
    setCullingMargin(margin) {
        this.cullingMargin = Math.max(0, margin);
        this.logger.debug(`Culling margin set to ${this.cullingMargin}px`);
    }

    /**
     * Get current viewport bounds
     * @returns {Object} Viewport bounds
     */
    getViewportBounds() {
        return { ...this.viewportBounds };
    }

    /**
     * Check if a point is within the viewport
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is visible
     */
    isPointVisible(x, y) {
        return x >= this.viewportBounds.left &&
               x <= this.viewportBounds.right &&
               y >= this.viewportBounds.top &&
               y <= this.viewportBounds.bottom;
    }

    /**
     * Check if a rectangle is within the viewport
     * @param {number} x - Rectangle X coordinate
     * @param {number} y - Rectangle Y coordinate
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @returns {boolean} True if rectangle is visible
     */
    isRectVisible(x, y, width, height) {
        const bounds = {
            left: x,
            top: y,
            right: x + width,
            bottom: y + height
        };
        
        return !(bounds.right < this.viewportBounds.left ||
                bounds.left > this.viewportBounds.right ||
                bounds.bottom < this.viewportBounds.top ||
                bounds.top > this.viewportBounds.bottom);
    }

    /**
     * Reset culling state
     */
    reset() {
        this.culledObjects.clear();
        this.visibleObjects.clear();
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            cullingRatio: 0
        };
    }

    /**
     * Destroy the culler and clean up resources
     */
    destroy() {
        this.reset();
        this.logger.info('ViewportCuller destroyed');
    }
}
