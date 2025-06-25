/**
 * @file UILabel.js
 * @description Label component for displaying text in the Hatch engine UI system
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UILabel
 * @classdesc Simple text display component with alignment and styling options
 */
export class UILabel extends UIComponent {
    constructor(config = {}) {
        super('label', config);
        
        // Label-specific properties
        this.text = config.text || '';
        this.font = config.font || '16px Arial';
        this.textColor = config.textColor || '#333333';
        this.textAlign = config.textAlign || 'left';
        this.textBaseline = config.textBaseline || 'top';
        this.lineHeight = config.lineHeight || 1.2;
        this.wordWrap = config.wordWrap !== false;
        this.maxLines = config.maxLines || 0; // 0 = unlimited
        this.ellipsis = config.ellipsis !== false; // Show ... when text is truncated
        
        // Background styling (optional)
        this.backgroundColor = config.backgroundColor || null;
        this.borderColor = config.borderColor || null;
        this.borderWidth = config.borderWidth || 0;
        this.borderRadius = config.borderRadius || 0;
        this.padding = config.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        
        // Not interactive by default
        this.interactive = config.interactive !== undefined ? config.interactive : false;
        this.focusable = false;
        
        // Cache for text layout
        this._textLines = [];
        this._textHeight = 0;
        this._needsTextLayout = true;
        
        // Auto-size to text if no explicit size given
        if (!config.width || !config.height) {
            this._autoSizeToText();
        }
    }

    /**
     * Set the label text and optionally auto-resize
     */
    setText(text, autoResize = true) {
        this.text = text || '';
        this._needsTextLayout = true;
        if (autoResize) {
            this._autoSizeToText();
        }
        this._invalidate();
        return this;
    }

    /**
     * Set the label font and optionally auto-resize
     */
    setFont(font, autoResize = true) {
        this.font = font;
        this._needsTextLayout = true;
        if (autoResize) {
            this._autoSizeToText();
        }
        this._invalidate();
        return this;
    }

    /**
     * Set text color
     */
    setTextColor(color) {
        this.textColor = color;
        this._invalidate();
        return this;
    }

    /**
     * Set text alignment
     */
    setTextAlign(align) {
        this.textAlign = align;
        this._invalidate();
        return this;
    }

    /**
     * Auto-size the label to fit its text content
     */
    _autoSizeToText() {
        if (!this.text) {
            this.width = this.padding.left + this.padding.right;
            this.height = this.padding.top + this.padding.bottom;
            return;
        }
        
        this._layoutText();
        
        // Find the maximum line width
        let maxWidth = 0;
        for (const line of this._textLines) {
            maxWidth = Math.max(maxWidth, line.width);
        }
        
        // Set size based on text + padding
        this.width = maxWidth + this.padding.left + this.padding.right;
        this.height = this._textHeight + this.padding.top + this.padding.bottom;
        
        this._invalidate();
    }

    /**
     * Layout text into lines for rendering
     */
    _layoutText() {
        if (!this._needsTextLayout && this._textLines.length > 0) {
            return;
        }
        
        this._textLines = [];
        this._textHeight = 0;
        
        if (!this.text) {
            this._needsTextLayout = false;
            return;
        }
        
        // Create a temporary canvas to measure text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = this.font;
        
        const fontSize = parseInt(this.font) || 16;
        const lineHeight = fontSize * this.lineHeight;
        
        // Split text by explicit line breaks first
        const paragraphs = this.text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                // Empty line
                this._textLines.push({ text: '', width: 0, height: lineHeight });
                this._textHeight += lineHeight;
                continue;
            }
            
            if (this.wordWrap && this.width > this.padding.left + this.padding.right) {
                // Word wrap within available width
                const availableWidth = this.width - this.padding.left - this.padding.right;
                const lines = this._wrapText(ctx, paragraph, availableWidth);
                
                for (const line of lines) {
                    this._textLines.push({ 
                        text: line, 
                        width: ctx.measureText(line).width, 
                        height: lineHeight 
                    });
                    this._textHeight += lineHeight;
                    
                    // Check max lines limit
                    if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                        // Add ellipsis to last line if needed
                        if (this.ellipsis && this._textLines.length === this.maxLines) {
                            const lastLine = this._textLines[this._textLines.length - 1];
                            lastLine.text = this._truncateWithEllipsis(ctx, lastLine.text, availableWidth);
                            lastLine.width = ctx.measureText(lastLine.text).width;
                        }
                        this._needsTextLayout = false;
                        return;
                    }
                }
            } else {
                // No word wrap - single line per paragraph
                let lineText = paragraph;
                
                // Truncate with ellipsis if needed
                if (this.ellipsis && this.width > this.padding.left + this.padding.right) {
                    const availableWidth = this.width - this.padding.left - this.padding.right;
                    lineText = this._truncateWithEllipsis(ctx, lineText, availableWidth);
                }
                
                this._textLines.push({ 
                    text: lineText, 
                    width: ctx.measureText(lineText).width, 
                    height: lineHeight 
                });
                this._textHeight += lineHeight;
                
                // Check max lines limit
                if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                    break;
                }
            }
        }
        
        this._needsTextLayout = false;
    }

    /**
     * Wrap text to fit within specified width
     */
    _wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // Single word is too long, force it on its own line
                    lines.push(word);
                }
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Truncate text with ellipsis to fit within specified width
     */
    _truncateWithEllipsis(ctx, text, maxWidth) {
        const ellipsis = '...';
        const ellipsisWidth = ctx.measureText(ellipsis).width;
        
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (truncated.length > 0) {
            const testText = truncated + ellipsis;
            if (ctx.measureText(testText).width <= maxWidth) {
                return testText;
            }
            truncated = truncated.slice(0, -1);
        }
        
        return ellipsis;
    }

    /**
     * Override getBounds to trigger text layout when size changes
     */
    getBounds() {
        if (this._needsUpdate) {
            this._needsTextLayout = true;
        }
        return super.getBounds();
    }

    /**
     * Render the label
     */
    render(ctx) {
        if (!this.visible) return;
        
        const bounds = this.getBounds();
        
        ctx.save();
        
        // Apply opacity
        ctx.globalAlpha = this.opacity;
        
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
        
        // Draw text
        if (this.text) {
            this._layoutText();
            
            ctx.fillStyle = this.textColor;
            ctx.font = this.font;
            ctx.textBaseline = 'top';
            
            // Calculate text area bounds
            const textX = bounds.x + this.padding.left;
            let textY = bounds.y + this.padding.top;
            
            // Apply vertical alignment for text baseline
            if (this.textBaseline === 'middle') {
                textY += (bounds.height - this.padding.top - this.padding.bottom - this._textHeight) / 2;
            } else if (this.textBaseline === 'bottom') {
                textY += bounds.height - this.padding.bottom - this._textHeight;
            }
            
            // Render each line
            for (const line of this._textLines) {
                let lineX = textX;
                
                // Apply horizontal alignment
                if (this.textAlign === 'center') {
                    lineX += (bounds.width - this.padding.left - this.padding.right - line.width) / 2;
                } else if (this.textAlign === 'right') {
                    lineX += bounds.width - this.padding.right - line.width;
                }
                
                ctx.fillText(line.text, lineX, textY);
                textY += line.height;
            }
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
