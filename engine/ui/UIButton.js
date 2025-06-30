/**
 * @file UIButton.js
 * @description Enhanced button component for the Hatch engine UI system with theme support
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UIButton
 * @classdesc Interactive button component with text, styling, theme support, and click handling
 */
export class UIButton extends UIComponent {
    constructor(config = {}) {
        super('button', config);
        
        // Theme support
        this.uiManager = config.uiManager || null;
        this.themeKey = config.themeKey || 'button';
        
        // Button-specific properties
        this.text = config.text || 'Button';
        this.icon = config.icon || null;
        this.iconPosition = config.iconPosition || 'left'; // 'left', 'right', 'top', 'bottom'
        this.iconSpacing = config.iconSpacing || 8;
        
        // Typography
        this.font = config.font || this._getThemedProperty('font', '16px Arial');
        this.textColor = config.textColor || this._getThemedProperty('textColor', '#333333');
        this.textAlign = config.textAlign || 'center';
        this.textBaseline = config.textBaseline || 'middle';
        
        // Button variant
        this.variant = config.variant || 'primary'; // 'primary', 'secondary', 'outline', 'ghost', 'danger'
        this.size = config.size || 'medium'; // 'small', 'medium', 'large'
        
        // Initialize button styles from theme or config
        this._initializeStyles(config);
        
        // Animation properties
        this.animationDuration = config.animationDuration || 150;
        this.currentTransition = null;
        
        // Loading state
        this.loading = config.loading || false;
        this.loadingText = config.loadingText || 'Loading...';
        
        // Auto-size to text if no explicit size given
        if (!config.width || !config.height) {
            this._autoSizeToText();
        }
    }

    /**
     * Initialize button styles from theme or config
     */
    _initializeStyles(config) {
        const theme = this.uiManager?.getCurrentTheme();
        const buttonTheme = theme?.components?.[this.themeKey] || {};
        const variantTheme = buttonTheme.variants?.[this.variant] || {};
        const sizeTheme = buttonTheme.sizes?.[this.size] || {};
        
        // Merge theme and config styles
        this.normalStyle = {
            backgroundColor: config.backgroundColor || variantTheme.backgroundColor || buttonTheme.backgroundColor || '#f0f0f0',
            borderColor: config.borderColor || variantTheme.borderColor || buttonTheme.borderColor || '#cccccc',
            textColor: config.textColor || variantTheme.textColor || buttonTheme.textColor || '#333333',
            ...variantTheme.normal
        };
        
        this.hoverStyle = {
            backgroundColor: config.hoverBackgroundColor || variantTheme.hoverBackgroundColor || buttonTheme.hoverBackgroundColor || '#e0e0e0',
            borderColor: config.hoverBorderColor || variantTheme.hoverBorderColor || buttonTheme.hoverBorderColor || '#999999',
            textColor: config.hoverTextColor || variantTheme.hoverTextColor || buttonTheme.hoverTextColor || '#333333',
            ...variantTheme.hover
        };
        
        this.pressedStyle = {
            backgroundColor: config.pressedBackgroundColor || variantTheme.pressedBackgroundColor || buttonTheme.pressedBackgroundColor || '#d0d0d0',
            borderColor: config.pressedBorderColor || variantTheme.pressedBorderColor || buttonTheme.pressedBorderColor || '#888888',
            textColor: config.pressedTextColor || variantTheme.pressedTextColor || buttonTheme.pressedTextColor || '#333333',
            ...variantTheme.pressed
        };
        
        this.disabledStyle = {
            backgroundColor: config.disabledBackgroundColor || variantTheme.disabledBackgroundColor || buttonTheme.disabledBackgroundColor || '#f8f8f8',
            borderColor: config.disabledBorderColor || variantTheme.disabledBorderColor || buttonTheme.disabledBorderColor || '#e0e0e0',
            textColor: config.disabledTextColor || variantTheme.disabledTextColor || buttonTheme.disabledTextColor || '#cccccc',
            ...variantTheme.disabled
        };
        
        this.loadingStyle = {
            backgroundColor: config.loadingBackgroundColor || variantTheme.loadingBackgroundColor || buttonTheme.loadingBackgroundColor || this.disabledStyle.backgroundColor,
            borderColor: config.loadingBorderColor || variantTheme.loadingBorderColor || buttonTheme.loadingBorderColor || this.disabledStyle.borderColor,
            textColor: config.loadingTextColor || variantTheme.loadingTextColor || buttonTheme.loadingTextColor || this.disabledStyle.textColor,
            ...variantTheme.loading
        };
        
        // Button sizing and spacing
        this.borderWidth = config.borderWidth !== undefined ? config.borderWidth : (sizeTheme.borderWidth || buttonTheme.borderWidth || 1);
        this.borderRadius = config.borderRadius !== undefined ? config.borderRadius : (sizeTheme.borderRadius || buttonTheme.borderRadius || 4);
        this.padding = config.padding || sizeTheme.padding || buttonTheme.padding || { top: 8, right: 16, bottom: 8, left: 16 };
        
        // Size-specific adjustments
        if (sizeTheme.font) this.font = sizeTheme.font;
        if (sizeTheme.iconSize) this.iconSize = sizeTheme.iconSize;
    }

    /**
     * Get themed property with fallback
     */
    _getThemedProperty(property, fallback) {
        const theme = this.uiManager?.getCurrentTheme();
        const buttonTheme = theme?.components?.[this.themeKey];
        return buttonTheme?.[property] || fallback;
    }

    /**
     * Set button variant
     */
    setVariant(variant) {
        this.variant = variant;
        this._initializeStyles({});
        this._invalidate();
        return this;
    }

    /**
     * Set button size
     */
    setSize(size) {
        this.size = size;
        this._initializeStyles({});
        this._autoSizeToText();
        this._invalidate();
        return this;
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
     * Set the button icon
     */
    setIcon(icon, position = 'left') {
        this.icon = icon;
        this.iconPosition = position;
        this._autoSizeToText();
        this._invalidate();
        return this;
    }

    /**
     * Set loading state
     */
    setLoading(loading, loadingText = null) {
        this.loading = loading;
        if (loadingText) {
            this.loadingText = loadingText;
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
     * Auto-size the button to fit its text and icon content
     */
    _autoSizeToText() {
        if (!this.text && !this.icon) return;
        
        // Create a temporary canvas to measure text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = this.font;
        
        let textWidth = 0;
        let textHeight = parseInt(this.font) || 16;
        
        if (this.text) {
            const textMetrics = ctx.measureText(this.text);
            textWidth = textMetrics.width;
        }
        
        // Account for icon
        let iconWidth = 0;
        let iconHeight = 0;
        if (this.icon) {
            iconWidth = this.iconSize || textHeight;
            iconHeight = this.iconSize || textHeight;
        }
        
        // Calculate total dimensions based on icon position
        let totalWidth = textWidth;
        let totalHeight = textHeight;
        
        if (this.icon && this.text) {
            if (this.iconPosition === 'left' || this.iconPosition === 'right') {
                totalWidth = textWidth + iconWidth + this.iconSpacing;
                totalHeight = Math.max(textHeight, iconHeight);
            } else if (this.iconPosition === 'top' || this.iconPosition === 'bottom') {
                totalWidth = Math.max(textWidth, iconWidth);
                totalHeight = textHeight + iconHeight + this.iconSpacing;
            }
        } else if (this.icon) {
            totalWidth = iconWidth;
            totalHeight = iconHeight;
        }
        
        // Add padding to get button size
        this.width = totalWidth + this.padding.left + this.padding.right;
        this.height = totalHeight + this.padding.top + this.padding.bottom;
        
        this._invalidate();
    }

    /**
     * Get current style based on button state
     */
    _getCurrentStyle() {
        if (this.loading) {
            return this.loadingStyle;
        } else if (!this.enabled) {
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
     * Handle mouse enter event with animation
     */
    onMouseEnter() {
        if (this.enabled && !this.loading) {
            this.hovered = true;
            this._animateToState('hover');
        }
    }

    /**
     * Handle mouse leave event with animation
     */
    onMouseLeave() {
        this.hovered = false;
        this.pressed = false;
        this._animateToState('normal');
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(event) {
        if (this.enabled && !this.loading) {
            this.pressed = true;
            this._animateToState('pressed');
            this.trigger('press', { component: this, event });
        }
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(event) {
        if (this.enabled && !this.loading && this.pressed) {
            this.pressed = false;
            this._animateToState(this.hovered ? 'hover' : 'normal');
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
        if (this.enabled && !this.loading) {
            this.trigger('click', { component: this, event });
        }
    }

    /**
     * Animate to a specific state
     */
    _animateToState(state) {
        if (!this.uiManager || this.animationDuration <= 0) {
            this._invalidate();
            return;
        }

        // Cancel current transition
        if (this.currentTransition) {
            this.currentTransition.cancel();
        }

        const targetStyle = this._getStyleForState(state);
        const currentStyle = this._getCurrentStyle();

        // Create transition
        this.currentTransition = this.uiManager.animateComponent(this, {
            from: currentStyle,
            to: targetStyle,
            duration: this.animationDuration,
            easing: 'easeOutQuad',
            onComplete: () => {
                this.currentTransition = null;
                this._invalidate();
            }
        });
    }

    /**
     * Get style for a specific state
     */
    _getStyleForState(state) {
        switch (state) {
            case 'hover': return this.hoverStyle;
            case 'pressed': return this.pressedStyle;
            case 'disabled': return this.disabledStyle;
            case 'loading': return this.loadingStyle;
            default: return this.normalStyle;
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

        // Draw content (text and/or icon)
        this._drawContent(ctx, bounds, style);
        
        // Draw loading indicator if in loading state
        if (this.loading) {
            this._drawLoadingIndicator(ctx, bounds);
        }
        
        ctx.restore();
    }

    /**
     * Draw button content (text and icon)
     */
    _drawContent(ctx, bounds, style) {
        const contentBounds = {
            x: bounds.x + this.padding.left,
            y: bounds.y + this.padding.top,
            width: bounds.width - this.padding.left - this.padding.right,
            height: bounds.height - this.padding.top - this.padding.bottom
        };

        const displayText = this.loading ? this.loadingText : this.text;
        
        if (!this.icon && displayText) {
            // Text only
            this._drawText(ctx, displayText, contentBounds, style);
        } else if (this.icon && !displayText) {
            // Icon only
            this._drawIcon(ctx, contentBounds);
        } else if (this.icon && displayText) {
            // Both icon and text
            this._drawIconAndText(ctx, displayText, contentBounds, style);
        }
    }

    /**
     * Draw text content
     */
    _drawText(ctx, text, bounds, style) {
        ctx.fillStyle = style.textColor;
        ctx.font = this.font;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = this.textBaseline;
        
        const textX = bounds.x + bounds.width / 2;
        const textY = bounds.y + bounds.height / 2;
        
        ctx.fillText(text, textX, textY);
    }

    /**
     * Draw icon content
     */
    _drawIcon(ctx, bounds) {
        if (!this.icon) return;
        
        const iconSize = this.iconSize || 16;
        const iconX = bounds.x + (bounds.width - iconSize) / 2;
        const iconY = bounds.y + (bounds.height - iconSize) / 2;
        
        // Draw icon (this could be extended to support different icon types)
        if (typeof this.icon === 'string') {
            // Unicode icon or emoji
            ctx.font = `${iconSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, iconX + iconSize / 2, iconY + iconSize / 2);
        } else if (this.icon.draw) {
            // Custom drawable icon
            this.icon.draw(ctx, iconX, iconY, iconSize, iconSize);
        }
    }

    /**
     * Draw icon and text together
     */
    _drawIconAndText(ctx, text, bounds, style) {
        const iconSize = this.iconSize || 16;
        
        // Calculate layout based on icon position
        let iconX, iconY, textX, textY;
        
        switch (this.iconPosition) {
            case 'left':
                iconX = bounds.x;
                iconY = bounds.y + (bounds.height - iconSize) / 2;
                textX = bounds.x + iconSize + this.iconSpacing;
                textY = bounds.y + bounds.height / 2;
                ctx.textAlign = 'left';
                break;
                
            case 'right':
                textX = bounds.x;
                               textY = bounds.y + bounds.height / 2;
                iconX = bounds.x + bounds.width - iconSize;
                iconY = bounds.y + (bounds.height - iconSize) / 2;
                ctx.textAlign = 'left';
                break;
                
            case 'top':
                iconX = bounds.x + (bounds.width - iconSize) / 2;
                iconY = bounds.y;
                textX = bounds.x + bounds.width / 2;
                textY = bounds.y + iconSize + this.iconSpacing + parseInt(this.font) / 2;
                ctx.textAlign = 'center';
                break;
                
            case 'bottom':
                textX = bounds.x + bounds.width / 2;
                textY = bounds.y + parseInt(this.font) / 2;
                iconX = bounds.x + (bounds.width - iconSize) / 2;
                iconY = bounds.y + bounds.height - iconSize;
                ctx.textAlign = 'center';
                break;
                
            default:
                return this._drawText(ctx, text, bounds, style);
        }
        
        // Draw icon
        if (typeof this.icon === 'string') {
            ctx.font = `${iconSize}px Arial`;
            ctx.fillText(this.icon, iconX + iconSize / 2, iconY + iconSize / 2);
        } else if (this.icon.draw) {
            this.icon.draw(ctx, iconX, iconY, iconSize, iconSize);
        }
        
        // Draw text
        ctx.fillStyle = style.textColor;
        ctx.font = this.font;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, textX, textY);
    }

    /**
     * Draw loading indicator
     */
    _drawLoadingIndicator(ctx, bounds) {
        const centerX = bounds.x + bounds.width - 20;
        const centerY = bounds.y + bounds.height / 2;
        const radius = 6;
        const time = Date.now() / 100;
        
        ctx.strokeStyle = this.loadingStyle.textColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const opacity = Math.max(0.2, Math.sin(time + i * 0.5) * 0.5 + 0.5);
            
            ctx.save();
            ctx.globalAlpha = opacity;
            
            const startX = centerX + Math.cos(angle) * (radius - 2);
            const startY = centerY + Math.sin(angle) * (radius - 2);
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.restore();
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
     * Apply theme changes
     */
    applyTheme(theme) {
        this._initializeStyles({});
        this._autoSizeToText();
        this._invalidate();
        return this;
    }

    /**
     * Get component metrics for debugging
     */
    getMetrics() {
        return {
            ...super.getMetrics(),
            text: this.text,
            variant: this.variant,
            size: this.size,
            loading: this.loading,
            hasIcon: !!this.icon,
            iconPosition: this.iconPosition
        };
    }
}
