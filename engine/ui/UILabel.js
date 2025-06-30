/**
 * @file UILabel.js
 * @description Enhanced label component for displaying text in the Hatch engine UI system with theme support
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UILabel
 * @classdesc Enhanced text display component with alignment, styling, theming, and advanced text layout options
 */
export class UILabel extends UIComponent {
    constructor(config = {}) {
        super('label', config);
        
        // Theme support
        this.uiManager = config.uiManager || null;
        this.themeKey = config.themeKey || 'label';
        
        // Label-specific properties
        this.text = config.text || '';
        this.textType = config.textType || 'body'; // 'heading1', 'heading2', 'heading3', 'body', 'caption', 'small'
        this.font = config.font || this._getThemedProperty('font', '16px Arial');
        this.textColor = config.textColor || this._getThemedProperty('textColor', '#333333');
        this.textAlign = config.textAlign || 'left';
        this.textBaseline = config.textBaseline || 'top';
        this.lineHeight = config.lineHeight || this._getThemedProperty('lineHeight', 1.2);
        this.letterSpacing = config.letterSpacing || this._getThemedProperty('letterSpacing', 0);
        this.textTransform = config.textTransform || 'none'; // 'none', 'uppercase', 'lowercase', 'capitalize'
        
        // Text layout options
        this.wordWrap = config.wordWrap !== false;
        this.maxLines = config.maxLines || 0; // 0 = unlimited
        this.ellipsis = config.ellipsis !== false; // Show ... when text is truncated
        this.truncateWord = config.truncateWord || false; // Allow breaking within words
        
        // Rich text support
        this.richText = config.richText || false;
        this.markup = config.markup || null; // Simple markup support
        
        // Background styling (optional)
        this.backgroundColor = config.backgroundColor || this._getThemedProperty('backgroundColor', null);
        this.borderColor = config.borderColor || this._getThemedProperty('borderColor', null);
        this.borderWidth = config.borderWidth !== undefined ? config.borderWidth : this._getThemedProperty('borderWidth', 0);
        this.borderRadius = config.borderRadius !== undefined ? config.borderRadius : this._getThemedProperty('borderRadius', 0);
        this.padding = config.padding || this._getThemedProperty('padding', { top: 0, right: 0, bottom: 0, left: 0 });
        
        // Shadow and effects
        this.textShadow = config.textShadow || this._getThemedProperty('textShadow', null);
        this.highlight = config.highlight || null; // Text highlighting
        
        // Not interactive by default
        this.interactive = config.interactive !== undefined ? config.interactive : false;
        this.focusable = false;
        this.selectable = config.selectable || false; // Allow text selection
        
        // Animation support
        this.animateText = config.animateText || null; // 'typewriter', 'fade', 'slide'
        this.animationSpeed = config.animationSpeed || 50; // For typewriter effect
        this.currentAnimationFrame = 0;
        
        // Cache for text layout
        this._textLines = [];
        this._richTextElements = [];
        this._textHeight = 0;
        this._needsTextLayout = true;
        
        // Initialize theme-based styling
        this._initializeFromTheme();
        
        // Auto-size to text if no explicit size given
        if (!config.width || !config.height) {
            this._autoSizeToText();
        }
    }

    /**
     * Initialize styling from theme
     */
    _initializeFromTheme() {
        const theme = this.uiManager?.getCurrentTheme();
        const labelTheme = theme?.components?.[this.themeKey] || {};
        const typeTheme = labelTheme.types?.[this.textType] || {};
        
        // Apply theme-based text type styling
        if (typeTheme.font && !this.font) this.font = typeTheme.font;
        if (typeTheme.textColor && !this.textColor) this.textColor = typeTheme.textColor;
        if (typeTheme.lineHeight && !this.lineHeight) this.lineHeight = typeTheme.lineHeight;
        if (typeTheme.letterSpacing && !this.letterSpacing) this.letterSpacing = typeTheme.letterSpacing;
        if (typeTheme.textTransform && !this.textTransform) this.textTransform = typeTheme.textTransform;
    }

    /**
     * Get themed property with fallback
     */
    _getThemedProperty(property, fallback) {
        const theme = this.uiManager?.getCurrentTheme();
        const labelTheme = theme?.components?.[this.themeKey];
        const typeTheme = labelTheme?.types?.[this.textType];
        return typeTheme?.[property] || labelTheme?.[property] || fallback;
    }

    /**
     * Set text type (heading1, heading2, etc.)
     */
    setTextType(textType) {
        this.textType = textType;
        this._initializeFromTheme();
        this._needsTextLayout = true;
        this._autoSizeToText();
        this._invalidate();
        return this;
    }

    /**
     * Set the label text and optionally auto-resize
     */
    setText(text, autoResize = true) {
        this.text = text || '';
        this._needsTextLayout = true;
        this.currentAnimationFrame = 0; // Reset animation
        if (autoResize) {
            this._autoSizeToText();
        }
        this._invalidate();
        return this;
    }

    /**
     * Set rich text markup
     */
    setMarkup(markup) {
        this.markup = markup;
        this.richText = true;
        this._needsTextLayout = true;
        this._autoSizeToText();
        this._invalidate();
        return this;
    }

    /**
     * Append text to existing text
     */
    appendText(text, autoResize = true) {
        this.text += text;
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
     * Set text highlighting
     */
    setHighlight(highlight) {
        this.highlight = highlight;
        this._invalidate();
        return this;
    }

    /**
     * Start text animation
     */
    startAnimation(type = 'typewriter', speed = 50) {
        this.animateText = type;
        this.animationSpeed = speed;
        this.currentAnimationFrame = 0;
        this._invalidate();
        return this;
    }

    /**
     * Stop text animation
     */
    stopAnimation() {
        this.animateText = null;
        this.currentAnimationFrame = this.text.length;
        this._invalidate();
        return this;
    }

    /**
     * Auto-size the label to fit its text content
     */
    _autoSizeToText() {
        if (!this.text && !this.markup) {
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
        this._richTextElements = [];
        this._textHeight = 0;
        
        const textToLayout = this.richText && this.markup ? this.markup : this.text;
        
        if (!textToLayout) {
            this._needsTextLayout = false;
            return;
        }
        
        // Create a temporary canvas to measure text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = this.font;
        
        const fontSize = parseInt(this.font) || 16;
        const lineHeight = fontSize * this.lineHeight;
        
        if (this.richText && this.markup) {
            this._layoutRichText(ctx, lineHeight);
        } else {
            this._layoutPlainText(ctx, lineHeight);
        }
        
        this._needsTextLayout = false;
    }

    /**
     * Layout plain text
     */
    _layoutPlainText(ctx, lineHeight) {
        let processedText = this.text;
        
        // Apply text transform
        switch (this.textTransform) {
            case 'uppercase':
                processedText = processedText.toUpperCase();
                break;
            case 'lowercase':
                processedText = processedText.toLowerCase();
                break;
            case 'capitalize':
                processedText = processedText.replace(/\b\w/g, l => l.toUpperCase());
                break;
        }
        
        // Split text by explicit line breaks first
        const paragraphs = processedText.split('\n');
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                // Empty line
                this._textLines.push({ text: '', width: 0, height: lineHeight, elements: [] });
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
                        height: lineHeight,
                        elements: [{ text: line, style: { color: this.textColor, font: this.font } }]
                    });
                    this._textHeight += lineHeight;
                    
                    // Check max lines limit
                    if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                        // Add ellipsis to last line if needed
                        if (this.ellipsis && this._textLines.length === this.maxLines) {
                            const lastLine = this._textLines[this._textLines.length - 1];
                            lastLine.text = this._truncateWithEllipsis(ctx, lastLine.text, availableWidth);
                            lastLine.width = ctx.measureText(lastLine.text).width;
                            lastLine.elements[0].text = lastLine.text;
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
                    height: lineHeight,
                    elements: [{ text: lineText, style: { color: this.textColor, font: this.font } }]
                });
                this._textHeight += lineHeight;
                
                // Check max lines limit
                if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                    break;
                }
            }
        }
    }

    /**
     * Layout rich text with markup
     */
    _layoutRichText(ctx, lineHeight) {
        // Simple markup parser for bold, italic, color
        // Format: <b>bold</b>, <i>italic</i>, <color=#ff0000>colored text</color>
        const markup = this.markup;
        const elements = this._parseMarkup(markup);
        
        // Layout elements into lines
        const availableWidth = this.width > this.padding.left + this.padding.right ? 
            this.width - this.padding.left - this.padding.right : Infinity;
        
        let currentLine = { text: '', width: 0, height: lineHeight, elements: [] };
        
        for (const element of elements) {
            if (element.type === 'text') {
                const words = element.text.split(' ');
                
                for (let i = 0; i < words.length; i++) {
                    const word = words[i] + (i < words.length - 1 ? ' ' : '');
                    ctx.font = element.style.font || this.font;
                    const wordWidth = ctx.measureText(word).width;
                    
                    if (this.wordWrap && currentLine.width + wordWidth > availableWidth && currentLine.width > 0) {
                        // Wrap to new line
                        this._textLines.push(currentLine);
                        this._textHeight += lineHeight;
                        currentLine = { text: '', width: 0, height: lineHeight, elements: [] };
                        
                        if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                            return;
                        }
                    }
                    
                    currentLine.text += word;
                    currentLine.width += wordWidth;
                    currentLine.elements.push({ text: word, style: element.style });
                }
            } else if (element.type === 'break') {
                // Line break
                this._textLines.push(currentLine);
                this._textHeight += lineHeight;
                currentLine = { text: '', width: 0, height: lineHeight, elements: [] };
                
                if (this.maxLines > 0 && this._textLines.length >= this.maxLines) {
                    return;
                }
            }
        }
        
        // Add final line if not empty
        if (currentLine.text || currentLine.elements.length > 0) {
            this._textLines.push(currentLine);
            this._textHeight += lineHeight;
        }
    }

    /**
     * Parse simple markup into elements
     */
    _parseMarkup(markup) {
        const elements = [];
        const tagRegex = /<(\/?)(b|i|color|br)([^>]*)>/gi;
        let lastIndex = 0;
        let match;
        
        const styleStack = [{ color: this.textColor, font: this.font }];
        
        while ((match = tagRegex.exec(markup)) !== null) {
            // Add text before tag
            if (match.index > lastIndex) {
                const text = markup.substring(lastIndex, match.index);
                if (text) {
                    elements.push({
                        type: 'text',
                        text: text,
                        style: { ...styleStack[styleStack.length - 1] }
                    });
                }
            }
            
            const isClosing = match[1] === '/';
            const tagName = match[2].toLowerCase();
            const attributes = match[3];
            
            if (tagName === 'br') {
                elements.push({ type: 'break' });
            } else if (!isClosing) {
                // Opening tag
                const currentStyle = { ...styleStack[styleStack.length - 1] };
                
                switch (tagName) {
                    case 'b':
                        currentStyle.font = this._makeFontBold(currentStyle.font);
                        break;
                    case 'i':
                        currentStyle.font = this._makeFontItalic(currentStyle.font);
                        break;
                    case 'color':
                        const colorMatch = attributes.match(/=([#\w]+)/);
                        if (colorMatch) {
                            currentStyle.color = colorMatch[1];
                        }
                        break;
                }
                
                styleStack.push(currentStyle);
            } else {
                // Closing tag
                if (styleStack.length > 1) {
                    styleStack.pop();
                }
            }
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < markup.length) {
            const text = markup.substring(lastIndex);
            if (text) {
                elements.push({
                    type: 'text',
                    text: text,
                    style: { ...styleStack[styleStack.length - 1] }
                });
            }
        }
        
        return elements;
    }

    /**
     * Make font bold
     */
    _makeFontBold(font) {
        if (font.includes('bold')) return font;
        const parts = font.split(' ');
        return 'bold ' + font;
    }

    /**
     * Make font italic
     */
    _makeFontItalic(font) {
        if (font.includes('italic')) return font;
        const parts = font.split(' ');
        return 'italic ' + font;
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
                    // Single word is too long
                    if (this.truncateWord) {
                        // Break within word
                        lines.push(...this._breakWord(ctx, word, maxWidth));
                    } else {
                        // Force it on its own line
                        lines.push(word);
                    }
                }
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Break a word that's too long to fit
     */
    _breakWord(ctx, word, maxWidth) {
        const lines = [];
        let currentPart = '';
        
        for (const char of word) {
            const testPart = currentPart + char;
            if (ctx.measureText(testPart).width <= maxWidth) {
                currentPart = testPart;
            } else {
                if (currentPart) {
                    lines.push(currentPart);
                }
                currentPart = char;
            }
        }
        
        if (currentPart) {
            lines.push(currentPart);
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
     * Get animated text based on current animation frame
     */
    _getAnimatedText() {
        if (!this.animateText) {
            return this.text;
        }
        
        switch (this.animateText) {
            case 'typewriter':
                const charIndex = Math.floor(this.currentAnimationFrame / this.animationSpeed);
                return this.text.substring(0, charIndex);
            case 'fade':
                // Handled in render with opacity
                return this.text;
            default:
                return this.text;
        }
    }

    /**
     * Update animation frame
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.animateText === 'typewriter' && this.currentAnimationFrame < this.text.length * this.animationSpeed) {
            this.currentAnimationFrame += deltaTime * 60; // Assuming 60 FPS
            this._invalidate();
        }
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
        let currentOpacity = this.opacity;
        
        // Animation opacity effects
        if (this.animateText === 'fade') {
            const fadeProgress = Math.min(1, this.currentAnimationFrame / (this.animationSpeed * 60));
            currentOpacity *= fadeProgress;
        }
        
        ctx.globalAlpha = currentOpacity;
        
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
        const displayText = this._getAnimatedText();
        if (displayText || this.richText) {
            this._layoutText();
            this._renderText(ctx, bounds);
        }
        
        ctx.restore();
    }

    /**
     * Render text content
     */
    _renderText(ctx, bounds) {
        // Apply letter spacing
        if (this.letterSpacing > 0) {
            ctx.letterSpacing = `${this.letterSpacing}px`;
        }
        
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
            this._renderLine(ctx, line, textX, textY, bounds);
            textY += line.height;
        }
    }

    /**
     * Render a single line of text
     */
    _renderLine(ctx, line, textX, textY, bounds) {
        let lineX = textX;
        
        // Apply horizontal alignment
        if (this.textAlign === 'center') {
            lineX += (bounds.width - this.padding.left - this.padding.right - line.width) / 2;
        } else if (this.textAlign === 'right') {
            lineX += bounds.width - this.padding.right - line.width;
        }
        
        // Draw highlight background if specified
        if (this.highlight) {
            ctx.fillStyle = this.highlight.backgroundColor || 'yellow';
            ctx.fillRect(lineX - 2, textY - 2, line.width + 4, line.height + 4);
        }
        
        // Draw text shadow if specified
        if (this.textShadow) {
            ctx.save();
            ctx.fillStyle = this.textShadow.color || 'rgba(0,0,0,0.5)';
            ctx.font = this.font;
            ctx.textBaseline = 'top';
            
            const shadowX = lineX + (this.textShadow.offsetX || 2);
            const shadowY = textY + (this.textShadow.offsetY || 2);
            
            if (this.richText && line.elements.length > 0) {
                this._renderRichLine(ctx, line.elements, shadowX, shadowY);
            } else {
                ctx.fillText(line.text, shadowX, shadowY);
            }
            ctx.restore();
        }
        
        // Draw main text
        ctx.textBaseline = 'top';
        
        if (this.richText && line.elements.length > 0) {
            this._renderRichLine(ctx, line.elements, lineX, textY);
        } else {
            ctx.fillStyle = this.textColor;
            ctx.font = this.font;
            ctx.fillText(line.text, lineX, textY);
        }
    }

    /**
     * Render a line with rich text elements
     */
    _renderRichLine(ctx, elements, startX, startY) {
        let currentX = startX;
        
        for (const element of elements) {
            ctx.fillStyle = element.style.color || this.textColor;
            ctx.font = element.style.font || this.font;
            
            ctx.fillText(element.text, currentX, startY);
            currentX += ctx.measureText(element.text).width;
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
        this._initializeFromTheme();
        this._needsTextLayout = true;
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
            textType: this.textType,
            lineCount: this._textLines.length,
            textHeight: this._textHeight,
            richText: this.richText,
            animated: !!this.animateText
        };
    }
}
