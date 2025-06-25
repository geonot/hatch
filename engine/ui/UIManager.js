/**
 * @file UIManager.js
 * @description Manages UI overlays, modals, and instructions for the Hatch engine
 */

export default class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.isInstructionsVisible = false;
        this.instructions = [];
        this.instructionsKey = 'KeyH'; // Default 'H' key for help
        
        // Parse instructions from engine config
        this.loadInstructionsFromConfig();
        
        // Set up event listeners for instructions toggle
        this.setupEventListeners();
    }

    loadInstructionsFromConfig() {
        const config = this.engine.hatchConfig;
        if (config.instructions && Array.isArray(config.instructions)) {
            this.instructions = config.instructions;
        }
        
        // Allow custom key for showing instructions
        if (config.instructionsKey) {
            this.instructionsKey = config.instructionsKey;
        }
    }

    setupEventListeners() {
        // Direct input checking will be done in update() method instead of event listeners
        // since the current input system doesn't emit key press events to the event bus
    }

    handleKeyPress(event) {
        const { key } = event;
        
        // Toggle instructions visibility
        if (key === this.instructionsKey) {
            this.toggleInstructions();
        }
        
        // Close instructions with Escape
        if (key === 'Escape' && this.isInstructionsVisible) {
            this.hideInstructions();
        }
    }

    toggleInstructions() {
        this.isInstructionsVisible = !this.isInstructionsVisible;
    }

    showInstructions() {
        this.isInstructionsVisible = true;
    }

    hideInstructions() {
        this.isInstructionsVisible = false;
    }

    update(deltaTime) {
        // Check for instructions toggle input
        if (this.engine.inputManager) {
            // Toggle instructions with the configured key
            if (this.engine.inputManager.isKeyJustPressed(this.instructionsKey)) {
                this.toggleInstructions();
            }
            
            // Close instructions with Escape
            if (this.isInstructionsVisible && this.engine.inputManager.isKeyJustPressed('Escape')) {
                this.hideInstructions();
            }
        }
    }

    render(ctx) {
        if (this.isInstructionsVisible && this.instructions.length > 0) {
            this.renderInstructionsModal(ctx);
        }
    }

    renderInstructionsModal(ctx) {
        // Save context state
        ctx.save();
        
        // Modal overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        
        // Modal background
        const modalWidth = Math.min(500, this.engine.width - 100);
        const modalHeight = Math.min(400, this.engine.height - 100);
        const modalX = (this.engine.width - modalWidth) / 2;
        const modalY = (this.engine.height - modalHeight) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Modal border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
        
        // Title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Instructions', modalX + modalWidth / 2, modalY + 20);
        
        // Instructions content
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const lineHeight = 25;
        const startY = modalY + 70;
        const contentX = modalX + 30;
        
        this.instructions.forEach((instruction, index) => {
            const y = startY + index * lineHeight;
            if (y + lineHeight < modalY + modalHeight - 60) { // Leave space for close instruction
                ctx.fillText(instruction, contentX, y);
            }
        });
        
        // Close instruction
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Press H to close or ESC`, modalX + modalWidth / 2, modalY + modalHeight - 30);
        
        // Restore context state
        ctx.restore();
    }

    destroy() {
        // Clean up if needed
    }
}
