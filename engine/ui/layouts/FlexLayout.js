/**
 * @file FlexLayout.js
 * @description Flexbox-style layout system for UI components
 */

/**
 * @class FlexLayout
 * @classdesc Implements a flexbox-style layout system for arranging UI components
 */
export class FlexLayout {
    constructor(config = {}) {
        this.type = 'flex';
        this.direction = config.direction || 'row'; // 'row', 'column', 'row-reverse', 'column-reverse'
        this.justifyContent = config.justifyContent || 'flex-start'; // 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'
        this.alignItems = config.alignItems || 'stretch'; // 'stretch', 'flex-start', 'flex-end', 'center', 'baseline'
        this.flexWrap = config.flexWrap || 'nowrap'; // 'nowrap', 'wrap', 'wrap-reverse'
        this.gap = config.gap || 0;
        this.padding = config.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        
        // Container properties
        this.container = null;
        this.children = [];
    }

    /**
     * Set the container for this layout
     */
    setContainer(container) {
        this.container = container;
        return this;
    }

    /**
     * Add a child component to this layout
     */
    addChild(component, flexConfig = {}) {
        const flexItem = {
            component,
            flex: flexConfig.flex || 0, // flex-grow, flex-shrink, flex-basis combined
            flexGrow: flexConfig.flexGrow !== undefined ? flexConfig.flexGrow : 0,
            flexShrink: flexConfig.flexShrink !== undefined ? flexConfig.flexShrink : 1,
            flexBasis: flexConfig.flexBasis || 'auto',
            alignSelf: flexConfig.alignSelf || 'auto', // 'auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch'
            order: flexConfig.order || 0
        };
        
        this.children.push(flexItem);
        return this;
    }

    /**
     * Remove a child component from this layout
     */
    removeChild(component) {
        const index = this.children.findIndex(item => item.component === component);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
        return this;
    }

    /**
     * Calculate and apply layout to all children
     */
    calculateLayout() {
        if (!this.container || this.children.length === 0) {
            return;
        }

        // Sort children by order
        const sortedChildren = [...this.children].sort((a, b) => a.order - b.order);

        // Get container dimensions
        const containerWidth = this.container.width - this.padding.left - this.padding.right;
        const containerHeight = this.container.height - this.padding.top - this.padding.bottom;

        // Determine main and cross axis
        const isRow = this.direction === 'row' || this.direction === 'row-reverse';
        const mainAxisSize = isRow ? containerWidth : containerHeight;
        const crossAxisSize = isRow ? containerHeight : containerWidth;

        // Calculate total gap space
        const totalGap = this.gap * Math.max(0, sortedChildren.length - 1);

        // First pass: calculate natural sizes and collect flex items
        let totalNaturalSize = 0;
        let totalFlexGrow = 0;
        const flexItems = [];

        sortedChildren.forEach(item => {
            const component = item.component;
            const naturalSize = isRow ? component.width : component.height;
            
            totalNaturalSize += naturalSize;
            totalFlexGrow += item.flexGrow;
            
            flexItems.push({
                ...item,
                naturalSize,
                finalSize: naturalSize
            });
        });

        // Second pass: distribute remaining space among flex items
        const remainingSpace = mainAxisSize - totalNaturalSize - totalGap;
        
        if (remainingSpace > 0 && totalFlexGrow > 0) {
            flexItems.forEach(item => {
                if (item.flexGrow > 0) {
                    const extraSpace = (remainingSpace * item.flexGrow) / totalFlexGrow;
                    item.finalSize = item.naturalSize + extraSpace;
                }
            });
        } else if (remainingSpace < 0) {
            // Handle shrinking
            let totalFlexShrink = 0;
            let totalWeightedSize = 0;
            
            flexItems.forEach(item => {
                totalFlexShrink += item.flexShrink;
                totalWeightedSize += item.naturalSize * item.flexShrink;
            });
            
            if (totalFlexShrink > 0) {
                const shrinkRatio = Math.abs(remainingSpace) / totalWeightedSize;
                flexItems.forEach(item => {
                    if (item.flexShrink > 0) {
                        const shrinkAmount = item.naturalSize * item.flexShrink * shrinkRatio;
                        item.finalSize = Math.max(0, item.naturalSize - shrinkAmount);
                    }
                });
            }
        }

        // Third pass: position items
        let currentPosition = this._getStartPosition(mainAxisSize, flexItems);
        
        flexItems.forEach((item, index) => {
            const component = item.component;
            
            // Set main axis position and size
            if (isRow) {
                component.x = this.container.x + this.padding.left + currentPosition;
                component.width = item.finalSize;
                currentPosition += item.finalSize + this.gap;
                
                // Set cross axis position and size
                this._applyCrossAxisAlignment(component, item, this.container.y + this.padding.top, crossAxisSize, false);
            } else {
                component.y = this.container.y + this.padding.top + currentPosition;
                component.height = item.finalSize;
                currentPosition += item.finalSize + this.gap;
                
                // Set cross axis position and size
                this._applyCrossAxisAlignment(component, item, this.container.x + this.padding.left, crossAxisSize, true);
            }
        });

        // Handle reverse direction
        if (this.direction === 'row-reverse' || this.direction === 'column-reverse') {
            this._reverseLayout(flexItems, isRow);
        }
    }

    /**
     * Get the starting position for items based on justifyContent
     */
    _getStartPosition(mainAxisSize, flexItems) {
        const totalItemsSize = flexItems.reduce((sum, item) => sum + item.finalSize, 0);
        const totalGap = this.gap * Math.max(0, flexItems.length - 1);
        const totalSize = totalItemsSize + totalGap;
        
        switch (this.justifyContent) {
            case 'flex-end':
                return mainAxisSize - totalSize;
            case 'center':
                return (mainAxisSize - totalSize) / 2;
            case 'space-between':
                return 0; // Items will be distributed with equal space between
            case 'space-around':
                return (mainAxisSize - totalSize) / (flexItems.length * 2);
            case 'space-evenly':
                return (mainAxisSize - totalSize) / (flexItems.length + 1);
            default: // 'flex-start'
                return 0;
        }
    }

    /**
     * Apply cross-axis alignment to a component
     */
    _applyCrossAxisAlignment(component, item, containerStart, crossAxisSize, isVertical) {
        const alignSelf = item.alignSelf !== 'auto' ? item.alignSelf : this.alignItems;
        
        switch (alignSelf) {
            case 'flex-start':
                if (isVertical) {
                    component.x = containerStart;
                } else {
                    component.y = containerStart;
                }
                break;
            case 'flex-end':
                if (isVertical) {
                    component.x = containerStart + crossAxisSize - component.width;
                } else {
                    component.y = containerStart + crossAxisSize - component.height;
                }
                break;
            case 'center':
                if (isVertical) {
                    component.x = containerStart + (crossAxisSize - component.width) / 2;
                } else {
                    component.y = containerStart + (crossAxisSize - component.height) / 2;
                }
                break;
            case 'stretch':
                if (isVertical) {
                    component.x = containerStart;
                    component.width = crossAxisSize;
                } else {
                    component.y = containerStart;
                    component.height = crossAxisSize;
                }
                break;
            case 'baseline':
                // For baseline alignment, we'd need font metrics
                // For now, treat it as flex-start
                if (isVertical) {
                    component.x = containerStart;
                } else {
                    component.y = containerStart;
                }
                break;
        }
    }

    /**
     * Reverse the layout for reverse directions
     */
    _reverseLayout(flexItems, isRow) {
        if (isRow) {
            // Reverse row: flip x positions
            const containerRight = this.container.x + this.container.width - this.padding.right;
            flexItems.forEach(item => {
                const component = item.component;
                component.x = containerRight - (component.x - this.container.x) - component.width;
            });
        } else {
            // Reverse column: flip y positions
            const containerBottom = this.container.y + this.container.height - this.padding.bottom;
            flexItems.forEach(item => {
                const component = item.component;
                component.y = containerBottom - (component.y - this.container.y) - component.height;
            });
        }
    }

    /**
     * Update layout when container size changes
     */
    onContainerResize() {
        this.calculateLayout();
    }

    /**
     * Get layout information for debugging
     */
    getLayoutInfo() {
        return {
            type: this.type,
            direction: this.direction,
            justifyContent: this.justifyContent,
            alignItems: this.alignItems,
            flexWrap: this.flexWrap,
            gap: this.gap,
            childCount: this.children.length,
            containerSize: this.container ? {
                width: this.container.width,
                height: this.container.height
            } : null
        };
    }
}
