/**
 * StackLayout - Provides layered stacking of UI components
 * Components are arranged in layers with z-index management,
 * alignment options, and automatic sizing capabilities.
 */

export class StackLayout {
    constructor(container) {
        this.container = container;
        this.layers = new Map(); // component -> layer data
        this.layerOrder = []; // ordered list of components by layer
        this.alignment = {
            horizontal: 'center', // 'left', 'center', 'right', 'stretch'
            vertical: 'center' // 'top', 'center', 'bottom', 'stretch'
        };
        
        this.containerBounds = { x: 0, y: 0, width: 0, height: 0 };
        this.padding = { top: 0, right: 0, bottom: 0, left: 0 };
        this.spacing = 0; // spacing between layers (for depth effects)
        this.needsLayout = true;
    }

    /**
     * Add a component to a specific layer
     */
    addLayer(component, options = {}) {
        const layerData = {
            zIndex: options.zIndex || this.layerOrder.length,
            alignment: {
                horizontal: options.alignment?.horizontal || this.alignment.horizontal,
                vertical: options.alignment?.vertical || this.alignment.vertical
            },
            offset: {
                x: options.offset?.x || 0,
                y: options.offset?.y || 0
            },
            size: {
                width: options.size?.width || 'auto',
                height: options.size?.height || 'auto',
                minWidth: options.size?.minWidth,
                maxWidth: options.size?.maxWidth,
                minHeight: options.size?.minHeight,
                maxHeight: options.size?.maxHeight
            },
            visible: options.visible !== false,
            opacity: options.opacity !== undefined ? options.opacity : 1,
            clipToBounds: options.clipToBounds || false,
            interactive: options.interactive !== false
        };

        this.layers.set(component, layerData);
        this.insertInOrder(component);
        this.needsLayout = true;
        return this;
    }

    /**
     * Remove a component from the stack
     */
    removeLayer(component) {
        this.layers.delete(component);
        const index = this.layerOrder.indexOf(component);
        if (index !== -1) {
            this.layerOrder.splice(index, 1);
        }
        this.needsLayout = true;
        return this;
    }

    /**
     * Insert component in the correct z-order
     */
    insertInOrder(component) {
        const layerData = this.layers.get(component);
        if (!layerData) return;

        // Remove if already in order
        const existingIndex = this.layerOrder.indexOf(component);
        if (existingIndex !== -1) {
            this.layerOrder.splice(existingIndex, 1);
        }

        // Find correct insertion point
        let insertIndex = 0;
        for (let i = 0; i < this.layerOrder.length; i++) {
            const otherComponent = this.layerOrder[i];
            const otherLayer = this.layers.get(otherComponent);
            if (otherLayer && otherLayer.zIndex <= layerData.zIndex) {
                insertIndex = i + 1;
            } else {
                break;
            }
        }

        this.layerOrder.splice(insertIndex, 0, component);
    }

    /**
     * Set the z-index of a layer
     */
    setLayerIndex(component, zIndex) {
        const layerData = this.layers.get(component);
        if (layerData) {
            layerData.zIndex = zIndex;
            this.insertInOrder(component);
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Move layer to front
     */
    bringToFront(component) {
        const maxZ = Math.max(...Array.from(this.layers.values()).map(l => l.zIndex));
        return this.setLayerIndex(component, maxZ + 1);
    }

    /**
     * Move layer to back
     */
    sendToBack(component) {
        const minZ = Math.min(...Array.from(this.layers.values()).map(l => l.zIndex));
        return this.setLayerIndex(component, minZ - 1);
    }

    /**
     * Move layer up one level
     */
    moveUp(component) {
        const currentIndex = this.layerOrder.indexOf(component);
        if (currentIndex < this.layerOrder.length - 1) {
            const nextComponent = this.layerOrder[currentIndex + 1];
            const nextLayer = this.layers.get(nextComponent);
            if (nextLayer) {
                return this.setLayerIndex(component, nextLayer.zIndex + 1);
            }
        }
        return this;
    }

    /**
     * Move layer down one level
     */
    moveDown(component) {
        const currentIndex = this.layerOrder.indexOf(component);
        if (currentIndex > 0) {
            const prevComponent = this.layerOrder[currentIndex - 1];
            const prevLayer = this.layers.get(prevComponent);
            if (prevLayer) {
                return this.setLayerIndex(component, prevLayer.zIndex - 1);
            }
        }
        return this;
    }

    /**
     * Set default alignment for new layers
     */
    setAlignment(horizontal, vertical) {
        this.alignment.horizontal = horizontal;
        this.alignment.vertical = vertical;
        this.needsLayout = true;
        return this;
    }

    /**
     * Set alignment for a specific layer
     */
    setLayerAlignment(component, horizontal, vertical) {
        const layerData = this.layers.get(component);
        if (layerData) {
            layerData.alignment.horizontal = horizontal;
            layerData.alignment.vertical = vertical;
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Set padding for the stack container
     */
    setPadding(top, right = top, bottom = top, left = right) {
        this.padding = { top, right, bottom, left };
        this.needsLayout = true;
        return this;
    }

    /**
     * Set spacing between layers (for depth effects)
     */
    setSpacing(spacing) {
        this.spacing = spacing;
        this.needsLayout = true;
        return this;
    }

    /**
     * Update container bounds
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
     * Perform layout calculation
     */
    layout() {
        if (!this.needsLayout) return;

        const availableWidth = this.containerBounds.width - this.padding.left - this.padding.right;
        const availableHeight = this.containerBounds.height - this.padding.top - this.padding.bottom;

        for (let i = 0; i < this.layerOrder.length; i++) {
            const component = this.layerOrder[i];
            const layerData = this.layers.get(component);
            
            if (!layerData || !layerData.visible) continue;

            this.layoutLayer(component, layerData, availableWidth, availableHeight, i);
        }

        this.needsLayout = false;
    }

    /**
     * Layout a single layer
     */
    layoutLayer(component, layerData, availableWidth, availableHeight, layerIndex) {
        // Calculate component size
        let width = this.calculateDimension(layerData.size.width, availableWidth, component.width);
        let height = this.calculateDimension(layerData.size.height, availableHeight, component.height);

        // Apply size constraints
        if (layerData.size.minWidth !== undefined) {
            width = Math.max(width, layerData.size.minWidth);
        }
        if (layerData.size.maxWidth !== undefined) {
            width = Math.min(width, layerData.size.maxWidth);
        }
        if (layerData.size.minHeight !== undefined) {
            height = Math.max(height, layerData.size.minHeight);
        }
        if (layerData.size.maxHeight !== undefined) {
            height = Math.min(height, layerData.size.maxHeight);
        }

        // Calculate position based on alignment
        let x = this.containerBounds.x + this.padding.left;
        let y = this.containerBounds.y + this.padding.top;

        // Apply horizontal alignment
        switch (layerData.alignment.horizontal) {
            case 'center':
                x += (availableWidth - width) / 2;
                break;
            case 'right':
                x += availableWidth - width;
                break;
            case 'stretch':
                width = availableWidth;
                break;
            case 'left':
            default:
                // x already set correctly
                break;
        }

        // Apply vertical alignment
        switch (layerData.alignment.vertical) {
            case 'center':
                y += (availableHeight - height) / 2;
                break;
            case 'bottom':
                y += availableHeight - height;
                break;
            case 'stretch':
                height = availableHeight;
                break;
            case 'top':
            default:
                // y already set correctly
                break;
        }

        // Apply offset
        x += layerData.offset.x;
        y += layerData.offset.y;

        // Apply layer spacing for depth effect
        if (this.spacing > 0) {
            const depthOffset = layerIndex * this.spacing;
            x += depthOffset;
            y += depthOffset;
        }

        // Update component properties
        component.x = x;
        component.y = y;
        component.width = width;
        component.height = height;

        // Set z-index if component supports it
        if (component.setZIndex) {
            component.setZIndex(layerData.zIndex);
        }

        // Set opacity if component supports it
        if (component.setOpacity && layerData.opacity !== 1) {
            component.setOpacity(layerData.opacity);
        }

        // Set clipping if component supports it
        if (component.setClipping && layerData.clipToBounds) {
            component.setClipping(true);
        }

        // Set interactivity if component supports it
        if (component.setInteractive) {
            component.setInteractive(layerData.interactive);
        }
    }

    /**
     * Calculate dimension from string or numeric value
     */
    calculateDimension(dimension, available, fallback) {
        if (typeof dimension === 'number') {
            return dimension;
        }
        
        if (typeof dimension === 'string') {
            if (dimension === 'auto') {
                return fallback || 0;
            }
            if (dimension.endsWith('%')) {
                const percentage = parseFloat(dimension) / 100;
                return available * percentage;
            }
            if (dimension.endsWith('px')) {
                return parseFloat(dimension);
            }
        }

        return fallback || 0;
    }

    /**
     * Set layer visibility
     */
    setLayerVisible(component, visible) {
        const layerData = this.layers.get(component);
        if (layerData) {
            layerData.visible = visible;
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Set layer opacity
     */
    setLayerOpacity(component, opacity) {
        const layerData = this.layers.get(component);
        if (layerData) {
            layerData.opacity = Math.max(0, Math.min(1, opacity));
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Update layer properties
     */
    updateLayer(component, updates) {
        const layerData = this.layers.get(component);
        if (layerData) {
            // Handle nested property updates
            if (updates.alignment) {
                Object.assign(layerData.alignment, updates.alignment);
                delete updates.alignment;
            }
            if (updates.offset) {
                Object.assign(layerData.offset, updates.offset);
                delete updates.offset;
            }
            if (updates.size) {
                Object.assign(layerData.size, updates.size);
                delete updates.size;
            }

            // Handle direct property updates
            Object.assign(layerData, updates);
            
            // Re-order if z-index changed
            if (updates.zIndex !== undefined) {
                this.insertInOrder(component);
            }
            
            this.needsLayout = true;
        }
        return this;
    }

    /**
     * Get layer data
     */
    getLayerData(component) {
        return this.layers.get(component);
    }

    /**
     * Get all layers in z-order
     */
    getLayers() {
        return [...this.layerOrder];
    }

    /**
     * Get layer at specific index
     */
    getLayerAt(index) {
        return this.layerOrder[index];
    }

    /**
     * Get top layer
     */
    getTopLayer() {
        return this.layerOrder[this.layerOrder.length - 1];
    }

    /**
     * Get bottom layer
     */
    getBottomLayer() {
        return this.layerOrder[0];
    }

    /**
     * Find layer index
     */
    getLayerIndex(component) {
        return this.layerOrder.indexOf(component);
    }

    /**
     * Clear all layers
     */
    clear() {
        this.layers.clear();
        this.layerOrder.length = 0;
        this.needsLayout = true;
        return this;
    }

    /**
     * Get layout statistics
     */
    getStats() {
        return {
            layerCount: this.layers.size,
            visibleLayers: Array.from(this.layers.values()).filter(l => l.visible).length,
            needsLayout: this.needsLayout,
            alignment: { ...this.alignment },
            padding: { ...this.padding },
            spacing: this.spacing
        };
    }

    /**
     * Create preset stack configurations
     */
    static createPresets() {
        return {
            // Centered overlay stack
            overlay: (container) => {
                const stack = new StackLayout(container);
                stack.setAlignment('center', 'center');
                return stack;
            },

            // Card stack with slight offsets
            cards: (container) => {
                const stack = new StackLayout(container);
                stack.setAlignment('center', 'center');
                stack.setSpacing(5);
                return stack;
            },

            // Dialog stack with backdrop
            dialog: (container) => {
                const stack = new StackLayout(container);
                stack.setAlignment('center', 'center');
                stack.setPadding(20);
                return stack;
            },

            // Full coverage stack
            fullscreen: (container) => {
                const stack = new StackLayout(container);
                stack.setAlignment('stretch', 'stretch');
                return stack;
            }
        };
    }
}
