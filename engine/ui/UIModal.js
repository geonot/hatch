import { UIContainer } from './UIContainer.js';
import { UIButton } from './UIButton.js';
import { UILabel } from './UILabel.js';

/**
 * UIModal - Modal dialog component with overlay, animations, and flexible content
 * Eliminates boilerplate for dialog creation, backdrop handling, and modal interactions
 */
export class UIModal extends UIContainer {
    constructor(config = {}) {
        // Default modal styling
        const modalDefaults = {
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: { top: 24, right: 24, bottom: 24, left: 24 },
            shadow: { offsetX: 0, offsetY: 8, blur: 32, color: 'rgba(0, 0, 0, 0.3)' },
            z: 1000, // High z-index to appear above other content
            width: 400,
            height: 300,
            ...config
        };

        super(modalDefaults);
        
        // Modal-specific properties
        this.isOpen = false;
        this.modal = true; // Mark as modal for special handling
        
        // Backdrop properties
        this.showBackdrop = config.showBackdrop !== false;
        this.backdropColor = config.backdropColor || 'rgba(0, 0, 0, 0.5)';
        this.closeOnBackdropClick = config.closeOnBackdropClick !== false;
        this.closeOnEscape = config.closeOnEscape !== false;
        
        // Animation properties
        this.animated = config.animated !== false;
        this.animationType = config.animationType || 'fade-scale'; // 'fade', 'slide', 'fade-scale'
        this.animationDuration = config.animationDuration || 300;
        
        // Position and sizing
        this.centered = config.centered !== false;
        this.draggable = config.draggable || false;
        this.resizable = config.resizable || false;
        
        // Content areas
        this.title = config.title || '';
        this.showCloseButton = config.showCloseButton !== false;
        this.buttons = config.buttons || []; // Array of button configs
        
        // Auto-focus
        this.autoFocus = config.autoFocus !== false;
        this.restoreFocus = config.restoreFocus !== false;
        this._previousActiveElement = null;
        
        // Events
        this.onOpen = config.onOpen || (() => {});
        this.onClose = config.onClose || (() => {});
        this.onBackdropClick = config.onBackdropClick || (() => {});
        
        // Animation state
        this._animationStartTime = null;
        this._animationProgress = 0;
        this._targetProgress = 0;
        this._originalOpacity = this.opacity;
        this._originalScale = { x: 1, y: 1 };
        
        // Initialize modal components
        this._setupModal();
        
        // Position modal in center of screen by default
        if (this.centered) {
            this._centerModal();
        }
    }

    /**
     * Setup modal structure with header, content, and footer
     */
    _setupModal() {
        // Clear any existing children
        this.removeAllChildren();
        
        // Create header if title is provided
        if (this.title) {
            this._createHeader();
        }
        
        // Create content area
        this._createContent();
        
        // Create footer if buttons are provided
        if (this.buttons.length > 0) {
            this._createFooter();
        }
        
        this.updateLayout();
    }

    /**
     * Create modal header with title and close button
     */
    _createHeader() {
        const header = new UIContainer({
            layout: 'horizontal',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: this.width - this.padding.left - this.padding.right,
            height: 40,
            x: 0,
            y: 0
        });

        // Title label
        if (this.title) {
            const titleLabel = new UILabel({
                text: this.title,
                font: '18px Arial',
                fontWeight: 'bold',
                color: '#333333',
                textAlign: 'left'
            });
            header.addChild(titleLabel);
        }

        // Close button
        if (this.showCloseButton) {
            const closeButton = UIButton.create('minimal', {
                text: '×',
                width: 32,
                height: 32,
                fontSize: 18,
                color: '#666666',
                onClick: () => this.close()
            });
            header.addChild(closeButton);
        }

        this.addChild(header);
        this._header = header;
    }

    /**
     * Create content area for modal body
     */
    _createContent() {
        const contentHeight = this.height - this.padding.top - this.padding.bottom;
        let offsetY = 0;
        
        if (this._header) {
            contentHeight -= this._header.height + 16; // 16px gap
            offsetY = this._header.height + 16;
        }
        
        if (this.buttons.length > 0) {
            contentHeight -= 60; // Space for footer
        }

        this._content = new UIContainer({
            layout: 'none',
            width: this.width - this.padding.left - this.padding.right,
            height: Math.max(0, contentHeight),
            x: 0,
            y: offsetY,
            scrollable: true,
            overflow: 'auto'
        });

        this.addChild(this._content);
    }

    /**
     * Create footer with action buttons
     */
    _createFooter() {
        const footerY = this.height - this.padding.bottom - 50;
        
        const footer = new UIContainer({
            layout: 'horizontal',
            justifyContent: 'end',
            alignItems: 'center',
            gap: 12,
            width: this.width - this.padding.left - this.padding.right,
            height: 50,
            x: 0,
            y: footerY
        });

        // Create buttons
        this.buttons.forEach(buttonConfig => {
            const button = UIButton.create(buttonConfig.preset || 'primary', {
                text: buttonConfig.text || 'Button',
                onClick: (btn) => {
                    if (buttonConfig.onClick) {
                        buttonConfig.onClick(btn, this);
                    }
                    if (buttonConfig.closeModal !== false) {
                        this.close();
                    }
                },
                ...buttonConfig
            });
            footer.addChild(button);
        });

        this.addChild(footer);
        this._footer = footer;
    }

    /**
     * Add content to the modal body
     */
    addContent(component) {
        if (this._content) {
            this._content.addChild(component);
        }
        return this;
    }

    /**
     * Remove content from the modal body
     */
    removeContent(component) {
        if (this._content) {
            this._content.removeChild(component);
        }
        return this;
    }

    /**
     * Clear all content from the modal body
     */
    clearContent() {
        if (this._content) {
            this._content.removeAllChildren();
        }
        return this;
    }

    /**
     * Center the modal on screen
     */
    _centerModal() {
        // This would typically use the canvas/screen dimensions
        // For now, we'll use a default screen size assumption
        const screenWidth = 1024; // Should be passed from engine/context
        const screenHeight = 768;
        
        this.x = (screenWidth - this.width) / 2;
        this.y = (screenHeight - this.height) / 2;
    }

    /**
     * Open the modal
     */
    open() {
        if (this.isOpen) return this;
        
        this.isOpen = true;
        this.visible = true;
        
        // Store previous focus
        if (this.restoreFocus && document.activeElement) {
            this._previousActiveElement = document.activeElement;
        }
        
        // Start opening animation
        if (this.animated) {
            this._startAnimation(1);
        } else {
            this._animationProgress = 1;
            this._applyAnimationState();
        }
        
        // Add event listeners
        this._addEventListeners();
        
        // Auto-focus first focusable element
        if (this.autoFocus) {
            this._focusFirstElement();
        }
        
        this.onOpen(this);
        return this;
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.isOpen) return this;
        
        this.isOpen = false;
        
        // Start closing animation
        if (this.animated) {
            this._startAnimation(0);
        } else {
            this._animationProgress = 0;
            this._applyAnimationState();
            this.visible = false;
        }
        
        // Remove event listeners
        this._removeEventListeners();
        
        // Restore previous focus
        if (this.restoreFocus && this._previousActiveElement) {
            this._previousActiveElement.focus();
            this._previousActiveElement = null;
        }
        
        this.onClose(this);
        return this;
    }

    /**
     * Toggle modal open/closed state
     */
    toggle() {
        return this.isOpen ? this.close() : this.open();
    }

    /**
     * Start animation to target progress (0 = closed, 1 = open)
     */
    _startAnimation(targetProgress) {
        this._targetProgress = targetProgress;
        this._animationStartTime = Date.now();
        this._animationStartProgress = this._animationProgress;
    }

    /**
     * Update animation state
     */
    update(deltaTime) {
        super.update?.(deltaTime);
        
        // Update animation
        if (this._animationStartTime && this._animationProgress !== this._targetProgress) {
            const elapsed = Date.now() - this._animationStartTime;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            // Apply easing
            const easedProgress = this._applyEasing(progress);
            
            this._animationProgress = this._animationStartProgress + 
                (this._targetProgress - this._animationStartProgress) * easedProgress;
            
            this._applyAnimationState();
            
            if (progress >= 1) {
                this._animationProgress = this._targetProgress;
                this._animationStartTime = null;
                
                // Hide modal if animation finished closing
                if (this._targetProgress === 0) {
                    this.visible = false;
                }
            }
            
            this._invalidate();
        }
    }

    /**
     * Apply easing function to animation progress
     */
    _applyEasing(t) {
        // Ease-out cubic for smooth deceleration
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Apply current animation state to visual properties
     */
    _applyAnimationState() {
        const progress = this._animationProgress;
        
        switch (this.animationType) {
            case 'fade':
                this.opacity = this._originalOpacity * progress;
                break;
                
            case 'slide':
                this.opacity = this._originalOpacity * progress;
                // Slide from top
                this.y = this._originalY - (1 - progress) * 100;
                break;
                
            case 'fade-scale':
            default:
                this.opacity = this._originalOpacity * progress;
                const scale = 0.7 + 0.3 * progress; // Scale from 70% to 100%
                this.scaleX = scale;
                this.scaleY = scale;
                break;
        }
    }

    /**
     * Add event listeners for modal behavior
     */
    _addEventListeners() {
        // ESC key to close
        if (this.closeOnEscape) {
            this._keyHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                }
            };
            document.addEventListener('keydown', this._keyHandler);
        }
    }

    /**
     * Remove event listeners
     */
    _removeEventListeners() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    }

    /**
     * Focus first focusable element in modal
     */
    _focusFirstElement() {
        // This is a simplified implementation
        // In a real scenario, would search for focusable children
        if (this._content && this._content.children.length > 0) {
            const firstChild = this._content.children[0];
            if (firstChild.focus) {
                firstChild.focus();
            }
        }
    }

    /**
     * Handle backdrop click
     */
    handleBackdropClick(x, y) {
        if (this.closeOnBackdropClick && !this.isPointInside(x, y)) {
            this.onBackdropClick(this);
            this.close();
            return true;
        }
        return false;
    }

    /**
     * Override render to include backdrop
     */
    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        // Draw backdrop
        if (this.showBackdrop) {
            const backdropAlpha = this._animationProgress;
            ctx.fillStyle = this.backdropColor;
            ctx.globalAlpha = backdropAlpha;
            
            // Fill entire screen (this should use actual screen dimensions)
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        
        // Apply scaling for animation
        if (this.scaleX !== 1 || this.scaleY !== 1) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(this.scaleX || 1, this.scaleY || 1);
            ctx.translate(-centerX, -centerY);
        }
        
        // Render modal content
        super.render(ctx);
        
        ctx.restore();
    }

    /**
     * Preset modal styles
     */
    static presets = {
        default: {
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            shadow: { offsetX: 0, offsetY: 8, blur: 32, color: 'rgba(0, 0, 0, 0.3)' }
        },
        alert: {
            width: 350,
            height: 200,
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            buttons: [
                { text: 'OK', preset: 'primary' }
            ]
        },
        confirm: {
            width: 400,
            height: 180,
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            buttons: [
                { text: 'Cancel', preset: 'secondary', closeModal: true },
                { text: 'Confirm', preset: 'primary' }
            ]
        },
        dialog: {
            width: 500,
            height: 400,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            shadow: { offsetX: 0, offsetY: 12, blur: 48, color: 'rgba(0, 0, 0, 0.3)' },
            buttons: [
                { text: 'Cancel', preset: 'secondary' },
                { text: 'Apply', preset: 'primary' }
            ]
        },
        fullscreen: {
            width: '90%', // Would need special handling for percentages
            height: '90%',
            backgroundColor: '#FFFFFF',
            borderRadius: 0,
            centered: true
        },
        sidebar: {
            width: 300,
            height: '100%',
            x: 0,
            y: 0,
            animationType: 'slide',
            backgroundColor: '#F8F9FA',
            borderRadius: 0,
            showBackdrop: true,
            centered: false
        },
        toast: {
            width: 350,
            height: 80,
            backgroundColor: '#333333',
            color: '#FFFFFF',
            borderRadius: 8,
            showCloseButton: false,
            showBackdrop: false,
            animationType: 'slide'
        }
    };

    /**
     * Create modal with preset style
     */
    static create(preset = 'default', additionalConfig = {}) {
        const presetConfig = UIModal.presets[preset] || UIModal.presets.default;
        const config = { ...presetConfig, ...additionalConfig };
        return new UIModal(config);
    }

    /**
     * Show alert modal (convenience method)
     */
    static alert(title, message, options = {}) {
        const modal = UIModal.create('alert', {
            title,
            ...options
        });
        
        if (message) {
            const messageLabel = new UILabel({
                text: message,
                textAlign: 'center',
                width: modal._content.width,
                height: 50,
                x: 0,
                y: 20
            });
            modal.addContent(messageLabel);
        }
        
        modal.open();
        return modal;
    }

    /**
     * Show confirm modal (convenience method)
     */
    static confirm(title, message, onConfirm, options = {}) {
        const modal = UIModal.create('confirm', {
            title,
            buttons: [
                { 
                    text: 'Cancel', 
                    preset: 'secondary',
                    onClick: () => modal.close()
                },
                { 
                    text: 'Confirm', 
                    preset: 'primary',
                    onClick: () => {
                        if (onConfirm) onConfirm();
                        modal.close();
                    }
                }
            ],
            ...options
        });
        
        if (message) {
            const messageLabel = new UILabel({
                text: message,
                textAlign: 'center',
                width: modal._content.width,
                height: 40,
                x: 0,
                y: 10
            });
            modal.addContent(messageLabel);
        }
        
        modal.open();
        return modal;
    }
}
