/**
 * @file UIComponent.js
 * @description Base class for all UI components in the Hatch engine
 */

/**
 * @class UIComponent
 * @classdesc Base class for all UI components providing common functionality like positioning,
 * styling, event handling, and rendering lifecycle
 */
export class UIComponent {
    constructor(type, config = {}) {
        // Component identity
        this.id = config.id || `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.type = type;
        this.name = config.name || this.id;
        
        // Position and size
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 100;
        this.height = config.height || 30;
        this.z = config.z || 0; // Depth/layer for rendering order
        
        // Layout properties
        this.anchor = config.anchor || 'top-left'; // top-left, center, top-right, etc.
        this.margin = config.margin || { top: 0, right: 0, bottom: 0, left: 0 };
        this.padding = config.padding || { top: 5, right: 10, bottom: 5, left: 10 };
        
        // Visual properties
        this.backgroundColor = config.backgroundColor || null;
        this.borderColor = config.borderColor || '#999999';
        this.borderWidth = config.borderWidth || 0;
        this.borderRadius = config.borderRadius || 0;
        this.opacity = config.opacity !== undefined ? config.opacity : 1.0;
        this.visible = config.visible !== false;
        
        // State
        this.enabled = config.enabled !== false;
        this.focused = false;
        this.hovered = false;
        this.pressed = false;
        this.selected = false;
        
        // Interaction
        this.interactive = config.interactive !== false;
        this.focusable = config.focusable !== false;
        this.draggable = config.draggable || false;
        
        // Parent/child relationships
        this.parent = null;
        this.children = [];
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Cache for computed styles and positions
        this._computedBounds = null;
        this._needsUpdate = true;
    }

    // Lifecycle methods
    init() {
        // Override in subclasses for initialization
    }

    destroy() {
        // Clean up event handlers
        this.eventHandlers.clear();
        
        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
        
        // Destroy children
        [...this.children].forEach(child => child.destroy());
        this.children = [];
    }

    // Position and size methods
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this._invalidate();
        return this;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this._invalidate();
        return this;
    }

    setBounds(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this._invalidate();
        return this;
    }

    getBounds() {
        if (!this._computedBounds || this._needsUpdate) {
            this._computedBounds = this._computeBounds();
            this._needsUpdate = false;
        }
        return this._computedBounds;
    }

    getGlobalBounds() {
        const bounds = this.getBounds();
        let globalX = bounds.x;
        let globalY = bounds.y;
        
        // Add parent offsets
        let current = this.parent;
        while (current) {
            const parentBounds = current.getBounds();
            globalX += parentBounds.x;
            globalY += parentBounds.y;
            current = current.parent;
        }
        
        return {
            x: globalX,
            y: globalY,
            width: bounds.width,
            height: bounds.height
        };
    }

    // Layout methods
    setAnchor(anchor) {
        this.anchor = anchor;
        this._invalidate();
        return this;
    }

    setMargin(margin) {
        if (typeof margin === 'number') {
            this.margin = { top: margin, right: margin, bottom: margin, left: margin };
        } else {
            this.margin = { ...this.margin, ...margin };
        }
        this._invalidate();
        return this;
    }

    setPadding(padding) {
        if (typeof padding === 'number') {
            this.padding = { top: padding, right: padding, bottom: padding, left: padding };
        } else {
            this.padding = { ...this.padding, ...padding };
        }
        this._invalidate();
        return this;
    }

    // Visibility and state methods
    show() {
        this.visible = true;
        return this;
    }

    hide() {
        this.visible = false;
        return this;
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }

    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        return this;
    }

    // Parent/child management
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        child.parent = this;
        this.children.push(child);
        this._invalidate();
        return this;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            this._invalidate();
        }
        return this;
    }

    getChild(id) {
        return this.children.find(child => child.id === id || child.name === id);
    }

    getAllChildren() {
        return [...this.children];
    }

    // Event handling
    addEventListener(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
        return this;
    }

    removeEventListener(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
        return this;
    }

    dispatchEvent(event, data = {}) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler({ ...data, target: this, type: event });
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
        
        // Bubble to parent if not handled
        if (this.parent && !data.stopPropagation) {
            this.parent.dispatchEvent(event, { ...data, originalTarget: this });
        }
        
        return this;
    }

    // Input handling
    onMouseEnter(event) {
        if (!this.hovered) {
            this.hovered = true;
            this.dispatchEvent('mouseenter', event);
        }
    }

    onMouseLeave(event) {
        if (this.hovered) {
            this.hovered = false;
            this.dispatchEvent('mouseleave', event);
        }
    }

    onMouseDown(event) {
        if (this.interactive && this.enabled) {
            this.pressed = true;
            this.dispatchEvent('mousedown', event);
        }
    }

    onMouseUp(event) {
        if (this.pressed) {
            this.pressed = false;
            this.dispatchEvent('mouseup', event);
            
            // Only fire click if mouse up happened over the component
            if (this.containsPoint(event.x, event.y)) {
                this.dispatchEvent('click', event);
            }
        }
    }

    onClick(event) {
        // Override in subclasses
        this.dispatchEvent('click', event);
    }

    // Collision testing
    containsPoint(x, y) {
        const bounds = this.getGlobalBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    intersects(other) {
        const thisBounds = this.getGlobalBounds();
        const otherBounds = other.getGlobalBounds();
        
        return !(thisBounds.x + thisBounds.width < otherBounds.x ||
                otherBounds.x + otherBounds.width < thisBounds.x ||
                thisBounds.y + thisBounds.height < otherBounds.y ||
                otherBounds.y + otherBounds.height < thisBounds.y);
    }

    // Update and rendering
    update(deltaTime) {
        // Update children
        this.children.forEach(child => {
            if (child.visible) {
                child.update(deltaTime);
            }
        });
    }

    render(ctx, engine) {
        if (!this.visible || this.opacity <= 0) return;
        
        ctx.save();
        
        // Apply opacity
        if (this.opacity < 1) {
            ctx.globalAlpha *= this.opacity;
        }
        
        const bounds = this.getBounds();
        
        // Render background
        this.renderBackground(ctx, bounds);
        
        // Render border
        this.renderBorder(ctx, bounds);
        
        // Render content (override in subclasses)
        this.renderContent(ctx, bounds, engine);
        
        // Render children
        this.renderChildren(ctx, engine);
        
        ctx.restore();
    }

    renderBackground(ctx, bounds) {
        if (this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor;
            if (this.borderRadius > 0) {
                this._roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
    }

    renderBorder(ctx, bounds) {
        if (this.borderWidth > 0 && this.borderColor) {
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = this.borderWidth;
            
            if (this.borderRadius > 0) {
                this._roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }
    }

    renderContent(ctx, bounds, engine) {
        // Override in subclasses
    }

    renderChildren(ctx, engine) {
        // Sort children by z-index
        const sortedChildren = [...this.children].sort((a, b) => a.z - b.z);
        
        sortedChildren.forEach(child => {
            if (child.visible) {
                child.render(ctx, engine);
            }
        });
    }

    // Private methods
    _computeBounds() {
        // Apply anchor positioning
        let x = this.x;
        let y = this.y;
        
        if (this.parent) {
            const parentBounds = this.parent.getBounds();
            const parentContentBounds = {
                x: parentBounds.x + this.parent.padding.left,
                y: parentBounds.y + this.parent.padding.top,
                width: parentBounds.width - this.parent.padding.left - this.parent.padding.right,
                height: parentBounds.height - this.parent.padding.top - this.parent.padding.bottom
            };
            
            // Apply anchor positioning relative to parent
            switch (this.anchor) {
                case 'center':
                    x = parentContentBounds.x + (parentContentBounds.width - this.width) / 2;
                    y = parentContentBounds.y + (parentContentBounds.height - this.height) / 2;
                    break;
                case 'top-center':
                    x = parentContentBounds.x + (parentContentBounds.width - this.width) / 2;
                    y = parentContentBounds.y;
                    break;
                case 'top-right':
                    x = parentContentBounds.x + parentContentBounds.width - this.width;
                    y = parentContentBounds.y;
                    break;
                case 'center-left':
                    x = parentContentBounds.x;
                    y = parentContentBounds.y + (parentContentBounds.height - this.height) / 2;
                    break;
                case 'center-right':
                    x = parentContentBounds.x + parentContentBounds.width - this.width;
                    y = parentContentBounds.y + (parentContentBounds.height - this.height) / 2;
                    break;
                case 'bottom-left':
                    x = parentContentBounds.x;
                    y = parentContentBounds.y + parentContentBounds.height - this.height;
                    break;
                case 'bottom-center':
                    x = parentContentBounds.x + (parentContentBounds.width - this.width) / 2;
                    y = parentContentBounds.y + parentContentBounds.height - this.height;
                    break;
                case 'bottom-right':
                    x = parentContentBounds.x + parentContentBounds.width - this.width;
                    y = parentContentBounds.y + parentContentBounds.height - this.height;
                    break;
                default: // 'top-left'
                    x = parentContentBounds.x + this.x;
                    y = parentContentBounds.y + this.y;
                    break;
            }
        }
        
        // Apply margin
        x += this.margin.left;
        y += this.margin.top;
        
        return {
            x: x,
            y: y,
            width: this.width - this.margin.left - this.margin.right,
            height: this.height - this.margin.top - this.margin.bottom
        };
    }

    _invalidate() {
        this._needsUpdate = true;
        // Invalidate children as well
        this.children.forEach(child => child._invalidate());
    }

    _roundRect(ctx, x, y, width, height, radius) {
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

export default UIComponent;
