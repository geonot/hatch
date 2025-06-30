/**
 * GridLayout - CSS Grid-style layout system for UI components
 * Provides comprehensive grid layout capabilities with template areas, spans, and alignment
 */
export class GridLayout {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            columns: 'auto',
            rows: 'auto',
            columnGap: 0,
            rowGap: 0,
            gap: null,
            justifyItems: 'stretch',
            alignItems: 'stretch',
            justifyContent: 'start',
            alignContent: 'start',
            templateAreas: null,
            autoFlow: 'row',
            autoColumns: 'auto',
            autoRows: 'auto',
            ...options
        };

        this.gridItems = [];
        this.templateAreaMap = new Map();
        this.appliedStyles = new Map();
        
        this.setupGrid();
        this.parseTemplateAreas();
    }

    setupGrid() {
        const { container, options } = this;
        
        // Apply grid styles to container
        Object.assign(container.style, {
            display: 'grid',
            gridTemplateColumns: this.normalizeGridTemplate(options.columns),
            gridTemplateRows: this.normalizeGridTemplate(options.rows),
            columnGap: `${options.gap || options.columnGap}px`,
            rowGap: `${options.gap || options.rowGap}px`,
            justifyItems: options.justifyItems,
            alignItems: options.alignItems,
            justifyContent: options.justifyContent,
            alignContent: options.alignContent,
            gridAutoFlow: options.autoFlow,
            gridAutoColumns: this.normalizeGridTemplate(options.autoColumns),
            gridAutoRows: this.normalizeGridTemplate(options.autoRows)
        });

        if (options.templateAreas) {
            container.style.gridTemplateAreas = this.normalizeTemplateAreas(options.templateAreas);
        }
    }

    normalizeGridTemplate(template) {
        if (typeof template === 'string') {
            return template;
        }
        
        if (Array.isArray(template)) {
            return template.map(size => {
                if (typeof size === 'number') {
                    return `${size}px`;
                }
                return size;
            }).join(' ');
        }
        
        if (typeof template === 'number') {
            return `repeat(${template}, 1fr)`;
        }
        
        return 'auto';
    }

    normalizeTemplateAreas(areas) {
        if (typeof areas === 'string') {
            return areas;
        }
        
        if (Array.isArray(areas)) {
            return areas.map(row => `"${row}"`).join(' ');
        }
        
        return areas;
    }

    parseTemplateAreas() {
        if (!this.options.templateAreas) return;
        
        const areas = this.options.templateAreas;
        const rows = Array.isArray(areas) ? areas : areas.split(/\s+/).filter(Boolean);
        
        rows.forEach((row, rowIndex) => {
            const cells = row.replace(/"/g, '').split(/\s+/);
            cells.forEach((cellName, colIndex) => {
                if (cellName !== '.') {
                    if (!this.templateAreaMap.has(cellName)) {
                        this.templateAreaMap.set(cellName, {
                            startRow: rowIndex + 1,
                            endRow: rowIndex + 2,
                            startCol: colIndex + 1,
                            endCol: colIndex + 2
                        });
                    } else {
                        const area = this.templateAreaMap.get(cellName);
                        area.endRow = Math.max(area.endRow, rowIndex + 2);
                        area.endCol = Math.max(area.endCol, colIndex + 2);
                    }
                }
            });
        });
    }

    addItem(component, gridOptions = {}) {
        if (!component || !component.element) {
            console.warn('GridLayout: Invalid component provided');
            return this;
        }

        const item = {
            component,
            options: {
                column: 'auto',
                row: 'auto',
                columnSpan: 1,
                rowSpan: 1,
                area: null,
                justifySelf: 'auto',
                alignSelf: 'auto',
                order: 0,
                ...gridOptions
            }
        };

        this.gridItems.push(item);
        this.applyItemStyles(item);
        
        if (!this.container.children.includes(component.element)) {
            this.container.appendChild(component.element);
        }

        return this;
    }

    applyItemStyles(item) {
        const { component, options } = item;
        const styles = {};

        // Handle grid area first (overrides column/row)
        if (options.area && this.templateAreaMap.has(options.area)) {
            styles.gridArea = options.area;
        } else {
            // Handle column placement
            if (options.column !== 'auto') {
                if (typeof options.column === 'number') {
                    styles.gridColumnStart = options.column;
                    styles.gridColumnEnd = options.column + (options.columnSpan || 1);
                } else {
                    styles.gridColumn = options.column;
                }
            } else if (options.columnSpan > 1) {
                styles.gridColumnEnd = `span ${options.columnSpan}`;
            }

            // Handle row placement
            if (options.row !== 'auto') {
                if (typeof options.row === 'number') {
                    styles.gridRowStart = options.row;
                    styles.gridRowEnd = options.row + (options.rowSpan || 1);
                } else {
                    styles.gridRow = options.row;
                }
            } else if (options.rowSpan > 1) {
                styles.gridRowEnd = `span ${options.rowSpan}`;
            }
        }

        // Apply alignment and order
        if (options.justifySelf !== 'auto') {
            styles.justifySelf = options.justifySelf;
        }
        if (options.alignSelf !== 'auto') {
            styles.alignSelf = options.alignSelf;
        }
        if (options.order !== 0) {
            styles.order = options.order;
        }

        Object.assign(component.element.style, styles);
        this.appliedStyles.set(component, styles);
    }

    removeItem(component) {
        const index = this.gridItems.findIndex(item => item.component === component);
        if (index !== -1) {
            this.gridItems.splice(index, 1);
            
            // Clear applied styles
            if (this.appliedStyles.has(component)) {
                const styles = this.appliedStyles.get(component);
                Object.keys(styles).forEach(key => {
                    component.element.style[key] = '';
                });
                this.appliedStyles.delete(component);
            }
            
            if (this.container.contains(component.element)) {
                this.container.removeChild(component.element);
            }
        }
        return this;
    }

    updateItem(component, newOptions) {
        const item = this.gridItems.find(item => item.component === component);
        if (item) {
            Object.assign(item.options, newOptions);
            this.applyItemStyles(item);
        }
        return this;
    }

    // Grid manipulation methods
    addColumn(size = '1fr', index = -1) {
        const columns = this.container.style.gridTemplateColumns.split(' ');
        const sizeStr = typeof size === 'number' ? `${size}px` : size;
        
        if (index >= 0 && index < columns.length) {
            columns.splice(index, 0, sizeStr);
        } else {
            columns.push(sizeStr);
        }
        
        this.container.style.gridTemplateColumns = columns.join(' ');
        return this;
    }

    addRow(size = '1fr', index = -1) {
        const rows = this.container.style.gridTemplateRows.split(' ');
        const sizeStr = typeof size === 'number' ? `${size}px` : size;
        
        if (index >= 0 && index < rows.length) {
            rows.splice(index, 0, sizeStr);
        } else {
            rows.push(sizeStr);
        }
        
        this.container.style.gridTemplateRows = rows.join(' ');
        return this;
    }

    removeColumn(index) {
        const columns = this.container.style.gridTemplateColumns.split(' ');
        if (index >= 0 && index < columns.length) {
            columns.splice(index, 1);
            this.container.style.gridTemplateColumns = columns.join(' ');
        }
        return this;
    }

    removeRow(index) {
        const rows = this.container.style.gridTemplateRows.split(' ');
        if (index >= 0 && index < rows.length) {
            rows.splice(index, 1);
            this.container.style.gridTemplateRows = rows.join(' ');
        }
        return this;
    }

    // Layout update methods
    setColumns(template) {
        this.options.columns = template;
        this.container.style.gridTemplateColumns = this.normalizeGridTemplate(template);
        return this;
    }

    setRows(template) {
        this.options.rows = template;
        this.container.style.gridTemplateRows = this.normalizeGridTemplate(template);
        return this;
    }

    setGap(gap, rowGap = null) {
        if (rowGap !== null) {
            this.container.style.columnGap = `${gap}px`;
            this.container.style.rowGap = `${rowGap}px`;
        } else {
            this.container.style.gap = `${gap}px`;
        }
        return this;
    }

    setAlignment(justifyItems, alignItems, justifyContent, alignContent) {
        if (justifyItems) this.container.style.justifyItems = justifyItems;
        if (alignItems) this.container.style.alignItems = alignItems;
        if (justifyContent) this.container.style.justifyContent = justifyContent;
        if (alignContent) this.container.style.alignContent = alignContent;
        return this;
    }

    setTemplateAreas(areas) {
        this.options.templateAreas = areas;
        this.container.style.gridTemplateAreas = this.normalizeTemplateAreas(areas);
        this.templateAreaMap.clear();
        this.parseTemplateAreas();
        return this;
    }

    // Utility methods
    getGridInfo() {
        return {
            columns: this.container.style.gridTemplateColumns,
            rows: this.container.style.gridTemplateRows,
            areas: this.options.templateAreas,
            itemCount: this.gridItems.length,
            templateAreas: Array.from(this.templateAreaMap.keys())
        };
    }

    clear() {
        this.gridItems.forEach(item => {
            if (this.container.contains(item.component.element)) {
                this.container.removeChild(item.component.element);
            }
        });
        this.gridItems = [];
        this.appliedStyles.clear();
        return this;
    }

    layout() {
        // Re-apply all item styles (useful after container changes)
        this.gridItems.forEach(item => this.applyItemStyles(item));
        return this;
    }

    destroy() {
        this.clear();
        this.templateAreaMap.clear();
        this.appliedStyles.clear();
        
        // Reset container styles
        const gridProperties = [
            'display', 'gridTemplateColumns', 'gridTemplateRows', 'columnGap',
            'rowGap', 'justifyItems', 'alignItems', 'justifyContent', 'alignContent',
            'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows', 'gridTemplateAreas'
        ];
        
        gridProperties.forEach(prop => {
            this.container.style[prop] = '';
        });
    }

    // Static helper methods
    static createResponsiveGrid(container, breakpoints) {
        const layout = new GridLayout(container);
        
        const updateLayout = () => {
            const width = container.clientWidth;
            const breakpoint = Object.keys(breakpoints)
                .sort((a, b) => parseInt(b) - parseInt(a))
                .find(bp => width >= parseInt(bp));
            
            if (breakpoint && breakpoints[breakpoint]) {
                const config = breakpoints[breakpoint];
                if (config.columns) layout.setColumns(config.columns);
                if (config.rows) layout.setRows(config.rows);
                if (config.gap !== undefined) layout.setGap(config.gap);
            }
        };

        window.addEventListener('resize', updateLayout);
        updateLayout();
        
        layout.destroy = () => {
            window.removeEventListener('resize', updateLayout);
            GridLayout.prototype.destroy.call(layout);
        };
        
        return layout;
    }
}
