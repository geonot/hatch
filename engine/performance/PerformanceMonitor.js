/**
 * @file PerformanceMonitor.js
 * @description Automated performance monitoring with smart alerts and optimization suggestions
 */

/**
 * @class PerformanceMonitor
 * @classdesc Monitors game performance and provides optimization suggestions
 */
export class PerformanceMonitor {
    constructor(engine) {
        this.engine = engine;
        this.enabled = true;
        this.startTime = performance.now();
        this.metrics = {
            fps: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                history: [],
                target: 60
            },
            frameTime: {
                current: 0,
                average: 0,
                max: 0,
                history: []
            },
            memory: {
                used: 0,
                total: 0,
                peak: 0,
                history: []
            },
            drawCalls: {
                count: 0,
                history: []
            },
            assets: {
                loaded: 0,
                memory: 0,
                errors: 0
            },
            scenes: {
                switches: 0,
                loadTime: []
            }
        };
        
        this.thresholds = {
            fps: {
                warning: 45,
                critical: 30
            },
            frameTime: {
                warning: 20,
                critical: 33
            },
            memory: {
                warning: 0.8,
                critical: 0.9
            }
        };
        
        this.alerts = [];
        this.suggestions = [];
        this.isCollecting = false;
        this.sampleInterval = 1000; // 1 second
        this.historyLength = 60; // Keep 60 samples
        this.autoOptimize = false;
        
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.sampleStartTime = performance.now();
        
        this._setupMonitoring();
    }

    /**
     * Start performance monitoring
     * @param {Object} options - Monitoring options
     */
    start(options = {}) {
        this.enabled = true;
        this.autoOptimize = options.autoOptimize || false;
        this.sampleInterval = options.sampleInterval || 1000;
        
        if (options.thresholds) {
            this.thresholds = { ...this.thresholds, ...options.thresholds };
        }
        
        console.log('Performance monitoring started', {
            autoOptimize: this.autoOptimize,
            sampleInterval: this.sampleInterval
        });
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        this.enabled = false;
        console.log('Performance monitoring stopped');
    }

    /**
     * Update performance metrics (called each frame)
     * @param {number} deltaTime - Frame delta time
     */
    update(deltaTime) {
        if (!this.enabled) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        this.frameCount++;
        this.metrics.frameTime.current = frameTime;
        this.metrics.frameTime.max = Math.max(this.metrics.frameTime.max, frameTime);
        
        // Calculate FPS
        const elapsed = now - this.sampleStartTime;
        if (elapsed >= this.sampleInterval) {
            this._calculateMetrics(elapsed);
            this._checkThresholds();
            this._updateHistory();
            this._generateSuggestions();
            
            if (this.autoOptimize) {
                this._applyOptimizations();
            }
            
            // Reset for next sample
            this.frameCount = 0;
            this.sampleStartTime = now;
        }
        
        this.lastFrameTime = now;
    }

    /**
     * Get current performance snapshot
     * @returns {Object} Performance metrics
     */
    getSnapshot() {
        return {
            timestamp: performance.now(),
            fps: this.metrics.fps.current,
            frameTime: this.metrics.frameTime.current,
            memory: this.metrics.memory.used,
            status: this._getOverallStatus(),
            alerts: this.alerts.slice(-5), // Last 5 alerts
            suggestions: this.suggestions.slice(-5) // Last 5 suggestions
        };
    }

    /**
     * Get detailed performance report
     * @returns {Object} Detailed performance data
     */
    getReport() {
        const uptime = (performance.now() - this.startTime) / 1000;
        
        return {
            uptime: uptime,
            metrics: this.metrics,
            thresholds: this.thresholds,
            alerts: this.alerts,
            suggestions: this.suggestions,
            averages: {
                fps: this._calculateAverage(this.metrics.fps.history),
                frameTime: this._calculateAverage(this.metrics.frameTime.history),
                memory: this._calculateAverage(this.metrics.memory.history)
            },
            recommendations: this._getRecommendations()
        };
    }

    /**
     * Register a performance event
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    recordEvent(type, data = {}) {
        if (!this.enabled) return;
        
        const event = {
            type,
            timestamp: performance.now(),
            ...data
        };
        
        switch (type) {
            case 'sceneSwitch':
                this.metrics.scenes.switches++;
                if (data.loadTime) {
                    this.metrics.scenes.loadTime.push(data.loadTime);
                }
                break;
                
            case 'assetLoaded':
                this.metrics.assets.loaded++;
                if (data.size) {
                    this.metrics.assets.memory += data.size;
                }
                break;
                
            case 'assetError':
                this.metrics.assets.errors++;
                break;
                
            case 'drawCall':
                this.metrics.drawCalls.count++;
                break;
        }
    }

    /**
     * Add a custom performance alert
     * @param {string} message - Alert message
     * @param {string} severity - Alert severity (info, warning, critical)
     * @param {Object} context - Additional context
     */
    addAlert(message, severity = 'info', context = {}) {
        const alert = {
            message,
            severity,
            timestamp: performance.now(),
            context
        };
        
        this.alerts.push(alert);
        
        // Keep only recent alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-50);
        }
        
        // Log critical alerts
        if (severity === 'critical') {
            console.error('Performance Alert:', alert);
        } else if (severity === 'warning') {
            console.warn('Performance Alert:', alert);
        }
    }

    /**
     * Enable auto-optimization features
     * @param {Object} options - Optimization options
     */
    enableAutoOptimization(options = {}) {
        this.autoOptimize = true;
        this.optimizationOptions = {
            reduceFX: options.reduceFX !== false,
            lowerResolution: options.lowerResolution !== false,
            limitParticles: options.limitParticles !== false,
            cullOffscreen: options.cullOffscreen !== false,
            ...options
        };
    }

    /**
     * Create a performance overlay for debugging
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} Overlay element
     */
    createOverlay(container = document.body) {
        const overlay = document.createElement('div');
        overlay.id = 'hatch-performance-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 4px;
            z-index: 10000;
            min-width: 200px;
        `;
        
        container.appendChild(overlay);
        
        // Update overlay periodically
        const updateOverlay = () => {
            if (!overlay.parentNode) return;
            
            const snapshot = this.getSnapshot();
            const fpsColor = snapshot.fps < this.thresholds.fps.critical ? '#ff4444' :
                            snapshot.fps < this.thresholds.fps.warning ? '#ffaa44' : '#44ff44';
            
            overlay.innerHTML = `
                <div style="color: ${fpsColor}">FPS: ${snapshot.fps.toFixed(1)}</div>
                <div>Frame: ${snapshot.frameTime.toFixed(1)}ms</div>
                <div>Memory: ${(snapshot.memory / 1024 / 1024).toFixed(1)}MB</div>
                <div>Status: ${snapshot.status}</div>
                ${snapshot.alerts.length > 0 ? `<div style="color: #ff4444">⚠ ${snapshot.alerts.length} alerts</div>` : ''}
            `;
            
            setTimeout(updateOverlay, 1000);
        };
        
        updateOverlay();
        return overlay;
    }

    // ===== PRIVATE METHODS =====

    _setupMonitoring() {
        // Monitor memory if available
        if (performance.memory) {
            setInterval(() => {
                if (!this.enabled) return;
                
                this.metrics.memory.used = performance.memory.usedJSHeapSize;
                this.metrics.memory.total = performance.memory.totalJSHeapSize;
                this.metrics.memory.peak = Math.max(this.metrics.memory.peak, this.metrics.memory.used);
            }, 5000);
        }
        
        // Monitor page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.addAlert('Page became hidden - performance monitoring paused', 'info');
            } else {
                this.addAlert('Page became visible - performance monitoring resumed', 'info');
            }
        });
    }

    _calculateMetrics(elapsed) {
        // Calculate FPS
        this.metrics.fps.current = Math.round((this.frameCount * 1000) / elapsed);
        this.metrics.fps.min = Math.min(this.metrics.fps.min, this.metrics.fps.current);
        this.metrics.fps.max = Math.max(this.metrics.fps.max, this.metrics.fps.current);
        
        // Calculate average frame time
        this.metrics.frameTime.average = elapsed / this.frameCount;
    }

    _checkThresholds() {
        const fps = this.metrics.fps.current;
        const frameTime = this.metrics.frameTime.current;
        const memoryRatio = this.metrics.memory.total > 0 ? 
            this.metrics.memory.used / this.metrics.memory.total : 0;
        
        // FPS alerts
        if (fps < this.thresholds.fps.critical) {
            this.addAlert(`Critical FPS drop: ${fps}`, 'critical', { fps });
        } else if (fps < this.thresholds.fps.warning) {
            this.addAlert(`Low FPS: ${fps}`, 'warning', { fps });
        }
        
        // Frame time alerts
        if (frameTime > this.thresholds.frameTime.critical) {
            this.addAlert(`Critical frame time: ${frameTime.toFixed(1)}ms`, 'critical', { frameTime });
        } else if (frameTime > this.thresholds.frameTime.warning) {
            this.addAlert(`High frame time: ${frameTime.toFixed(1)}ms`, 'warning', { frameTime });
        }
        
        // Memory alerts
        if (memoryRatio > this.thresholds.memory.critical) {
            this.addAlert(`Critical memory usage: ${(memoryRatio * 100).toFixed(1)}%`, 'critical', { memoryRatio });
        } else if (memoryRatio > this.thresholds.memory.warning) {
            this.addAlert(`High memory usage: ${(memoryRatio * 100).toFixed(1)}%`, 'warning', { memoryRatio });
        }
    }

    _updateHistory() {
        // Update FPS history
        this.metrics.fps.history.push(this.metrics.fps.current);
        if (this.metrics.fps.history.length > this.historyLength) {
            this.metrics.fps.history.shift();
        }
        
        // Update frame time history
        this.metrics.frameTime.history.push(this.metrics.frameTime.average);
        if (this.metrics.frameTime.history.length > this.historyLength) {
            this.metrics.frameTime.history.shift();
        }
        
        // Update memory history
        if (this.metrics.memory.used > 0) {
            this.metrics.memory.history.push(this.metrics.memory.used);
            if (this.metrics.memory.history.length > this.historyLength) {
                this.metrics.memory.history.shift();
            }
        }
        
        // Calculate averages
        this.metrics.fps.average = this._calculateAverage(this.metrics.fps.history);
        this.metrics.frameTime.average = this._calculateAverage(this.metrics.frameTime.history);
    }

    _generateSuggestions() {
        const suggestions = [];
        
        // FPS-based suggestions
        if (this.metrics.fps.average < this.thresholds.fps.warning) {
            suggestions.push({
                type: 'performance',
                message: 'Consider reducing visual effects or particle count',
                priority: 'high',
                actions: ['reduceFX', 'limitParticles']
            });
        }
        
        // Memory-based suggestions
        const memoryRatio = this.metrics.memory.total > 0 ? 
            this.metrics.memory.used / this.metrics.memory.total : 0;
        
        if (memoryRatio > this.thresholds.memory.warning) {
            suggestions.push({
                type: 'memory',
                message: 'High memory usage detected - consider asset cleanup',
                priority: 'medium',
                actions: ['cleanupAssets', 'optimizeTextures']
            });
        }
        
        // Asset-based suggestions
        if (this.metrics.assets.errors > 5) {
            suggestions.push({
                type: 'assets',
                message: 'Multiple asset loading errors detected',
                priority: 'high',
                actions: ['checkAssetPaths', 'addFallbacks']
            });
        }
        
        // Add new suggestions
        suggestions.forEach(suggestion => {
            suggestion.timestamp = performance.now();
            this.suggestions.push(suggestion);
        });
        
        // Keep only recent suggestions
        if (this.suggestions.length > 50) {
            this.suggestions = this.suggestions.slice(-25);
        }
    }

    _applyOptimizations() {
        if (!this.autoOptimize) return;
        
        const fps = this.metrics.fps.average;
        const memoryRatio = this.metrics.memory.total > 0 ? 
            this.metrics.memory.used / this.metrics.memory.total : 0;
        
        // Auto-reduce effects if FPS is low
        if (fps < this.thresholds.fps.warning && this.optimizationOptions.reduceFX) {
            this.engine.settings.effects.quality = 'low';
            this.addAlert('Auto-optimization: Reduced effect quality', 'info', { optimization: 'reduceFX' });
        }
        
        // Auto-limit particles
        if (fps < this.thresholds.fps.critical && this.optimizationOptions.limitParticles) {
            this.engine.settings.particles.maxCount = Math.floor(this.engine.settings.particles.maxCount * 0.7);
            this.addAlert('Auto-optimization: Limited particle count', 'info', { optimization: 'limitParticles' });
        }
        
        // Auto-cleanup assets if memory is high
        if (memoryRatio > this.thresholds.memory.warning && this.optimizationOptions.cleanupAssets) {
            this._requestAssetCleanup();
        }
    }

    _requestAssetCleanup() {
        if (this.engine.assetManager && typeof this.engine.assetManager.cleanup === 'function') {
            this.engine.assetManager.cleanup();
            this.addAlert('Auto-optimization: Cleaned up unused assets', 'info', { optimization: 'cleanupAssets' });
        }
    }

    _calculateAverage(array) {
        if (array.length === 0) return 0;
        return array.reduce((sum, val) => sum + val, 0) / array.length;
    }

    _getOverallStatus() {
        const fps = this.metrics.fps.current;
        const frameTime = this.metrics.frameTime.current;
        
        if (fps < this.thresholds.fps.critical || frameTime > this.thresholds.frameTime.critical) {
            return 'Critical';
        }
        
        if (fps < this.thresholds.fps.warning || frameTime > this.thresholds.frameTime.warning) {
            return 'Warning';
        }
        
        return 'Good';
    }

    _getRecommendations() {
        const recommendations = [];
        const fps = this.metrics.fps.average;
        const memoryRatio = this.metrics.memory.total > 0 ? 
            this.metrics.memory.used / this.metrics.memory.total : 0;
        
        if (fps < 30) {
            recommendations.push({
                category: 'Performance',
                suggestion: 'Consider reducing render quality or complexity',
                impact: 'High',
                difficulty: 'Medium'
            });
        }
        
        if (memoryRatio > 0.8) {
            recommendations.push({
                category: 'Memory',
                suggestion: 'Implement asset streaming or cleanup unused resources',
                impact: 'High',
                difficulty: 'High'
            });
        }
        
        if (this.metrics.assets.errors > 10) {
            recommendations.push({
                category: 'Assets',
                suggestion: 'Review asset loading pipeline and add error handling',
                impact: 'Medium',
                difficulty: 'Low'
            });
        }
        
        return recommendations;
    }
}

/**
 * @class PerformanceBudget
 * @classdesc Manages performance budgets for different aspects of the game
 */
export class PerformanceBudget {
    constructor() {
        this.budgets = {
            frameTime: 16.67, // 60 FPS target
            memory: 100 * 1024 * 1024, // 100MB
            drawCalls: 100,
            particles: 1000,
            audioSources: 32
        };
        
        this.usage = {
            frameTime: 0,
            memory: 0,
            drawCalls: 0,
            particles: 0,
            audioSources: 0
        };
        
        this.warnings = [];
    }

    /**
     * Set a performance budget
     * @param {string} category - Budget category
     * @param {number} limit - Budget limit
     */
    setBudget(category, limit) {
        this.budgets[category] = limit;
    }

    /**
     * Update usage for a category
     * @param {string} category - Usage category
     * @param {number} amount - Current usage amount
     */
    updateUsage(category, amount) {
        this.usage[category] = amount;
        
        // Check if over budget
        const budget = this.budgets[category];
        if (budget && amount > budget) {
            this.warnings.push({
                category,
                usage: amount,
                budget: budget,
                overBy: amount - budget,
                timestamp: performance.now()
            });
        }
    }

    /**
     * Get current budget status
     * @returns {Object} Budget status
     */
    getStatus() {
        const status = {};
        
        Object.keys(this.budgets).forEach(category => {
            const budget = this.budgets[category];
            const usage = this.usage[category];
            const percentage = budget > 0 ? (usage / budget) * 100 : 0;
            
            status[category] = {
                budget,
                usage,
                percentage: Math.round(percentage),
                status: percentage > 100 ? 'over' : 
                       percentage > 80 ? 'warning' : 'ok'
            };
        });
        
        return status;
    }

    /**
     * Get recent budget warnings
     * @param {number} limit - Number of warnings to return
     * @returns {Array} Recent warnings
     */
    getWarnings(limit = 10) {
        return this.warnings.slice(-limit);
    }

    /**
     * Clear old warnings
     * @param {number} maxAge - Maximum age in milliseconds
     */
    clearOldWarnings(maxAge = 60000) {
        const cutoff = performance.now() - maxAge;
        this.warnings = this.warnings.filter(warning => warning.timestamp > cutoff);
    }
}

/**
 * @class PerformanceProfiler
 * @classdesc Profiles specific functions and code blocks for performance analysis
 */
export class PerformanceProfiler {
    constructor() {
        this.profiles = new Map();
        this.activeProfiles = new Map();
    }

    /**
     * Start profiling a code block
     * @param {string} name - Profile name
     */
    start(name) {
        this.activeProfiles.set(name, {
            startTime: performance.now(),
            calls: (this.profiles.get(name)?.calls || 0) + 1
        });
    }

    /**
     * End profiling a code block
     * @param {string} name - Profile name
     */
    end(name) {
        const active = this.activeProfiles.get(name);
        if (!active) return;
        
        const duration = performance.now() - active.startTime;
        const existing = this.profiles.get(name) || {
            totalTime: 0,
            calls: 0,
            minTime: Infinity,
            maxTime: 0,
            history: []
        };
        
        existing.totalTime += duration;
        existing.calls = active.calls;
        existing.minTime = Math.min(existing.minTime, duration);
        existing.maxTime = Math.max(existing.maxTime, duration);
        existing.averageTime = existing.totalTime / existing.calls;
        existing.history.push(duration);
        
        // Keep only recent history
        if (existing.history.length > 100) {
            existing.history.shift();
        }
        
        this.profiles.set(name, existing);
        this.activeProfiles.delete(name);
    }

    /**
     * Profile a function
     * @param {string} name - Profile name
     * @param {Function} fn - Function to profile
     * @returns {any} Function result
     */
    profile(name, fn) {
        this.start(name);
        try {
            const result = fn();
            this.end(name);
            return result;
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Get profiling results
     * @param {string} name - Profile name (optional)
     * @returns {Object|Map} Profile results
     */
    getResults(name = null) {
        if (name) {
            return this.profiles.get(name);
        }
        return this.profiles;
    }

    /**
     * Clear profiling data
     * @param {string} name - Profile name (optional, clears all if not provided)
     */
    clear(name = null) {
        if (name) {
            this.profiles.delete(name);
            this.activeProfiles.delete(name);
        } else {
            this.profiles.clear();
            this.activeProfiles.clear();
        }
    }
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const performanceBudget = new PerformanceBudget();
export const performanceProfiler = new PerformanceProfiler();
