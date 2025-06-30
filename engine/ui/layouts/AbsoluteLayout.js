/**
 * AbsoluteLayout - Provides absolute positioning for UI components
 * Allows precise control over component placement with support for anchoring,
 * constraints, and responsive positioning.
 */

export class AbsoluteLayout {
    constructor(container) {
        this.container = container;
        this.children = new Map(); // component -> positioning data
        this.anchors = new Map(); // component -> anchor settings
        this.constraints = new Map(); // component -> constraint settings
        this.responsive = new Map(); // component -> responsive rules
        
        this.containerBounds = { x: 0, y: 0, width: 0, height: 0 };
        this.needsLayout = true;
    }

    /**
     * Add a component with absolute positioning
     */
    addChild(component, options = {}) {
        const positioning = {
            x: options.x || 0,
            y: options.y || 0,
            width: options.width || component.width || 'auto',
            height: options.height || component.height || 'auto',
            zIndex: options.zIndex || 0,
            visible: options.visible !== false
        };

        this.children.set(component, positioning);

        // Set up anchoring if specified
        if (options.anchor) {
            this.setAnchor(component, options.anchor);
        }

        // Set up constraints if specified
        if (options.constraints) {
            this.setConstraints(component, options.constraints);
        }

        // Set up responsive rules if specified
        if (options.responsive) {
            this.setResponsive(component, options.responsive);
        }

        this.needsLayout = true;
        return this;
    }

    /**
     * Remove a component from the layout
     */
    removeChild(component) {
        this.children.delete(component);
        this.anchors.delete(component);
        this.constraints.delete(component);
        this.responsive.delete(component);
        this.needsLayout = true;
        return this;
    }

    /**
     * Set anchor points for a component
     * Anchors define how the component is positioned relative to its parent
     */
    setAnchor(component, anchor) {
        const anchorData = {
            horizontal: anchor.horizontal || 'left', // 'left', 'center', 'right'
            vertical: anchor.vertical || 'top', // 'top', 'middle', 'bottom'
            offsetX: anchor.offsetX || 0,
            offsetY: anchor.offsetY || 0
        };

        this.anchors.set(component, anchorData);
        this.needsLayout = true;
        return this;
    }

    /**
     * Set positioning constraints for a component
     */
    setConstraints(component, constraints) {
        const constraintData = {
            minX: constraints.minX,
            maxX: constraints.maxX,
            minY: constraints.minY,
            maxY: constraints.maxY,
            minWidth: constraints.minWidth,
            maxWidth: constraints.maxWidth,
            minHeight: constraints.minHeight,
            maxHeight: constraints.maxHeight,
            keepInBounds: constraints.keepInBounds !== false
        };

        this.constraints.set(component, constraintData);
        this.needsLayout = true;
        return this;
    }

    /**
     * Set responsive positioning rules
     */
    setResponsive(component, responsive) {
        const responsiveData = {
            breakpoints: responsive.breakpoints || {},
            scaleWithContainer: responsive.scaleWithContainer || false,
            maintainAspectRatio: responsive.maintainAspectRatio || false
        };

        this.responsive.set(component, responsiveData);
        this.needsLayout = true;
        return this;
    }

    /**
     * Update container bounds and trigger layout if needed
     */
    updateContainer(bounds) {
        const changed = (
            this.containerBounds.x !== bounds.x ||
            this.containerBounds.y !== bounds.y ||
            this.containerBounds.width !== bounds.width ||
            this.containerBounds.height !== bounds.height
        );

        if (changed) {
            this.containerBounds = { ...bounds };
            this.needsLayout = true;
        }
    }

    /**
     * Perform layout calculation and positioning
     */
    layout() {
        if (!this.needsLayout) return;

        // Sort components by z-index for proper layering
        const sortedComponents = Array.from(this.children.keys()).sort((a, b) => {
            const aPos = this.children.get(a);
            const bPos = this.children.get(b);
            return aPos.zIndex - bPos.zIndex;
        });

        for (const component of sortedComponents) {
            this.layoutComponent(component);
        }

        this.needsLayout = false;
    }

    /**
     * Layout a single component
     */
    layoutComponent(component) {
        const positioning = this.children.get(component);
        if (!positioning || !positioning.visible) return;

        let { x, y, width, height } = positioning;

        // Apply responsive rules first
        const responsive = this.responsive.get(component);
        if (responsive) {
            const result = this.applyResponsiveRules(component, responsive, { x, y, width, height });
            x = result.x;
            y = result.y;
            width = result.width;
            height = result.height;
        }

        // Calculate dimensions if auto
        if (width === 'auto') {
            width = component.width || 0;
        }
        if (height === 'auto') {
            height = component.height || 0;
        }

        // Apply anchoring
        const anchor = this.anchors.get(component);
        if (anchor) {
            const result = this.applyAnchoring(anchor, { x, y, width, height });
            x = result.x;
            y = result.y;
        }

        // Apply constraints
        const constraints = this.constraints.get(component);
        if (constraints) {
            const result = this.applyConstraints(constraints, { x, y, width, height });
            x = result.x;
            y = result.y;
            width = result.width;
            height = result.height;
        }

        // Update component position and size
        component.x = x;
        component.y = y;
        component.width = width;
        component.height = height;

        // Update z-index if component supports it
        if (component.setZIndex) {
            component.setZIndex(positioning.zIndex);
        }
    }

    /**
     * Apply responsive positioning rules
     */
    applyResponsiveRules(component, responsive, bounds) {
        let { x, y, width, height } = bounds;

        // Check breakpoints
        const containerWidth = this.containerBounds.width;
        const breakpoints = responsive.breakpoints;
        
        for (const [breakpoint, rules] of Object.entries(breakpoints)) {
            const breakpointWidth = parseInt(breakpoint);
            if (containerWidth <= breakpointWidth) {
                if (rules.x !== undefined) x = rules.x;
                if (rules.y !== undefined) y = rules.y;
                if (rules.width !== undefined) width = rules.width;
                if (rules.height !== undefined) height = rules.height;
                break;
            }
        }

        // Apply scaling if enabled
        if (responsive.scaleWithContainer) {
            const scaleX = this.containerBounds.width / (responsive.baseWidth || 1920);
            const scaleY = this.containerBounds.height / (responsive.baseHeight || 1080);
            
            if (responsive.maintainAspectRatio) {
                const scale = Math.min(scaleX, scaleY);
                x *= scale;
                y *= scale;
                width *= scale;
                height *= scale;
            } else {
                x *= scaleX;
                y *= scaleY;
                width *= scaleX;
                height *= scaleY;
            }
        }

        return { x, y, width, height };
    }

    /**
     * Apply anchor positioning
     */
    applyAnchoring(anchor, bounds) {
        let { x, y, width, height } = bounds;
        const container = this.containerBounds;

        // Horizontal anchoring
        switch (anchor.horizontal) {
            case 'center':
                x = (container.width - width) / 2 + anchor.offsetX;
                break;
            case 'right':
                x = container.width - width - anchor.offsetX;
                break;
            case 'left':
            default:
                x = x + anchor.offsetX;
                break;
        }

        // Vertical anchoring
        switch (anchor.vertical) {
            case 'middle':
                y = (container.height - height) / 2 + anchor.offsetY;
                break;
            case 'bottom':
                y = container.height - height - anchor.offsetY;
                break;
            case 'top':
            default:
                y = y + anchor.offsetY;
                break;
        }

        return { x, y };
    }

    /**
     * Apply positioning and size constraints
     */
    applyConstraints(constraints, bounds) {
        let { x, y, width, height } = bounds;

        // Apply size constraints
        if (constraints.minWidth !== undefined) {
            width = Math.max(width, constraints.minWidth);
        }
        if (constraints.maxWidth !== undefined) {
            width = Math.min(width, constraints.maxWidth);
        }
        if (constraints.minHeight !== undefined) {
            height = Math.max(height, constraints.minHeight);
        }
        if (constraints.maxHeight !== undefined) {
            height = Math.min(height, constraints.maxHeight);
        }

        // Apply position constraints
        if (constraints.minX !== undefined) {
            x = Math.max(x, constraints.minX);
        }
        if (constraints.maxX !== undefined) {
            x = Math.min(x, constraints.maxX);
        }
        if (constraints.minY !== undefined) {
            y = Math.max(y, constraints.minY);
        }
        if (constraints.maxY !== undefined) {
            y = Math.min(y, constraints.maxY);
        }

        // Keep in bounds constraint
        if (constraints.keepInBounds) {
            x = Math.max(0, Math.min(x, this.containerBounds.width - width));
            y = Math.max(0, Math.min(y, this.containerBounds.height - height));
        }

        return { x, y, width, height };
    }

    /**
     * Get component positioning data
     */
    getComponentData(component) {
        return {
            positioning: this.children.get(component),
            anchor: this.anchors.get(component),
            constraints: this.constraints.get(component),
            responsive: this.responsive.get(component)
        };
    }

    /**
     * Update component positioning
     */
    updateComponent(component, updates) {
        const positioning = this.children.get(component);
        if (positioning) {
            Object.assign(positioning, updates);
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Move component to a new position
     */
    moveComponent(component, x, y) {
        return this.updateComponent(component, { x, y });
    }

    /**
     * Resize component
     */
    resizeComponent(component, width, height) {
        return this.updateComponent(component, { width, height });
    }

    /**
     * Set component visibility
     */
    setComponentVisible(component, visible) {
        return this.updateComponent(component, { visible });
    }

    /**
     * Bring component to front
     */
    bringToFront(component) {
        const positioning = this.children.get(component);
        if (positioning) {
            // Find highest z-index and set this component higher
            let maxZ = -Infinity;
            for (const pos of this.children.values()) {
                maxZ = Math.max(maxZ, pos.zIndex);
            }
            positioning.zIndex = maxZ + 1;
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Send component to back
     */
    sendToBack(component) {
        const positioning = this.children.get(component);
        if (positioning) {
            // Find lowest z-index and set this component lower
            let minZ = Infinity;
            for (const pos of this.children.values()) {
                minZ = Math.min(minZ, pos.zIndex);
            }
            positioning.zIndex = minZ - 1;
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Get all components sorted by z-index
     */
    getComponentsByZIndex() {
        return Array.from(this.children.keys()).sort((a, b) => {
            const aPos = this.children.get(a);
            const bPos = this.children.get(b);
            return aPos.zIndex - bPos.zIndex;
        });
    }

    /**
     * Clear all components
     */
    clear() {
        this.children.clear();
        this.anchors.clear();
        this.constraints.clear();
        this.responsive.clear();
        this.needsLayout = true;
        return this;
    }

    /**
     * Get layout statistics
     */
    getStats() {
        return {
            componentCount: this.children.size,
            anchored: this.anchors.size,
            constrained: this.constraints.size,
            responsive: this.responsive.size,
            needsLayout: this.needsLayout
        };
    }
}
