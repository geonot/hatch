/**
 * @file MemoryLeakDetector.js
 * @description Memory leak detection and object lifecycle tracking for the Hatch engine.
 */

import { getLogger } from '../core/Logger.js';

/**
 * @class MemoryLeakDetector
 * @classdesc Detects memory leaks and tracks object lifecycle in the game engine.
 */
export class MemoryLeakDetector {
    constructor(engine) {
        this.engine = engine;
        this.logger = getLogger('MemoryLeakDetector');
        
        // Object tracking
        this.trackedObjects = new Map();
        this.objectCounts = new Map();
        this.leakThresholds = new Map([
            ['Scene', 10],
            ['Sprite', 1000],
            ['EventListener', 100],
            ['Promise', 50]
        ]);
        
        // Weak references for tracking without preventing GC
        this.weakRefs = new Set();
        
        // Memory baseline
        this.baselineMemory = 0;
        this.memoryGrowthThreshold = 50 * 1024 * 1024; // 50MB
        
        this.enabled = false;
        this.logger.info('MemoryLeakDetector initialized');
    }

    /**
     * Enable memory leak detection
     */
    enable() {
        if (this.enabled) return;
        
        this.enabled = true;
        this.baselineMemory = this.getCurrentMemoryUsage();
        
        // Start periodic checks
        this.checkInterval = setInterval(() => {
            this.performLeakCheck();
        }, 5000);
        
        this.logger.info('Memory leak detection enabled');
    }

    /**
     * Disable memory leak detection
     */
    disable() {
        if (!this.enabled) return;
        
        this.enabled = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.logger.info('Memory leak detection disabled');
    }

    /**
     * Track an object for memory leak detection
     * @param {Object} obj - Object to track
     * @param {string} type - Object type/category
     * @param {string} [id] - Optional ID for the object
     */
    trackObject(obj, type, id = null) {
        if (!this.enabled) return;
        
        const objectId = id || `${type}_${Date.now()}_${Math.random()}`;
        
        this.trackedObjects.set(objectId, {
            type,
            weakRef: new WeakRef(obj),
            createdAt: Date.now(),
            stackTrace: this.captureStackTrace()
        });
        
        // Update counts
        const count = this.objectCounts.get(type) || 0;
        this.objectCounts.set(type, count + 1);
        
        this.logger.debug(`Tracking ${type} object: ${objectId}`);
    }

    /**
     * Untrack an object
     * @param {string} objectId - ID of object to untrack
     */
    untrackObject(objectId) {
        if (!this.enabled) return;
        
        const tracked = this.trackedObjects.get(objectId);
        if (tracked) {
            const count = this.objectCounts.get(tracked.type) || 0;
            this.objectCounts.set(tracked.type, Math.max(0, count - 1));
            this.trackedObjects.delete(objectId);
            
            this.logger.debug(`Untracked ${tracked.type} object: ${objectId}`);
        }
    }

    /**
     * Capture current stack trace for debugging
     * @returns {string} Stack trace
     */
    captureStackTrace() {
        const error = new Error();
        return error.stack || 'Stack trace not available';
    }

    /**
     * Get current memory usage
     * @returns {number} Memory usage in bytes
     */
    getCurrentMemoryUsage() {
        if (typeof performance.memory !== 'undefined') {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Perform a comprehensive leak check
     */
    performLeakCheck() {
        if (!this.enabled) return;
        
        const currentMemory = this.getCurrentMemoryUsage();
        const memoryGrowth = currentMemory - this.baselineMemory;
        
        // Check memory growth
        if (memoryGrowth > this.memoryGrowthThreshold) {
            this.logger.warn(`Significant memory growth detected: ${this.formatBytes(memoryGrowth)}`);
        }
        
        // Clean up dead references
        this.cleanupDeadReferences();
        
        // Check object count thresholds
        for (const [type, threshold] of this.leakThresholds) {
            const count = this.objectCounts.get(type) || 0;
            if (count > threshold) {
                this.logger.warn(`Potential memory leak: ${count} ${type} objects (threshold: ${threshold})`);
            }
        }
        
        // Check for long-lived objects
        this.checkLongLivedObjects();
    }

    /**
     * Clean up dead weak references
     */
    cleanupDeadReferences() {
        let cleanedCount = 0;
        
        for (const [objectId, tracked] of this.trackedObjects) {
            if (tracked.weakRef.deref() === undefined) {
                // Object has been garbage collected
                const count = this.objectCounts.get(tracked.type) || 0;
                this.objectCounts.set(tracked.type, Math.max(0, count - 1));
                this.trackedObjects.delete(objectId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} dead references`);
        }
    }

    /**
     * Check for objects that have been alive for too long
     */
    checkLongLivedObjects() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        const longLived = [];
        
        for (const [objectId, tracked] of this.trackedObjects) {
            const age = now - tracked.createdAt;
            if (age > maxAge && tracked.weakRef.deref() !== undefined) {
                longLived.push({
                    id: objectId,
                    type: tracked.type,
                    age: age,
                    stackTrace: tracked.stackTrace
                });
            }
        }
        
        if (longLived.length > 0) {
            this.logger.warn(`Found ${longLived.length} long-lived objects`);
            for (const obj of longLived.slice(0, 5)) { // Log first 5
                this.logger.debug(`Long-lived ${obj.type}: ${obj.id} (age: ${this.formatTime(obj.age)})`);
            }
        }
    }

    /**
     * Force garbage collection if available (Chrome DevTools)
     */
    forceGarbageCollection() {
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
            this.logger.info('Forced garbage collection');
        } else {
            this.logger.warn('Garbage collection not available');
        }
    }

    /**
     * Generate a memory leak report
     * @returns {Object} Leak detection report
     */
    generateReport() {
        const currentMemory = this.getCurrentMemoryUsage();
        const memoryGrowth = currentMemory - this.baselineMemory;
        
        const report = {
            timestamp: Date.now(),
            memoryUsage: {
                current: currentMemory,
                baseline: this.baselineMemory,
                growth: memoryGrowth,
                growthFormatted: this.formatBytes(memoryGrowth)
            },
            objectCounts: Object.fromEntries(this.objectCounts),
            trackedObjectsCount: this.trackedObjects.size,
            suspiciousObjects: [],
            recommendations: []
        };
        
        // Find suspicious objects
        for (const [type, threshold] of this.leakThresholds) {
            const count = this.objectCounts.get(type) || 0;
            if (count > threshold) {
                report.suspiciousObjects.push({
                    type,
                    count,
                    threshold,
                    severity: count > threshold * 2 ? 'high' : 'medium'
                });
            }
        }
        
        // Generate recommendations
        if (memoryGrowth > this.memoryGrowthThreshold) {
            report.recommendations.push('Consider optimizing memory usage or checking for leaks');
        }
        
        if (report.suspiciousObjects.length > 0) {
            report.recommendations.push('Review object lifecycle management for flagged types');
        }
        
        return report;
    }

    /**
     * Format bytes for human readability
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format time duration for human readability
     * @param {number} ms - Milliseconds to format
     * @returns {string} Formatted string
     */
    formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    /**
     * Clean up detector resources
     */
    destroy() {
        this.disable();
        this.trackedObjects.clear();
        this.objectCounts.clear();
        this.weakRefs.clear();
        
        this.logger.info('MemoryLeakDetector destroyed');
    }
}
