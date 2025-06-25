/**
 * @file UIButton.js
 * @description Button component for the Hatch engine UI system
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UIButton
 * @classdesc Interactive button component with text, styling, and click handling
 */
export class UIButton extends UIComponent {
    constructor(config = {}) {
        super('button', config);
        
        // Button-specific properties
        this.text = config.text || 'Button';
        this.font = config.font || '16px Arial';
        this.textColor = config.textColor || '#333333';
        this.textAlign = config.textAlign || 'center';
        this.textBaseline = config.textBaseline || 'middle';
        
        // Button states styling
        this.normalStyle = {
            backgroundColor: config.backgroundColor || '#f0f0f0',
            borderColor: config.borderColor || '#cccccc',
            textColor: config.textColor || '#333333'
        };
        
        this.hoverStyle = {
            backgroundColor: config.hoverBackgroundColor || '#e0e0e0',
            borderColor: config.hoverBorderColor || '#999999',
            textColor: config.hoverTextColor || '#333333'
        };
        
        this.pressedStyle = {
            backgroundColor: config.pressedBackgroundColor || '#d0d0d0',
            borderColor: config.pressedBorderColor || '#888888',
            textColor: config.pressedTextColor || '#333333'
        };
        
        this.disabledStyle = {
            backgroundColor: config.disabledBackgroundColor || '#f8f8f8',
            borderColor: config.disabledBorderColor || '#e0e0e0',
            textColor: config.disabledTextColor || '#cccccc'
        };
        
        // Default button styling
        this.borderWidth = config.borderWidth !== undefined ? config.borderWidth : 1;
        this.borderRadius = config.borderRadius !== undefined ? config.borderRadius : 4;
        this.padding = config.padding || { top: 8, right: 16, bottom: 8, left: 16 };
        
        // Auto-size to text if no explicit size given
        if (!config.width || !config.height) {
            this._autoSizeToText();
        }
    }

    /**
     * Set the button text and optionally auto-resize
     */
    setText(text, autoResize = true) {
        this.text = text;
        if (autoResize) {
            this._autoSizeToText();
        }
        this._invalidate();
        return this;
    }

    /**
     * Set the button font and optionally auto-resize
     */
    setFont(font, autoResize = true) {
        this.font = font;
        if (autoResize) {
            this._autoSizeToText();
        }
        this._invalidate();
        return this;
    }

    /**
     * Auto-size the button to fit its text content
     */
    _autoSizeToText() {
        if (!this.text) return;
        
        // Create a temporary canvas to measure text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = this.font;
        
        const textMetrics = ctx.measureText(this.text);
        const textWidth = textMetrics.width;
        const textHeight = parseInt(this.font) || 16; // Approximate height from font size
        
        // Add padding to get button size
        this.width = textWidth + this.padding.left + this.padding.right;
        this.height = textHeight + this.padding.top + this.padding.bottom;
        
        this._invalidate();
    }

    /**
     * Get current style based on button state
     */
    _getCurrentStyle() {
        if (!this.enabled) {
            return this.disabledStyle;
        } else if (this.pressed) {
            return this.pressedStyle;
        } else if (this.hovered) {
            return this.hoverStyle;
        } else {
            return this.normalStyle;
        }
    }

    /**
     * Handle mouse enter event
     */
    onMouseEnter() {
        if (this.enabled) {
            this.hovered = true;
            this._invalidate();
        }
    }

    /**
     * Handle mouse leave event
     */
    onMouseLeave() {
        this.hovered = false;
        this.pressed = false;
        this._invalidate();
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(event) {
        if (this.enabled) {
            this.pressed = true;
            this._invalidate();
            this.trigger('press', { component: this, event });
        }
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(event) {
        if (this.enabled && this.pressed) {
            this.pressed = false;
            this._invalidate();
            this.trigger('release', { component: this, event });
            
            // Only trigger click if mouse is still over the button
            if (this.hovered) {
                this.trigger('click', { component: this, event });
            }
        }
    }

    /**
     * Handle click event
     */
    onClick(event) {
        if (this.enabled) {
            this.trigger('click', { component: this, event });
        }
    }

    /**
     * Render the button
     */
    render(ctx) {
        if (!this.visible) return;
        
        const bounds = this.getBounds();
        const style = this._getCurrentStyle();
        
        ctx.save();
        
        // Apply opacity
        ctx.globalAlpha = this.opacity;
        
        // Draw background
        if (style.backgroundColor) {
            ctx.fillStyle = style.backgroundColor;
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Draw border
        if (this.borderWidth > 0 && style.borderColor) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = this.borderWidth;
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Draw text
        if (this.text) {
            ctx.fillStyle = style.textColor;
            ctx.font = this.font;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            
            const textX = bounds.x + bounds.width / 2;
            const textY = bounds.y + bounds.height / 2;
            
            ctx.fillText(this.text, textX, textY);
        }
        
        ctx.restore();
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
}
