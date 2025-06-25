import { UIComponent } from './UIComponent.js';

/**
 * UIProgressBar - Progress indicator component with customizable styling and animations
 * Eliminates boilerplate for progress visualization, value tracking, and smooth transitions
 */
export class UIProgressBar extends UIComponent {
    constructor(config = {}) {
        super('progressbar', config);
        
        // Progress properties
        this.value = config.value !== undefined ? config.value : 0; // Current value (0-100)
        this.minValue = config.minValue !== undefined ? config.minValue : 0;
        this.maxValue = config.maxValue !== undefined ? config.maxValue : 100;
        this.step = config.step !== undefined ? config.step : 1;
        
        // Visual properties
        this.backgroundColor = config.backgroundColor || '#E9ECEF';
        this.progressColor = config.progressColor || '#007BFF';
        this.borderColor = config.borderColor || '#DEE2E6';
        this.borderWidth = config.borderWidth !== undefined ? config.borderWidth : 1;
        this.borderRadius = config.borderRadius !== undefined ? config.borderRadius : 4;
        
        // Text properties
        this.showText = config.showText !== false;
        this.textTemplate = config.textTemplate || '{value}%'; // {value}, {percent}, {fraction}
        this.textColor = config.textColor || '#FFFFFF';
        this.textFont = config.textFont || '12px Arial';
        this.textShadow = config.textShadow || null; // { offsetX, offsetY, blur, color }
        
        // Gradient support
        this.gradient = config.gradient || null; // { colors: ['#color1', '#color2'], direction: 'horizontal' }
        
        // Animation properties
        this.animated = config.animated !== false;
        this.animationDuration = config.animationDuration || 300;
        this.easing = config.easing || 'ease-out'; // 'linear', 'ease-in', 'ease-out', 'ease-in-out'
        
        // Striped animation
        this.striped = config.striped || false;
        this.stripeColor = config.stripeColor || 'rgba(255, 255, 255, 0.15)';
        this.stripeWidth = config.stripeWidth || 20;
        this.stripeSpeed = config.stripeSpeed || 1000; // milliseconds for full cycle
        
        // Pulse animation
        this.pulse = config.pulse || false;
        this.pulseSpeed = config.pulseSpeed || 2000;
        
        // State
        this.direction = config.direction || 'horizontal'; // 'horizontal', 'vertical'
        this.indeterminate = config.indeterminate || false; // Loading spinner style
        
        // Animation state
        this._targetValue = this.value;
        this._animationStartTime = null;
        this._animationStartValue = this.value;
        this._stripeOffset = 0;
        this._pulsePhase = 0;
        
        // Events
        this.onChange = config.onChange || (() => {});
        this.onComplete = config.onComplete || (() => {});
        
        // Auto-size to text if no explicit height given
        if (!config.height && this.direction === 'horizontal') {
            this.height = 24;
        }
        if (!config.width && this.direction === 'vertical') {
            this.width = 24;
        }
    }

    /**
     * Set the progress value with optional animation
     */
    setValue(value, animate = this.animated) {
        const clampedValue = Math.max(this.minValue, Math.min(this.maxValue, value));
        const oldValue = this.value;
        
        if (animate && clampedValue !== this.value) {
            this._targetValue = clampedValue;
            this._animationStartTime = Date.now();
            this._animationStartValue = this.value;
        } else {
            this.value = clampedValue;
            this._targetValue = clampedValue;
        }
        
        if (oldValue !== clampedValue) {
            this.onChange(clampedValue, oldValue, this);
            
            if (clampedValue >= this.maxValue) {
                this.onComplete(this);
            }
        }
        
        this._invalidate();
        return this;
    }

    /**
     * Increment the progress value
     */
    increment(amount = this.step, animate = this.animated) {
        return this.setValue(this.value + amount, animate);
    }

    /**
     * Decrement the progress value
     */
    decrement(amount = this.step, animate = this.animated) {
        return this.setValue(this.value - amount, animate);
    }

    /**
     * Get progress as percentage (0-100)
     */
    getPercent() {
        const range = this.maxValue - this.minValue;
        return range > 0 ? ((this.value - this.minValue) / range) * 100 : 0;
    }

    /**
     * Get progress as fraction (0-1)
     */
    getFraction() {
        const range = this.maxValue - this.minValue;
        return range > 0 ? (this.value - this.minValue) / range : 0;
    }

    /**
     * Update animation state
     */
    update(deltaTime) {
        let needsRedraw = false;
        
        // Update value animation
        if (this._animationStartTime && this.value !== this._targetValue) {
            const elapsed = Date.now() - this._animationStartTime;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            const easedProgress = this._applyEasing(progress);
            
            this.value = this._animationStartValue + 
                (this._targetValue - this._animationStartValue) * easedProgress;
            
            if (progress >= 1) {
                this.value = this._targetValue;
                this._animationStartTime = null;
            }
            
            needsRedraw = true;
        }
        
        // Update stripe animation
        if (this.striped) {
            this._stripeOffset = (Date.now() % this.stripeSpeed) / this.stripeSpeed;
            needsRedraw = true;
        }
        
        // Update pulse animation
        if (this.pulse) {
            this._pulsePhase = (Date.now() % this.pulseSpeed) / this.pulseSpeed;
            needsRedraw = true;
        }
        
        if (needsRedraw) {
            this._invalidate();
        }
    }

    /**
     * Apply easing function to animation progress
     */
    _applyEasing(t) {
        switch (this.easing) {
            case 'linear':
                return t;
            case 'ease-in':
                return t * t;
            case 'ease-out':
                return 1 - (1 - t) * (1 - t);
            case 'ease-in-out':
                return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
            default:
                return t;
        }
    }

    /**
     * Get text to display on progress bar
     */
    _getDisplayText() {
        if (!this.showText) return '';
        
        const percent = Math.round(this.getPercent());
        const fraction = this.getFraction().toFixed(2);
        const value = Math.round(this.value);
        
        return this.textTemplate
            .replace('{percent}', percent)
            .replace('{value}', value)
            .replace('{fraction}', fraction);
    }

    /**
     * Create gradient for progress bar
     */
    _createGradient(ctx, x, y, width, height) {
        if (!this.gradient) return this.progressColor;
        
        const gradient = this.direction === 'horizontal' ?
            ctx.createLinearGradient(x, y, x + width, y) :
            ctx.createLinearGradient(x, y, x, y + height);
        
        this.gradient.colors.forEach((color, index) => {
            gradient.addColorStop(index / (this.gradient.colors.length - 1), color);
        });
        
        return gradient;
    }

    /**
     * Draw striped pattern
     */
    _drawStripes(ctx, x, y, width, height) {
        if (!this.striped) return;
        
        ctx.save();
        
        // Create stripe pattern
        const stripeCanvas = document.createElement('canvas');
        const stripeCtx = stripeCanvas.getContext('2d');
        stripeCanvas.width = this.stripeWidth * 2;
        stripeCanvas.height = this.stripeWidth * 2;
        
        // Draw diagonal stripes
        stripeCtx.fillStyle = this.stripeColor;
        for (let i = -this.stripeWidth; i < stripeCanvas.width + this.stripeWidth; i += this.stripeWidth) {
            stripeCtx.fillRect(i, 0, this.stripeWidth / 2, stripeCanvas.height);
        }
        
        // Create pattern and apply animation offset
        const pattern = ctx.createPattern(stripeCanvas, 'repeat');
        ctx.fillStyle = pattern;
        
        // Apply animation offset
        const offsetX = this._stripeOffset * this.stripeWidth * 2;
        const offsetY = 0;
        ctx.translate(offsetX, offsetY);
        
        // Clip to progress area
        ctx.beginPath();
        if (this.borderRadius > 0) {
            this._drawRoundedRect(ctx, x - offsetX, y - offsetY, width, height, this.borderRadius);
        } else {
            ctx.rect(x - offsetX, y - offsetY, width, height);
        }
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Render the progress bar
     */
    render(ctx) {
        if (!this.visible) return;
        
        const bounds = this.getBounds();
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Draw background
        if (this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor;
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Draw border
        if (this.borderWidth > 0 && this.borderColor) {
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = this.borderWidth;
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Calculate progress area
        const padding = this.borderWidth;
        const progressX = bounds.x + padding;
        const progressY = bounds.y + padding;
        const progressAreaWidth = bounds.width - padding * 2;
        const progressAreaHeight = bounds.height - padding * 2;
        
        // Draw progress
        if (this.indeterminate) {
            this._drawIndeterminate(ctx, progressX, progressY, progressAreaWidth, progressAreaHeight);
        } else {
            this._drawDeterminate(ctx, progressX, progressY, progressAreaWidth, progressAreaHeight);
        }
        
        // Draw text
        if (this.showText && !this.indeterminate) {
            const text = this._getDisplayText();
            if (text) {
                ctx.fillStyle = this.textColor;
                ctx.font = this.textFont;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Apply text shadow
                if (this.textShadow) {
                    ctx.save();
                    ctx.shadowOffsetX = this.textShadow.offsetX;
                    ctx.shadowOffsetY = this.textShadow.offsetY;
                    ctx.shadowBlur = this.textShadow.blur;
                    ctx.shadowColor = this.textShadow.color;
                }
                
                ctx.fillText(text, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
                
                if (this.textShadow) {
                    ctx.restore();
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * Draw determinate progress bar
     */
    _drawDeterminate(ctx, x, y, areaWidth, areaHeight) {
        const fraction = this.getFraction();
        
        let progressWidth, progressHeight;
        if (this.direction === 'horizontal') {
            progressWidth = areaWidth * fraction;
            progressHeight = areaHeight;
        } else {
            progressWidth = areaWidth;
            progressHeight = areaHeight * fraction;
            y = y + areaHeight - progressHeight; // Start from bottom for vertical
        }
        
        if (progressWidth > 0 && progressHeight > 0) {
            // Apply pulse effect
            let alpha = 1;
            if (this.pulse) {
                alpha = 0.7 + 0.3 * Math.sin(this._pulsePhase * Math.PI * 2);
            }
            
            ctx.save();
            ctx.globalAlpha *= alpha;
            
            // Create gradient or use solid color
            ctx.fillStyle = this._createGradient(ctx, x, y, progressWidth, progressHeight);
            
            // Clip to progress area
            ctx.beginPath();
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, x, y, progressWidth, progressHeight, Math.max(0, this.borderRadius - this.borderWidth));
            } else {
                ctx.rect(x, y, progressWidth, progressHeight);
            }
            ctx.fill();
            
            // Draw stripes
            this._drawStripes(ctx, x, y, progressWidth, progressHeight);
            
            ctx.restore();
        }
    }

    /**
     * Draw indeterminate progress bar (loading animation)
     */
    _drawIndeterminate(ctx, x, y, areaWidth, areaHeight) {
        const animationTime = (Date.now() % 2000) / 2000; // 2-second cycle
        
        if (this.direction === 'horizontal') {
            const barWidth = areaWidth * 0.3; // 30% of total width
            const position = (areaWidth + barWidth) * animationTime - barWidth;
            
            ctx.fillStyle = this._createGradient(ctx, x + position, y, barWidth, areaHeight);
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, x + position, y, barWidth, areaHeight, Math.max(0, this.borderRadius - this.borderWidth));
                ctx.fill();
            } else {
                ctx.fillRect(x + position, y, barWidth, areaHeight);
            }
        } else {
            const barHeight = areaHeight * 0.3; // 30% of total height
            const position = (areaHeight + barHeight) * animationTime - barHeight;
            
            ctx.fillStyle = this._createGradient(ctx, x, y + position, areaWidth, barHeight);
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, x, y + position, areaWidth, barHeight, Math.max(0, this.borderRadius - this.borderWidth));
                ctx.fill();
            } else {
                ctx.fillRect(x, y + position, areaWidth, barHeight);
            }
        }
    }

    /**
     * Helper method to draw rounded rectangles
     */
    _drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Preset progress bar styles
     */
    static presets = {
        default: {
            progressColor: '#007BFF',
            backgroundColor: '#E9ECEF',
            borderColor: '#DEE2E6'
        },
        success: {
            progressColor: '#28A745',
            backgroundColor: '#E9ECEF',
            borderColor: '#DEE2E6'
        },
        warning: {
            progressColor: '#FFC107',
            backgroundColor: '#E9ECEF',
            borderColor: '#DEE2E6',
            textColor: '#212529'
        },
        danger: {
            progressColor: '#DC3545',
            backgroundColor: '#E9ECEF',
            borderColor: '#DEE2E6'
        },
        info: {
            progressColor: '#17A2B8',
            backgroundColor: '#E9ECEF',
            borderColor: '#DEE2E6'
        },
        striped: {
            progressColor: '#007BFF',
            backgroundColor: '#E9ECEF',
            striped: true,
            animated: true
        },
        gradient: {
            gradient: {
                colors: ['#007BFF', '#0056B3'],
                direction: 'horizontal'
            },
            backgroundColor: '#E9ECEF'
        },
        minimal: {
            progressColor: '#007BFF',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 0,
            borderRadius: 2
        },
        thick: {
            progressColor: '#007BFF',
            backgroundColor: '#E9ECEF',
            borderRadius: 8,
            height: 32
        }
    };

    /**
     * Create progress bar with preset style
     */
    static create(preset = 'default', additionalConfig = {}) {
        const presetConfig = UIProgressBar.presets[preset] || UIProgressBar.presets.default;
        const config = { ...presetConfig, ...additionalConfig };
        return new UIProgressBar(config);
    }
}
