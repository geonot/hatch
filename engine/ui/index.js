/**
 * UI Components Library - Comprehensive set of UI components for the Hatch engine
 * Eliminates boilerplate code for common interface patterns and provides consistent styling
 */

// Core UI Components
export { UIComponent } from './UIComponent.js';
export { UILabel } from './UILabel.js';
export { UITitle } from './UITitle.js';
export { UIButton } from './UIButton.js';
export { UIContainer } from './UIContainer.js';
export { UIProgressBar } from './UIProgressBar.js';
export { UIModal } from './UIModal.js';

// UI Manager
export { UIManager } from './UIManager.js';

/**
 * Quick creation utilities for common UI patterns
 */
export const UI = {
    // Text components
    label: (config) => new UILabel(config),
    title: (config) => new UITitle(config),
    
    // Interactive components
    button: (config) => new UIButton(config),
    progressBar: (config) => new UIProgressBar(config),
    modal: (config) => new UIModal(config),
    
    // Layout components
    container: (config) => new UIContainer(config),
    
    // Preset creators
    createButton: (preset, config) => UIButton.create(preset, config),
    createContainer: (preset, config) => UIContainer.create(preset, config),
    createProgressBar: (preset, config) => UIProgressBar.create(preset, config),
    createModal: (preset, config) => UIModal.create(preset, config),
    
    // Convenience methods
    alert: (title, message, options) => UIModal.alert(title, message, options),
    confirm: (title, message, onConfirm, options) => UIModal.confirm(title, message, onConfirm, options)
};

// Re-export everything for convenience
export default {
    UIComponent,
    UILabel,
    UITitle, 
    UIButton,
    UIContainer,
    UIProgressBar,
    UIModal,
    UIManager,
    UI
};
