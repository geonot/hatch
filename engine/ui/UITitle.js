/**
 * @file UITitle.js
 * @description Title component for displaying prominent headings and titles in the Hatch engine UI system
 */

import { UILabel } from './UILabel.js';

/**
 * @class UITitle
 * @classdesc Specialized label component for titles and headings with enhanced styling options
 */
export class UITitle extends UILabel {
    constructor(config = {}) {
        // Apply title-specific defaults
        const titleConfig = {
            font: '32px Arial Black',
            textColor: '#222222',
            textAlign: 'center',
            textBaseline: 'middle',
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            ...config
        };
        
        super(titleConfig);
        
        // Title-specific properties
        this.level = config.level || 1; // 1-6 like HTML h1-h6
        this.shadow = config.shadow !== false; // Enable shadow by default
        this.shadowColor = config.shadowColor || 'rgba(0, 0, 0, 0.3)';
        this.shadowOffsetX = config.shadowOffsetX || 2;
        this.shadowOffsetY = config.shadowOffsetY || 2;
        this.shadowBlur = config.shadowBlur || 4;
        
        // Stroke/outline properties
        this.stroke = config.stroke || false;
        this.strokeColor = config.strokeColor || '#000000';
        this.strokeWidth = config.strokeWidth || 2;
        
        // Gradient support
        this.gradient = config.gradient || null; // { start: '#color1', end: '#color2', direction: 'vertical|horizontal' }
        
        // Animation properties
        this.animated = config.animated || false;
        this.animationType = config.animationType || 'none'; // 'none', 'glow', 'pulse', 'typewriter'
        this.animationSpeed = config.animationSpeed || 1.0;
        this._animationTime = 0;
        this._typewriterIndex = 0;
        this._originalText = this.text;
        
        // Apply level-based styling if not overridden
        if (!config.font) {
            this._applyLevelStyling();
        }
    }

    /**
     * Apply default styling based on title level (h1-h6 style)
     */
    _applyLevelStyling() {
        const levelStyles = {
            1: { font: '36px Arial Black', padding: { top: 24, right: 24, bottom: 24, left: 24 } },
            2: { font: '28px Arial Bold', padding: { top: 20, right: 20, bottom: 20, left: 20 } },
            3: { font: '24px Arial Bold', padding: { top: 16, right: 16, bottom: 16, left: 16 } },
            4: { font: '20px Arial Bold', padding: { top: 12, right: 12, bottom: 12, left: 12 } },
            5: { font: '18px Arial Bold', padding: { top: 10, right: 10, bottom: 10, left: 10 } },
            6: { font: '16px Arial Bold', padding: { top: 8, right: 8, bottom: 8, left: 8 } }
        };
        
        const style = levelStyles[this.level] || levelStyles[1];
        this.font = style.font;
        this.padding = { ...this.padding, ...style.padding };
        this._needsTextLayout = true;
    }

    /**
     * Set the title level (1-6) and apply appropriate styling
     */
    setLevel(level) {
        this.level = Math.max(1, Math.min(6, level));
        this._applyLevelStyling();
        this._autoSizeToText();
        this._invalidate();
        return this;
    }

    /**
     * Enable/disable shadow effect
     */
    setShadow(enabled, color = null, offsetX = null, offsetY = null, blur = null) {
        this.shadow = enabled;
        if (color !== null) this.shadowColor = color;
        if (offsetX !== null) this.shadowOffsetX = offsetX;
        if (offsetY !== null) this.shadowOffsetY = offsetY;
        if (blur !== null) this.shadowBlur = blur;
        this._invalidate();
        return this;
    }

    /**
     * Enable/disable stroke effect
     */
    setStroke(enabled, color = null, width = null) {
        this.stroke = enabled;
        if (color !== null) this.strokeColor = color;
        if (width !== null) this.strokeWidth = width;
        this._invalidate();
        return this;
    }

    /**
     * Set gradient fill
     */
    setGradient(startColor, endColor, direction = 'vertical') {
        this.gradient = { start: startColor, end: endColor, direction };
        this._invalidate();
        return this;
    }

    /**
     * Remove gradient fill
     */
    clearGradient() {
        this.gradient = null;
        this._invalidate();
        return this;
    }

    /**
     * Start title animation
     */
    startAnimation(type = 'glow', speed = 1.0) {
        this.animated = true;
        this.animationType = type;
        this.animationSpeed = speed;
        this._animationTime = 0;
        
        if (type === 'typewriter') {
            this._typewriterIndex = 0;
            this._originalText = this.text;
            this.text = '';
            this._needsTextLayout = true;
        }
        
        return this;
    }

    /**
     * Stop title animation
     */
    stopAnimation() {
        this.animated = false;
        this._animationTime = 0;
        
        if (this.animationType === 'typewriter') {
            this.text = this._originalText;
            this._needsTextLayout = true;
        }
        
        return this;
    }

    /**
     * Update animation state
     */
    update(deltaTime) {
        if (!this.animated) return;
        
        this._animationTime += deltaTime * this.animationSpeed;
        
        switch (this.animationType) {
            case 'typewriter':
                this._updateTypewriterAnimation();
                break;
            case 'pulse':
            case 'glow':
                // These are handled in render method
                this._invalidate();
                break;
        }
    }

    /**
     * Update typewriter animation
     */
    _updateTypewriterAnimation() {
        const targetIndex = Math.floor(this._animationTime * 20); // 20 chars per second
        if (targetIndex > this._typewriterIndex && this._typewriterIndex < this._originalText.length) {
            this._typewriterIndex = Math.min(targetIndex, this._originalText.length);
            this.text = this._originalText.substring(0, this._typewriterIndex);
            this._needsTextLayout = true;
            this._invalidate();
        }
    }

    /**
     * Create gradient for text
     */
    _createTextGradient(ctx, bounds) {
        if (!this.gradient) return this.textColor;
        
        let gradient;
        if (this.gradient.direction === 'horizontal') {
            gradient = ctx.createLinearGradient(bounds.x, 0, bounds.x + bounds.width, 0);
        } else {
            gradient = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.height);
        }
        
        gradient.addColorStop(0, this.gradient.start);
        gradient.addColorStop(1, this.gradient.end);
        
        return gradient;
    }

    /**
     * Get animated opacity for pulse/glow effects
     */
    _getAnimatedOpacity() {
        if (!this.animated) return this.opacity;
        
        switch (this.animationType) {
            case 'pulse':
                return this.opacity * (0.6 + 0.4 * Math.abs(Math.sin(this._animationTime * 3)));
            case 'glow':
                return this.opacity * (0.8 + 0.2 * Math.abs(Math.sin(this._animationTime * 2)));
            default:
                return this.opacity;
        }
    }

    /**
     * Get animated scale for pulse effect
     */
    _getAnimatedScale() {
        if (!this.animated || this.animationType !== 'pulse') return 1.0;
        return 1.0 + 0.05 * Math.abs(Math.sin(this._animationTime * 3));
    }

    /**
     * Render the title with enhanced styling
     */
    render(ctx) {
        if (!this.visible) return;
        
        const bounds = this.getBounds();
        const animatedOpacity = this._getAnimatedOpacity();
        const animatedScale = this._getAnimatedScale();
        
        ctx.save();
        
        // Apply opacity
        ctx.globalAlpha = animatedOpacity;
        
        // Apply scale for pulse animation
        if (animatedScale !== 1.0) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(animatedScale, animatedScale);
            ctx.translate(-centerX, -centerY);
        }
        
        // Draw background if specified
        if (this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor;
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Draw border if specified
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
        
        // Draw text with enhanced styling
        if (this.text) {
            this._layoutText();
            
            ctx.font = this.font;
            ctx.textBaseline = 'top';
            
            // Calculate text area bounds
            const textX = bounds.x + this.padding.left;
            let textY = bounds.y + this.padding.top;
            
            // Apply vertical alignment
            if (this.textBaseline === 'middle') {
                textY += (bounds.height - this.padding.top - this.padding.bottom - this._textHeight) / 2;
            } else if (this.textBaseline === 'bottom') {
                textY += bounds.height - this.padding.bottom - this._textHeight;
            }
            
            // Render each line with enhanced styling
            for (const line of this._textLines) {
                let lineX = textX;
                
                // Apply horizontal alignment
                if (this.textAlign === 'center') {
                    lineX += (bounds.width - this.padding.left - this.padding.right - line.width) / 2;
                } else if (this.textAlign === 'right') {
                    lineX += bounds.width - this.padding.right - line.width;
                }
                
                // Draw shadow if enabled
                if (this.shadow) {
                    ctx.save();
                    ctx.shadowColor = this.shadowColor;
                    ctx.shadowOffsetX = this.shadowOffsetX;
                    ctx.shadowOffsetY = this.shadowOffsetY;
                    ctx.shadowBlur = this.shadowBlur;
                    
                    // Create gradient or use solid color
                    ctx.fillStyle = this._createTextGradient(ctx, bounds);
                    ctx.fillText(line.text, lineX, textY);
                    
                    ctx.restore();
                } else {
                    // No shadow - direct rendering
                    ctx.fillStyle = this._createTextGradient(ctx, bounds);
                    ctx.fillText(line.text, lineX, textY);
                }
                
                // Draw stroke if enabled
                if (this.stroke) {
                    ctx.strokeStyle = this.strokeColor;
                    ctx.lineWidth = this.strokeWidth;
                    ctx.strokeText(line.text, lineX, textY);
                }
                
                textY += line.height;
            }
        }
        
        ctx.restore();
    }

    /**
     * Create a preset title style
     */
    static createPreset(type, text, config = {}) {
        const presets = {
            'game-title': {
                level: 1,
                textColor: '#FFD700',
                shadow: true,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
                shadowOffsetX: 3,
                shadowOffsetY: 3,
                shadowBlur: 6,
                stroke: true,
                strokeColor: '#000000',
                strokeWidth: 2
            },
            'section-header': {
                level: 2,
                textColor: '#333333',
                shadow: true,
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowOffsetX: 1,
                shadowOffsetY: 1,
                shadowBlur: 2
            },
            'win-message': {
                level: 1,
                textColor: '#00AA00',
                animated: true,
                animationType: 'glow',
                shadow: true,
                shadowColor: 'rgba(0, 170, 0, 0.5)',
                shadowBlur: 8
            },
            'lose-message': {
                level: 1,
                textColor: '#AA0000',
                animated: true,
                animationType: 'pulse',
                shadow: true,
                shadowColor: 'rgba(170, 0, 0, 0.5)',
                shadowBlur: 8
            },
            'retro': {
                level: 1,
                font: '32px monospace',
                textColor: '#00FF00',
                backgroundColor: '#000000',
                padding: { top: 16, right: 24, bottom: 16, left: 24 },
                borderColor: '#00FF00',
                borderWidth: 2
            }
        };
        
        const presetConfig = presets[type] || {};
        return new UITitle({ text, ...presetConfig, ...config });
    }
}
