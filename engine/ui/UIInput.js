/**
 * @file UIInput.js
 * @description Text input component for the Hatch engine UI system with validation and theming
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UIInput
 * @classdesc Interactive text input component with validation, formatting, and theme support
 */
export class UIInput extends UIComponent {
    constructor(config = {}) {
        super('input', config);
        
        // Theme support
        this.uiManager = config.uiManager || null;
        this.themeKey = config.themeKey || 'input';
        
        // Input properties
        this.value = config.value || '';
        this.placeholder = config.placeholder || '';
        this.type = config.type || 'text'; // 'text', 'password', 'email', 'number', 'tel', 'url'
        this.maxLength = config.maxLength || 0; // 0 = unlimited
        this.readonly = config.readonly || false;
        this.multiline = config.multiline || false;
        this.rows = config.rows || 1; // For multiline inputs
        
        // Validation
        this.required = config.required || false;
        this.pattern = config.pattern || null; // RegExp for validation
        this.min = config.min; // For number inputs
        this.max = config.max; // For number inputs
        this.step = config.step; // For number inputs
        this.validators = config.validators || []; // Custom validation functions
        this.validateOnChange = config.validateOnChange !== false;
        this.validateOnBlur = config.validateOnBlur !== false;
        
        // State
        this.focused = false;
        this.valid = true;
        this.validationMessage = '';
        this.cursorPosition = 0;
        this.selectionStart = 0;
        this.selectionEnd = 0;
        
        // Visual properties
        this.font = config.font || this._getThemedProperty('font', '16px Arial');
        this.textColor = config.textColor || this._getThemedProperty('textColor', '#333333');
        this.placeholderColor = config.placeholderColor || this._getThemedProperty('placeholderColor', '#999999');
        this.cursorColor = config.cursorColor || this._getThemedProperty('cursorColor', '#333333');
        this.selectionColor = config.selectionColor || this._getThemedProperty('selectionColor', 'rgba(0, 123, 255, 0.3)');
        
        // Styling
        this.padding = config.padding || this._getThemedProperty('padding', { top: 8, right: 12, bottom: 8, left: 12 });
        this.borderWidth = config.borderWidth !== undefined ? config.borderWidth : this._getThemedProperty('borderWidth', 1);
        this.borderRadius = config.borderRadius !== undefined ? config.borderRadius : this._getThemedProperty('borderRadius', 4);
        
        // State-based styling
        this._initializeStyles(config);
        
        // Cursor and selection
        this.cursorBlinkTime = 0;
        this.cursorVisible = true;
        this.cursorBlinkInterval = 500; // ms
        
        // Formatting
        this.formatter = config.formatter || null; // Function to format display value
        this.parser = config.parser || null; // Function to parse input value
        this.autoFormat = config.autoFormat || false;
        
        // Auto-complete
        this.suggestions = config.suggestions || [];
        this.showSuggestions = false;
        this.selectedSuggestion = -1;
        
        // History for undo/redo
        this.history = [this.value];
        this.historyIndex = 0;
        this.maxHistory = config.maxHistory || 50;
        
        // Make interactive and focusable
        this.interactive = true;
        this.focusable = true;
        
        // Minimum size
        if (!config.width) this.width = 200;
        if (!config.height) this._calculateHeight();
    }

    /**
     * Initialize state-based styles from theme
     */
    _initializeStyles(config) {
        const theme = this.uiManager?.getCurrentTheme();
        const inputTheme = theme?.components?.[this.themeKey] || {};
        
        this.normalStyle = {
            backgroundColor: config.backgroundColor || inputTheme.backgroundColor || '#ffffff',
            borderColor: config.borderColor || inputTheme.borderColor || '#cccccc',
            ...inputTheme.normal
        };
        
        this.focusedStyle = {
            backgroundColor: config.focusedBackgroundColor || inputTheme.focusedBackgroundColor || '#ffffff',
            borderColor: config.focusedBorderColor || inputTheme.focusedBorderColor || '#007bff',
            boxShadow: config.focusedBoxShadow || inputTheme.focusedBoxShadow || '0 0 0 2px rgba(0, 123, 255, 0.25)',
            ...inputTheme.focused
        };
        
        this.invalidStyle = {
            backgroundColor: config.invalidBackgroundColor || inputTheme.invalidBackgroundColor || '#fff5f5',
            borderColor: config.invalidBorderColor || inputTheme.invalidBorderColor || '#dc3545',
            ...inputTheme.invalid
        };
        
        this.disabledStyle = {
            backgroundColor: config.disabledBackgroundColor || inputTheme.disabledBackgroundColor || '#f8f9fa',
            borderColor: config.disabledBorderColor || inputTheme.disabledBorderColor || '#e9ecef',
            textColor: config.disabledTextColor || inputTheme.disabledTextColor || '#6c757d',
            ...inputTheme.disabled
        };
        
        this.readonlyStyle = {
            backgroundColor: config.readonlyBackgroundColor || inputTheme.readonlyBackgroundColor || '#f8f9fa',
            borderColor: config.readonlyBorderColor || inputTheme.readonlyBorderColor || '#e9ecef',
            ...inputTheme.readonly
        };
    }

    /**
     * Get themed property with fallback
     */
    _getThemedProperty(property, fallback) {
        const theme = this.uiManager?.getCurrentTheme();
        const inputTheme = theme?.components?.[this.themeKey];
        return inputTheme?.[property] || fallback;
    }

    /**
     * Calculate height based on content
     */
    _calculateHeight() {
        const fontSize = parseInt(this.font) || 16;
        const lineHeight = Math.floor(fontSize * 1.2);
        this.height = (lineHeight * this.rows) + this.padding.top + this.padding.bottom;
    }

    /**
     * Set input value
     */
    setValue(value, triggerValidation = true) {
        const oldValue = this.value;
        this.value = String(value || '');
        this.cursorPosition = Math.min(this.cursorPosition, this.value.length);
        this._addToHistory(this.value);
        
        if (triggerValidation && this.validateOnChange) {
            this.validate();
        }
        
        this.trigger('change', { 
            component: this, 
            value: this.value, 
            oldValue: oldValue 
        });
        
        this._invalidate();
        return this;
    }

    /**
     * Get input value (parsed if parser provided)
     */
    getValue() {
        return this.parser ? this.parser(this.value) : this.value;
    }

    /**
     * Get display value (formatted if formatter provided)
     */
    getDisplayValue() {
        if (this.type === 'password') {
            return '•'.repeat(this.value.length);
        }
        return this.formatter ? this.formatter(this.value) : this.value;
    }

    /**
     * Set placeholder text
     */
    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        this._invalidate();
        return this;
    }

    /**
     * Set validation pattern
     */
    setPattern(pattern) {
        this.pattern = pattern;
        if (this.validateOnChange) {
            this.validate();
        }
        return this;
    }

    /**
     * Add validator function
     */
    addValidator(validator) {
        this.validators.push(validator);
        return this;
    }

    /**
     * Clear all validators
     */
    clearValidators() {
        this.validators = [];
        return this;
    }

    /**
     * Validate input value
     */
    validate() {
        let isValid = true;
        let message = '';
        
        // Required validation
        if (this.required && !this.value.trim()) {
            isValid = false;
            message = 'This field is required';
        }
        
        // Pattern validation
        if (isValid && this.pattern && this.value) {
            const regex = typeof this.pattern === 'string' ? new RegExp(this.pattern) : this.pattern;
            if (!regex.test(this.value)) {
                isValid = false;
                message = 'Invalid format';
            }
        }
        
        // Type-specific validation
        if (isValid && this.value) {
            switch (this.type) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(this.value)) {
                        isValid = false;
                        message = 'Invalid email address';
                    }
                    break;
                    
                case 'number':
                    const num = parseFloat(this.value);
                    if (isNaN(num)) {
                        isValid = false;
                        message = 'Must be a number';
                    } else {
                        if (this.min !== undefined && num < this.min) {
                            isValid = false;
                            message = `Minimum value is ${this.min}`;
                        }
                        if (this.max !== undefined && num > this.max) {
                            isValid = false;
                            message = `Maximum value is ${this.max}`;
                        }
                    }
                    break;
                    
                case 'url':
                    try {
                        new URL(this.value);
                    } catch {
                        isValid = false;
                        message = 'Invalid URL';
                    }
                    break;
            }
        }
        
        // Custom validators
        if (isValid) {
            for (const validator of this.validators) {
                const result = validator(this.value);
                if (result !== true) {
                    isValid = false;
                    message = typeof result === 'string' ? result : 'Invalid value';
                    break;
                }
            }
        }
        
        const wasValid = this.valid;
        this.valid = isValid;
        this.validationMessage = message;
        
        if (wasValid !== isValid) {
            this.trigger('validation', { 
                component: this, 
                valid: isValid, 
                message: message 
            });
            this._invalidate();
        }
        
        return isValid;
    }

    /**
     * Focus the input
     */
    focus() {
        if (!this.focused && !this.readonly && this.enabled) {
            this.focused = true;
            this.cursorVisible = true;
            this.cursorBlinkTime = 0;
            
            if (this.uiManager) {
                this.uiManager.setFocusedComponent(this);
            }
            
            this.trigger('focus', { component: this });
            this._invalidate();
        }
        return this;
    }

    /**
     * Blur the input
     */
    blur() {
        if (this.focused) {
            this.focused = false;
            this.showSuggestions = false;
            
            if (this.validateOnBlur) {
                this.validate();
            }
            
            if (this.autoFormat && this.formatter) {
                this.value = this.formatter(this.value);
            }
            
            this.trigger('blur', { component: this });
            this._invalidate();
        }
        return this;
    }

    /**
     * Select all text
     */
    selectAll() {
        this.selectionStart = 0;
        this.selectionEnd = this.value.length;
        this.cursorPosition = this.value.length;
        this._invalidate();
        return this;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectionStart = this.cursorPosition;
        this.selectionEnd = this.cursorPosition;
        this._invalidate();
        return this;
    }

    /**
     * Insert text at cursor position
     */
    insertText(text) {
        if (this.readonly || !this.enabled) return this;
        
        const beforeCursor = this.value.substring(0, this.cursorPosition);
        const afterCursor = this.value.substring(this.cursorPosition);
        const newValue = beforeCursor + text + afterCursor;
        
        if (this.maxLength === 0 || newValue.length <= this.maxLength) {
            this.value = newValue;
            this.cursorPosition += text.length;
            this._addToHistory(this.value);
            
            if (this.validateOnChange) {
                this.validate();
            }
            
            this.trigger('input', { component: this, value: this.value });
            this._invalidate();
        }
        
        return this;
    }

    /**
     * Delete character at cursor position
     */
    deleteChar(direction = 'forward') {
        if (this.readonly || !this.enabled) return this;
        
        let newValue = this.value;
        let newCursorPos = this.cursorPosition;
        
        if (direction === 'forward' && this.cursorPosition < this.value.length) {
            newValue = this.value.substring(0, this.cursorPosition) + 
                      this.value.substring(this.cursorPosition + 1);
        } else if (direction === 'backward' && this.cursorPosition > 0) {
            newValue = this.value.substring(0, this.cursorPosition - 1) + 
                      this.value.substring(this.cursorPosition);
            newCursorPos--;
        }
        
        if (newValue !== this.value) {
            this.value = newValue;
            this.cursorPosition = newCursorPos;
            this._addToHistory(this.value);
            
            if (this.validateOnChange) {
                this.validate();
            }
            
            this.trigger('input', { component: this, value: this.value });
            this._invalidate();
        }
        
        return this;
    }

    /**
     * Move cursor
     */
    moveCursor(direction, selectText = false) {
        let newPos = this.cursorPosition;
        
        switch (direction) {
            case 'left':
                newPos = Math.max(0, this.cursorPosition - 1);
                break;
            case 'right':
                newPos = Math.min(this.value.length, this.cursorPosition + 1);
                break;
            case 'home':
                newPos = 0;
                break;
            case 'end':
                newPos = this.value.length;
                break;
            case 'wordLeft':
                newPos = this._findWordBoundary(this.cursorPosition, -1);
                break;
            case 'wordRight':
                newPos = this._findWordBoundary(this.cursorPosition, 1);
                break;
        }
        
        if (selectText) {
            this.selectionEnd = newPos;
        } else {
            this.selectionStart = newPos;
            this.selectionEnd = newPos;
        }
        
        this.cursorPosition = newPos;
        this._invalidate();
        return this;
    }

    /**
     * Find word boundary
     */
    _findWordBoundary(position, direction) {
        const text = this.value;
        let pos = position;
        
        if (direction === -1) {
            // Move left to word boundary
            while (pos > 0 && /\s/.test(text[pos - 1])) pos--;
            while (pos > 0 && !/\s/.test(text[pos - 1])) pos--;
        } else {
            // Move right to word boundary
            while (pos < text.length && !/\s/.test(text[pos])) pos++;
            while (pos < text.length && /\s/.test(text[pos])) pos++;
        }
        
        return pos;
    }

    /**
     * Add value to history for undo/redo
     */
    _addToHistory(value) {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new value if different from last
        if (this.history[this.history.length - 1] !== value) {
            this.history.push(value);
            
            // Limit history size
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            } else {
                this.historyIndex++;
            }
        }
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.value = this.history[this.historyIndex];
            this.cursorPosition = Math.min(this.cursorPosition, this.value.length);
            this._invalidate();
            this.trigger('change', { component: this, value: this.value });
        }
        return this;
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.value = this.history[this.historyIndex];
            this.cursorPosition = Math.min(this.cursorPosition, this.value.length);
            this._invalidate();
            this.trigger('change', { component: this, value: this.value });
        }
        return this;
    }

    /**
     * Get current style based on state
     */
    _getCurrentStyle() {
        if (!this.enabled) {
            return this.disabledStyle;
        } else if (this.readonly) {
            return this.readonlyStyle;
        } else if (!this.valid) {
            return this.invalidStyle;
        } else if (this.focused) {
            return this.focusedStyle;
        } else {
            return this.normalStyle;
        }
    }

    /**
     * Update cursor blink
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.focused) {
            this.cursorBlinkTime += deltaTime * 1000;
            if (this.cursorBlinkTime >= this.cursorBlinkInterval) {
                this.cursorVisible = !this.cursorVisible;
                this.cursorBlinkTime = 0;
                this._invalidate();
            }
        }
    }

    /**
     * Handle key down event
     */
    onKeyDown(event) {
        if (!this.enabled || this.readonly) return;
        
        const key = event.key;
        const ctrlKey = event.ctrlKey || event.metaKey;
        const shiftKey = event.shiftKey;
        
        switch (key) {
            case 'Backspace':
                this.deleteChar('backward');
                event.preventDefault();
                break;
                
            case 'Delete':
                this.deleteChar('forward');
                event.preventDefault();
                break;
                
            case 'ArrowLeft':
                this.moveCursor(ctrlKey ? 'wordLeft' : 'left', shiftKey);
                event.preventDefault();
                break;
                
            case 'ArrowRight':
                this.moveCursor(ctrlKey ? 'wordRight' : 'right', shiftKey);
                event.preventDefault();
                break;
                
            case 'Home':
                this.moveCursor('home', shiftKey);
                event.preventDefault();
                break;
                
            case 'End':
                this.moveCursor('end', shiftKey);
                event.preventDefault();
                break;
                
            case 'Enter':
                if (this.multiline) {
                    this.insertText('\n');
                } else {
                    this.trigger('submit', { component: this, value: this.value });
                }
                event.preventDefault();
                break;
                
            case 'Escape':
                this.blur();
                event.preventDefault();
                break;
                
            case 'a':
                if (ctrlKey) {
                    this.selectAll();
                    event.preventDefault();
                }
                break;
                
            case 'z':
                if (ctrlKey && !shiftKey) {
                    this.undo();
                    event.preventDefault();
                }
                break;
                
            case 'y':
                if (ctrlKey) {
                    this.redo();
                    event.preventDefault();
                }
                break;
        }
    }

    /**
     * Handle text input event
     */
    onTextInput(event) {
        if (!this.enabled || this.readonly) return;
        
        const char = event.data;
        if (char && char.length === 1) {
            this.insertText(char);
            event.preventDefault();
        }
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(event) {
        if (!this.enabled) return;
        
        this.focus();
        
        // Calculate cursor position from mouse click
        const bounds = this.getBounds();
        const textX = bounds.x + this.padding.left;
        const mouseX = event.offsetX - textX;
        
        // Find closest cursor position
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = this.font;
        
        const displayValue = this.getDisplayValue();
        let closestPos = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i <= displayValue.length; i++) {
            const textWidth = ctx.measureText(displayValue.substring(0, i)).width;
            const distance = Math.abs(textWidth - mouseX);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPos = i;
            }
        }
        
        this.cursorPosition = closestPos;
        this.clearSelection();
        this._invalidate();
    }

    /**
     * Render the input
     */
    render(ctx) {
        if (!this.visible) return;
        
        const bounds = this.getBounds();
        const style = this._getCurrentStyle();
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Draw background
        ctx.fillStyle = style.backgroundColor;
        if (this.borderRadius > 0) {
            this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
            ctx.fill();
        } else {
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        
        // Draw border
        if (this.borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = this.borderWidth;
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
        
        // Draw focus outline
        if (this.focused && style.boxShadow) {
            // Simple focus outline (box shadow would need more complex implementation)
            ctx.strokeStyle = this.focusedStyle.borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
        }
        
        // Clip to content area
        ctx.save();
        ctx.beginPath();
        ctx.rect(bounds.x + this.padding.left, bounds.y + this.padding.top,
                bounds.width - this.padding.left - this.padding.right,
                bounds.height - this.padding.top - this.padding.bottom);
        ctx.clip();
        
        // Draw text content
        this._renderText(ctx, bounds, style);
        
        ctx.restore();
        ctx.restore();
    }

    /**
     * Render text content
     */
    _renderText(ctx, bounds, style) {
        const textX = bounds.x + this.padding.left;
        const textY = bounds.y + this.padding.top;
        const textHeight = bounds.height - this.padding.top - this.padding.bottom;
        
        ctx.font = this.font;
        ctx.textBaseline = 'middle';
        
        const displayValue = this.getDisplayValue();
        const hasText = displayValue.length > 0;
        
        // Draw placeholder if no text
        if (!hasText && this.placeholder) {
            ctx.fillStyle = this.placeholderColor;
            ctx.fillText(this.placeholder, textX, textY + textHeight / 2);
        }
        
        // Draw text
        if (hasText) {
            const textColor = this.enabled ? 
                (style.textColor || this.textColor) : 
                (style.textColor || this.disabledStyle.textColor);
            
            ctx.fillStyle = textColor;
            
            // Draw selection background
            if (this.focused && this.selectionStart !== this.selectionEnd) {
                const selStart = Math.min(this.selectionStart, this.selectionEnd);
                const selEnd = Math.max(this.selectionStart, this.selectionEnd);
                
                const beforeSel = displayValue.substring(0, selStart);
                const selection = displayValue.substring(selStart, selEnd);
                
                const beforeWidth = ctx.measureText(beforeSel).width;
                const selectionWidth = ctx.measureText(selection).width;
                
                ctx.fillStyle = this.selectionColor;
                ctx.fillRect(textX + beforeWidth, textY, selectionWidth, textHeight);
                
                ctx.fillStyle = textColor;
            }
            
            // Draw text
            ctx.fillText(displayValue, textX, textY + textHeight / 2);
            
            // Draw cursor
            if (this.focused && this.cursorVisible && this.selectionStart === this.selectionEnd) {
                const beforeCursor = displayValue.substring(0, this.cursorPosition);
                const cursorX = textX + ctx.measureText(beforeCursor).width;
                
                ctx.strokeStyle = this.cursorColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cursorX, textY + 2);
                ctx.lineTo(cursorX, textY + textHeight - 2);
                ctx.stroke();
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
     * Apply theme changes
     */
    applyTheme(theme) {
        this._initializeStyles({});
        this._invalidate();
        return this;
    }

    /**
     * Get component metrics for debugging
     */
    getMetrics() {
        return {
            ...super.getMetrics(),
            value: this.value,
            type: this.type,
            focused: this.focused,
            valid: this.valid,
            readonly: this.readonly,
            cursorPosition: this.cursorPosition
        };
    }
}
