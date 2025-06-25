/**
 * @file UIContainer.js
 * @description Container component for organizing and laying out child UI components
 */

import { UIComponent } from './UIComponent.js';

/**
 * @class UIContainer
 * @classdesc Container component that manages layout and rendering of child components
 */
export class UIContainer extends UIComponent {
    constructor(config = {}) {
        super('container', config);
        
        // Container-specific properties
        this.layout = config.layout || 'none'; // 'none', 'horizontal', 'vertical', 'grid'
        this.spacing = config.spacing || 5; // Space between child components
        this.alignment = config.alignment || 'start'; // 'start', 'center', 'end', 'stretch'
        this.justification = config.justification || 'start'; // 'start', 'center', 'end', 'space-between', 'space-around'
        this.wrap = config.wrap !== false; // Whether to wrap children to next line/column
        
        // Grid layout specific
        this.columns = config.columns || 1;
        this.rows = config.rows || 0; // 0 = auto
        
        // Scrolling
        this.scrollable = config.scrollable || false;
        this.scrollX = 0;
        this.scrollY = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;
        
        // Background and border
        this.backgroundColor = config.backgroundColor || null;
        this.borderColor = config.borderColor || null;
        this.borderWidth = config.borderWidth || 0;
        this.borderRadius = config.borderRadius || 0;
        this.padding = config.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        
        // Container is interactive if it has scrolling or background
        this.interactive = config.interactive !== undefined ? config.interactive : (this.scrollable || this.backgroundColor);
        
        // Layout cache
        this._layoutCache = [];
        this._needsLayout = true;
    }

    /**
     * Add a child component
     */
    addChild(child, index = -1) {
        if (!(child instanceof UIComponent)) {
            throw new Error('Child must be a UIComponent instance');
        }
        
        // Remove from current parent if any
        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        // Add to this container
        if (index >= 0 && index < this.children.length) {
            this.children.splice(index, 0, child);
        } else {
            this.children.push(child);
        }
        
        child.parent = this;
        this._needsLayout = true;
        this._invalidate();
        
        return this;
    }

    /**
     * Remove a child component
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
            child.parent = null;
            this._needsLayout = true;
            this._invalidate();
        }
        return this;
    }

    /**
     * Remove all children
     */
    clearChildren() {
        for (const child of this.children) {
            child.parent = null;
        }
        this.children = [];
        this._needsLayout = true;
        this._invalidate();
        return this;
    }

    /**
     * Set layout type
     */
    setLayout(layout) {
        this.layout = layout;
        this._needsLayout = true;
        this._invalidate();
        return this;
    }

    /**
     * Set spacing between children
     */
    setSpacing(spacing) {
        this.spacing = spacing;
        this._needsLayout = true;
        this._invalidate();
        return this;
    }

    /**
     * Layout children according to the current layout mode
     */
    _layoutChildren() {
        if (!this._needsLayout && this._layoutCache.length > 0) {
            return;
        }
        
        this._layoutCache = [];
        
        if (this.children.length === 0) {
            this._needsLayout = false;
            return;
        }
        
        const bounds = this.getBounds();
        const contentArea = {
            x: bounds.x + this.padding.left,
            y: bounds.y + this.padding.top,
            width: bounds.width - this.padding.left - this.padding.right,
            height: bounds.height - this.padding.top - this.padding.bottom
        };
        
        switch (this.layout) {
            case 'horizontal':
                this._layoutHorizontal(contentArea);
                break;
            case 'vertical':
                this._layoutVertical(contentArea);
                break;
            case 'grid':
                this._layoutGrid(contentArea);
                break;
            case 'none':
            default:
                this._layoutNone(contentArea);
                break;
        }
        
        this._updateScrollBounds();
        this._needsLayout = false;
    }

    /**
     * No layout - children keep their explicit positions
     */
    _layoutNone(contentArea) {
        for (const child of this.children) {
            this._layoutCache.push({
                component: child,
                x: contentArea.x + child.x,
                y: contentArea.y + child.y,
                width: child.width,
                height: child.height
            });
        }
    }

    /**
     * Horizontal layout - arrange children left to right
     */
    _layoutHorizontal(contentArea) {
        let currentX = contentArea.x;
        let currentY = contentArea.y;
        let rowHeight = 0;
        
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            
            // Check if we need to wrap to next row
            if (this.wrap && i > 0 && currentX + child.width > contentArea.x + contentArea.width) {
                currentX = contentArea.x;
                currentY += rowHeight + this.spacing;
                rowHeight = 0;
            }
            
            // Calculate Y position based on alignment
            let childY = currentY;
            if (this.alignment === 'center') {
                childY = currentY + (contentArea.height - child.height) / 2;
            } else if (this.alignment === 'end') {
                childY = contentArea.y + contentArea.height - child.height;
            } else if (this.alignment === 'stretch') {
                // Stretch to container height
                childY = currentY;
                child.height = contentArea.height;
            }
            
            this._layoutCache.push({
                component: child,
                x: currentX,
                y: childY,
                width: child.width,
                height: child.height
            });
            
            currentX += child.width + this.spacing;
            rowHeight = Math.max(rowHeight, child.height);
        }
    }

    /**
     * Vertical layout - arrange children top to bottom
     */
    _layoutVertical(contentArea) {
        let currentX = contentArea.x;
        let currentY = contentArea.y;
        let columnWidth = 0;
        
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            
            // Check if we need to wrap to next column
            if (this.wrap && i > 0 && currentY + child.height > contentArea.y + contentArea.height) {
                currentY = contentArea.y;
                currentX += columnWidth + this.spacing;
                columnWidth = 0;
            }
            
            // Calculate X position based on alignment
            let childX = currentX;
            if (this.alignment === 'center') {
                childX = currentX + (contentArea.width - child.width) / 2;
            } else if (this.alignment === 'end') {
                childX = contentArea.x + contentArea.width - child.width;
            } else if (this.alignment === 'stretch') {
                // Stretch to container width
                childX = currentX;
                child.width = contentArea.width;
            }
            
            this._layoutCache.push({
                component: child,
                x: childX,
                y: currentY,
                width: child.width,
                height: child.height
            });
            
            currentY += child.height + this.spacing;
            columnWidth = Math.max(columnWidth, child.width);
        }
    }

    /**
     * Grid layout - arrange children in a grid
     */
    _layoutGrid(contentArea) {
        const cellWidth = (contentArea.width - (this.columns - 1) * this.spacing) / this.columns;
        const estimatedRows = Math.ceil(this.children.length / this.columns);
        const cellHeight = this.rows > 0 ? 
            (contentArea.height - (this.rows - 1) * this.spacing) / this.rows :
            cellWidth; // Square cells if rows not specified
        
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const col = i % this.columns;
            const row = Math.floor(i / this.columns);
            
            const cellX = contentArea.x + col * (cellWidth + this.spacing);
            const cellY = contentArea.y + row * (cellHeight + this.spacing);
            
            // Calculate child position within cell based on alignment
            let childX = cellX;
            let childY = cellY;
            let childWidth = child.width;
            let childHeight = child.height;
            
            if (this.alignment === 'stretch') {
                childWidth = cellWidth;
                childHeight = cellHeight;
            } else {
                if (this.alignment === 'center') {
                    childX = cellX + (cellWidth - child.width) / 2;
                    childY = cellY + (cellHeight - child.height) / 2;
                } else if (this.alignment === 'end') {
                    childX = cellX + cellWidth - child.width;
                    childY = cellY + cellHeight - child.height;
                }
            }
            
            this._layoutCache.push({
                component: child,
                x: childX,
                y: childY,
                width: childWidth,
                height: childHeight
            });
        }
    }

    /**
     * Update scroll bounds based on content size
     */
    _updateScrollBounds() {
        if (!this.scrollable) {
            this.maxScrollX = 0;
            this.maxScrollY = 0;
            return;
        }
        
        let contentWidth = 0;
        let contentHeight = 0;
        
        // Find the total content bounds
        for (const layout of this._layoutCache) {
            contentWidth = Math.max(contentWidth, layout.x + layout.width - this.x);
            contentHeight = Math.max(contentHeight, layout.y + layout.height - this.y);
        }
        
        // Calculate scroll limits
        this.maxScrollX = Math.max(0, contentWidth - (this.width - this.padding.left - this.padding.right));
        this.maxScrollY = Math.max(0, contentHeight - (this.height - this.padding.top - this.padding.bottom));
        
        // Clamp current scroll position
        this.scrollX = Math.max(0, Math.min(this.scrollX, this.maxScrollX));
        this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScrollY));
    }

    /**
     * Scroll to specific position
     */
    scrollTo(x, y) {
        this.scrollX = Math.max(0, Math.min(x, this.maxScrollX));
        this.scrollY = Math.max(0, Math.min(y, this.maxScrollY));
        this._invalidate();
        return this;
    }

    /**
     * Scroll by relative amount
     */
    scrollBy(deltaX, deltaY) {
        return this.scrollTo(this.scrollX + deltaX, this.scrollY + deltaY);
    }

    /**
     * Handle mouse wheel event for scrolling
     */
    onMouseWheel(event) {
        if (this.scrollable && this.enabled) {
            const scrollSpeed = 30;
            this.scrollBy(event.deltaX * scrollSpeed, event.deltaY * scrollSpeed);
            event.preventDefault();
        }
    }

    /**
     * Override getBounds to trigger layout when size changes
     */
    getBounds() {
        if (this._needsUpdate) {
            this._needsLayout = true;
        }
        return super.getBounds();
    }

    /**
     * Update the container and its children
     */
    update(deltaTime) {
        this._layoutChildren();
        
        // Update children
        for (const child of this.children) {
            if (child.update) {
                child.update(deltaTime);
            }
        }
    }

    /**
     * Render the container and its children
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
        
        // Set up clipping for content area if needed
        if (this.scrollable || this.borderRadius > 0) {
            const contentX = bounds.x + this.padding.left;
            const contentY = bounds.y + this.padding.top;
            const contentWidth = bounds.width - this.padding.left - this.padding.right;
            const contentHeight = bounds.height - this.padding.top - this.padding.bottom;
            
            ctx.save();
            
            if (this.borderRadius > 0) {
                this._drawRoundedRect(ctx, contentX, contentY, contentWidth, contentHeight, this.borderRadius);
                ctx.clip();
            } else {
                ctx.beginPath();
                ctx.rect(contentX, contentY, contentWidth, contentHeight);
                ctx.clip();
            }
            
            // Apply scroll offset
            if (this.scrollable) {
                ctx.translate(-this.scrollX, -this.scrollY);
            }
        }
        
        // Render children
        this._layoutChildren();
        
        for (const layout of this._layoutCache) {
            const child = layout.component;
            if (child.visible) {
                // Temporarily update child position for rendering
                const originalX = child.x;
                const originalY = child.y;
                const originalWidth = child.width;
                const originalHeight = child.height;
                
                child.x = layout.x - bounds.x; // Relative to container
                child.y = layout.y - bounds.y;
                child.width = layout.width;
                child.height = layout.height;
                
                // Check if child is visible in viewport
                if (this._isChildVisible(child, bounds)) {
                    child.render(ctx);
                }
                
                // Restore original position
                child.x = originalX;
                child.y = originalY;
                child.width = originalWidth;
                child.height = originalHeight;
            }
        }
        
        // Restore clipping context
        if (this.scrollable || this.borderRadius > 0) {
            ctx.restore();
        }
        
        ctx.restore();
    }

    /**
     * Check if a child component is visible within the container viewport
     */
    _isChildVisible(child, containerBounds) {
        if (!this.scrollable) return true;
        
        const childBounds = child.getBounds();
        const viewportX = containerBounds.x + this.padding.left;
        const viewportY = containerBounds.y + this.padding.top;
        const viewportWidth = containerBounds.width - this.padding.left - this.padding.right;
        const viewportHeight = containerBounds.height - this.padding.top - this.padding.bottom;
        
        // Check intersection with viewport
        return !(childBounds.x > viewportX + viewportWidth ||
                childBounds.x + childBounds.width < viewportX ||
                childBounds.y > viewportY + viewportHeight ||
                childBounds.y + childBounds.height < viewportY);
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
