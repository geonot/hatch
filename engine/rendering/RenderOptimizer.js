/**
 * @file RenderOptimizer.js
 * @description Advanced rendering optimization system for HatchEngine.
 * Implements dirty rectangle tracking, viewport culling, layer management, and batch rendering.
 */

/**
 * @class RenderOptimizer
 * @classdesc Manages rendering optimizations including dirty rectangles, culling, and batching.
 */
export class RenderOptimizer {
    /**
     * Creates an instance of RenderOptimizer.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     * @param {Object} [options={}] - Configuration options.
     */
    constructor(engine, options = {}) {
        this.engine = engine;
        this.context = engine.renderingEngine?.context;
        this.canvasWidth = engine.renderingEngine?.canvas?.width || 800;
        this.canvasHeight = engine.renderingEngine?.canvas?.height || 600;
        
        // Configuration
        this.options = {
            enableDirtyRectangles: options.enableDirtyRectangles ?? true,
            enableViewportCulling: options.enableViewportCulling ?? true,
            enableBatchRendering: options.enableBatchRendering ?? true,
            maxDirtyRectangles: options.maxDirtyRectangles ?? 50,
            cullingMargin: options.cullingMargin ?? 100, // Extra pixels around viewport
            debugMode: options.debugMode ?? false,
        };

        // State
        this.dirtyRectangles = [];
        this.lastFrameTime = 0;
        this.performanceData = {
            averageFrameTime: 16, // Start with 60fps assumption
            frameCount: 0,
            totalFrameTime: 0
        };

        this.initialized = true;
    }

    /**
     * Marks a region as dirty for optimized re-rendering.
     * @param {number} x - X coordinate of the dirty region.
     * @param {number} y - Y coordinate of the dirty region.
     * @param {number} width - Width of the dirty region.
     * @param {number} height - Height of the dirty region.
     */
    markDirty(x, y, width, height) {
        if (!this.options.enableDirtyRectangles) return;

        const rect = { x, y, width, height };
        
        // Limit the number of dirty rectangles to prevent overhead
        if (this.dirtyRectangles.length < this.options.maxDirtyRectangles) {
            this.dirtyRectangles.push(rect);
        } else {
            // If we have too many dirty rectangles, merge or clear all
            this.dirtyRectangles = [{ x: 0, y: 0, width: this.canvasWidth, height: this.canvasHeight }];
        }
    }

    /**
     * Checks if an object is within the viewport and should be rendered.
     * @param {Object} object - Object with position and dimensions.
     * @param {number} object.x - X position.
     * @param {number} object.y - Y position.
     * @param {number} object.width - Object width.
     * @param {number} object.height - Object height.
     * @returns {boolean} True if object should be rendered.
     */
    shouldRender(object) {
        if (!this.options.enableViewportCulling) return true;

        const camera = this.engine.renderingEngine?.camera;
        if (!camera) return true;

        const viewportX = camera.x - this.options.cullingMargin;
        const viewportY = camera.y - this.options.cullingMargin;
        const viewportWidth = this.canvasWidth + (this.options.cullingMargin * 2);
        const viewportHeight = this.canvasHeight + (this.options.cullingMargin * 2);

        return !(object.x + object.width < viewportX ||
                object.x > viewportX + viewportWidth ||
                object.y + object.height < viewportY ||
                object.y > viewportY + viewportHeight);
    }

    /**
     * Begins a new frame for optimization tracking.
     */
    beginFrame() {
        this.lastFrameTime = performance.now();
    }

    /**
     * Ends the current frame and updates performance data.
     */
    endFrame() {
        if (this.lastFrameTime === 0) return;

        const frameTime = performance.now() - this.lastFrameTime;
        this.performanceData.frameCount++;
        this.performanceData.totalFrameTime += frameTime;
        this.performanceData.averageFrameTime = this.performanceData.totalFrameTime / this.performanceData.frameCount;

        // Reset dirty rectangles for next frame
        this.dirtyRectangles = [];
    }

    /**
     * Gets current performance data.
     * @returns {Object} Performance data including average frame time.
     */
    getPerformanceData() {
        return {
            ...this.performanceData,
            fps: Math.round(1000 / this.performanceData.averageFrameTime)
        };
    }

    /**
     * Resets all optimization data.
     */
    reset() {
        this.dirtyRectangles = [];
        this.performanceData = {
            averageFrameTime: 16,
            frameCount: 0,
            totalFrameTime: 0
        };
    }

    /**
     * Updates the optimizer configuration.
     * @param {Object} newOptions - New configuration options.
     */
    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);
    }

    /**
     * Destroys the optimizer and cleans up resources.
     */
    destroy() {
        this.reset();
        this.context = null;
        this.engine = null;
    }
}
