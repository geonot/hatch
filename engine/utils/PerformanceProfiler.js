/**
 * @file PerformanceProfiler.js
 * @description Performance monitoring and profiling system for the Hatch engine.
 * Provides frame timing, memory tracking, and performance analytics.
 */

import { getLogger } from '../core/Logger.js';

/**
 * @class PerformanceProfiler
 * @classdesc Comprehensive performance monitoring system for game engines.
 */
export class PerformanceProfiler {
    constructor(engine) {
        this.engine = engine;
        this.logger = getLogger('PerformanceProfiler');
        
        // Frame timing
        this.frameTimes = [];
        this.maxFrameHistory = 300; // 5 seconds at 60fps
        this.currentFrameStart = 0;
        
        // Performance budgets (in milliseconds)
        this.budgets = new Map([
            ['input', 2],
            ['update', 8],
            ['render', 5],
            ['total', 16.67] // 60fps target
        ]);
        
        // Budget tracking
        this.budgetOverruns = new Map();
        this.activeProfiling = new Map();
        
        // Memory tracking
        this.memorySnapshots = [];
        this.memoryTrackingInterval = null;
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            averageFps: 0,
            frameTime: 0,
            averageFrameTime: 0,
            worstFrameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            objectsRendered: 0
        };
        
        // Event listeners for automated tracking
        this.setupEventListeners();
        
        this.logger.info('PerformanceProfiler initialized');
    }

    setupEventListeners() {
        if (this.engine.eventBus) {
            // Track frame timing automatically
            this.engine.eventBus.on('engine:update', () => {
                this.startBudget('update');
            });
            
            this.engine.eventBus.on('engine:render', () => {
                this.endBudget('update');
                this.startBudget('render');
            });
        }
    }

    /**
     * Start a performance budget timer
     * @param {string} category - Budget category name
     */
    startBudget(category) {
        this.activeProfiling.set(category, {
            startTime: performance.now(),
            category
        });
    }

    /**
     * End a performance budget timer and check for overruns
     * @param {string} category - Budget category name
     */
    endBudget(category) {
        const profilingData = this.activeProfiling.get(category);
        if (!profilingData) return;

        const elapsed = performance.now() - profilingData.startTime;
        const budget = this.budgets.get(category);
        
        this.activeProfiling.delete(category);

        if (budget && elapsed > budget) {
            this.trackBudgetOverrun(category, elapsed - budget);
        }

        return elapsed;
    }

    /**
     * Track budget overruns for performance analysis
     * @param {string} category - Budget category
     * @param {number} overrun - Amount over budget in ms
     */
    trackBudgetOverrun(category, overrun) {
        if (!this.budgetOverruns.has(category)) {
            this.budgetOverruns.set(category, []);
        }
        
        const overruns = this.budgetOverruns.get(category);
        overruns.push({
            timestamp: Date.now(),
            overrun,
            severity: overrun > 5 ? 'critical' : overrun > 2 ? 'warning' : 'minor'
        });
        
        // Keep only recent overruns
        if (overruns.length > 100) {
            overruns.splice(0, overruns.length - 100);
        }
        
        if (overrun > 5) {
            this.logger.warn(`Performance budget overrun in ${category}: ${overrun.toFixed(2)}ms over budget`);
        }
    }

    /**
     * Update frame timing metrics
     * @param {number} deltaTime - Frame delta time in seconds
     */
    updateFrameMetrics(deltaTime) {
        const frameTime = deltaTime * 1000; // Convert to milliseconds
        
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameHistory) {
            this.frameTimes.shift();
        }
        
        // Calculate metrics
        this.metrics.frameTime = frameTime;
        this.metrics.fps = 1 / deltaTime;
        
        if (this.frameTimes.length > 0) {
            const sum = this.frameTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageFrameTime = sum / this.frameTimes.length;
            this.metrics.averageFps = 1000 / this.metrics.averageFrameTime;
            this.metrics.worstFrameTime = Math.max(...this.frameTimes);
        }
        
        // Update rendering metrics from engine
        if (this.engine.renderingEngine?.renderStats) {
            const stats = this.engine.renderingEngine.renderStats;
            this.metrics.drawCalls = stats.drawCalls;
            this.metrics.objectsRendered = stats.objectsRendered;
        }
    }

    /**
     * Start memory tracking at regular intervals
     * @param {number} interval - Tracking interval in milliseconds
     */
    startMemoryTracking(interval = 1000) {
        if (this.memoryTrackingInterval) {
            clearInterval(this.memoryTrackingInterval);
        }
        
        this.memoryTrackingInterval = setInterval(() => {
            this.captureMemorySnapshot();
        }, interval);
        
        this.logger.info(`Memory tracking started with ${interval}ms interval`);
    }

    /**
     * Stop memory tracking
     */
    stopMemoryTracking() {
        if (this.memoryTrackingInterval) {
            clearInterval(this.memoryTrackingInterval);
            this.memoryTrackingInterval = null;
        }
    }

    /**
     * Capture a memory usage snapshot
     */
    captureMemorySnapshot() {
        if (typeof performance.memory !== 'undefined') {
            const snapshot = {
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
            
            this.memorySnapshots.push(snapshot);
            this.metrics.memoryUsage = snapshot.usedJSHeapSize;
            
            // Keep only recent snapshots
            if (this.memorySnapshots.length > 300) {
                this.memorySnapshots.shift();
            }
        }
    }

    /**
     * Analyze performance data and detect issues
     * @returns {Object} Performance analysis report
     */
    analyzePerformance() {
        const analysis = {
            frameRate: {
                status: 'good',
                issues: []
            },
            budgets: {
                status: 'good',
                overruns: []
            },
            memory: {
                status: 'good',
                trend: 'stable',
                issues: []
            },
            recommendations: []
        };

        // Analyze frame rate
        if (this.metrics.averageFps < 30) {
            analysis.frameRate.status = 'critical';
            analysis.frameRate.issues.push('Frame rate below 30 FPS');
            analysis.recommendations.push('Consider reducing rendering complexity');
        } else if (this.metrics.averageFps < 50) {
            analysis.frameRate.status = 'warning';
            analysis.frameRate.issues.push('Frame rate below target 60 FPS');
        }

        // Analyze budget overruns
        for (const [category, overruns] of this.budgetOverruns) {
            const recentOverruns = overruns.filter(o => Date.now() - o.timestamp < 10000);
            if (recentOverruns.length > 5) {
                analysis.budgets.status = 'warning';
                analysis.budgets.overruns.push({
                    category,
                    count: recentOverruns.length,
                    avgOverrun: recentOverruns.reduce((a, b) => a + b.overrun, 0) / recentOverruns.length
                });
            }
        }

        // Analyze memory usage
        if (this.memorySnapshots.length > 10) {
            const recent = this.memorySnapshots.slice(-10);
            const memoryTrend = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
            
            if (memoryTrend > 10 * 1024 * 1024) { // 10MB increase
                analysis.memory.trend = 'increasing';
                analysis.memory.issues.push('Memory usage trending upward');
                analysis.recommendations.push('Check for memory leaks');
            }
            
            if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
                analysis.memory.status = 'warning';
                analysis.memory.issues.push('High memory usage detected');
            }
        }

        return analysis;
    }

    /**
     * Generate a comprehensive performance report
     * @returns {Object} Detailed performance report
     */
    generateReport() {
        const analysis = this.analyzePerformance();
        
        return {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            analysis,
            budgetOverruns: Object.fromEntries(this.budgetOverruns),
            frameTimeHistory: [...this.frameTimes],
            memoryHistory: this.memorySnapshots.slice(-50) // Last 50 samples
        };
    }

    /**
     * Export performance data for external analysis
     * @param {string} format - Export format ('json' or 'csv')
     * @returns {string} Formatted performance data
     */
    exportData(format = 'json') {
        const report = this.generateReport();
        
        if (format === 'csv') {
            // Convert to CSV format
            const headers = ['timestamp', 'fps', 'frameTime', 'memoryUsage', 'drawCalls'];
            const data = this.frameTimes.map((frameTime, index) => [
                Date.now() - (this.frameTimes.length - index) * 16.67,
                1000 / frameTime,
                frameTime,
                this.memorySnapshots[index]?.usedJSHeapSize || 0,
                this.metrics.drawCalls
            ]);
            
            return [headers, ...data].map(row => row.join(',')).join('\n');
        }
        
        return JSON.stringify(report, null, 2);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopMemoryTracking();
        this.frameTimes = [];
        this.memorySnapshots = [];
        this.budgetOverruns.clear();
        this.activeProfiling.clear();
        
        this.logger.info('PerformanceProfiler destroyed');
    }
}
