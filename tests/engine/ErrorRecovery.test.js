/**
 * @file ErrorRecovery.test.js
 * @description Tests for the error recovery system in ErrorHandler
 */

import { expect } from 'chai';
import { ErrorHandler } from '../../engine/core/ErrorHandler.js';
import { ErrorLevels } from '../../engine/core/Constants.js';

describe('ErrorHandler Error Recovery System', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('Recovery Strategy Registration', () => {
    it('should register custom recovery strategies', () => {
      const customRecovery = (error) => {
        console.log('Custom recovery executed');
        return true;
      };

      errorHandler.registerRecoveryStrategy('CUSTOM_ERROR', customRecovery);
      expect(errorHandler.recoveryStrategies.has('CUSTOM_ERROR')).to.be.true;
    });

    it('should have default recovery strategies registered', () => {
      expect(errorHandler.recoveryStrategies.has('NETWORK_ERROR')).to.be.true;
      expect(errorHandler.recoveryStrategies.has('TIMEOUT_ERROR')).to.be.true;
    });
  });

  describe('Error Recovery Attempts', () => {
    it('should attempt recovery using registered strategy', () => {
      let recoveryAttempted = false;
      const testRecovery = (error) => {
        recoveryAttempted = true;
        return true;
      };

      errorHandler.registerRecoveryStrategy('TEST_ERROR', testRecovery);
      
      const testError = new Error('Test error');
      const result = errorHandler.attemptRecovery(testError, 'TEST_ERROR');
      
      expect(result).to.be.true;
      expect(recoveryAttempted).to.be.true;
    });

    it('should add errors to history during recovery attempts', () => {
      const testError = new Error('Test error');
      errorHandler.attemptRecovery(testError, 'TEST_ERROR');
      
      const history = errorHandler.getErrorHistory();
      expect(history.length).to.equal(1);
      expect(history[0].type).to.equal('TEST_ERROR');
      expect(history[0].message).to.equal('Test error');
    });
  });

  describe('Graceful Degradation', () => {
    it('should enable rendering fallback for render errors', () => {
      const testError = new Error('Render failed');
      const result = errorHandler.attemptRecovery(testError, 'RENDER_ERROR');
      
      expect(result).to.be.true;
      expect(errorHandler.gracefulDegradation.renderingFallback).to.be.true;
    });

    it('should disable audio for audio errors', () => {
      const testError = new Error('Audio failed');
      const result = errorHandler.attemptRecovery(testError, 'AUDIO_ERROR');
      
      expect(result).to.be.true;
      expect(errorHandler.gracefulDegradation.audioDisabled).to.be.true;
    });

    it('should enable input fallback for input errors', () => {
      const testError = new Error('Input failed');
      const result = errorHandler.attemptRecovery(testError, 'INPUT_ERROR');
      
      expect(result).to.be.true;
      expect(errorHandler.gracefulDegradation.inputFallback).to.be.true;
    });

    it('should not apply degradation twice for same error type', () => {
      const testError1 = new Error('First render error');
      const testError2 = new Error('Second render error');
      
      const result1 = errorHandler.attemptRecovery(testError1, 'RENDER_ERROR');
      const result2 = errorHandler.attemptRecovery(testError2, 'RENDER_ERROR');
      
      expect(result1).to.be.true;  // First degradation applied
      expect(result2).to.be.false; // No additional degradation
    });
  });

  describe('Error Pattern Analysis', () => {
    it('should detect recurring error patterns', () => {
      // Create multiple errors of the same type
      for (let i = 0; i < 4; i++) {
        const testError = new Error(`Test error ${i}`);
        errorHandler.attemptRecovery(testError, 'RECURRING_ERROR');
      }
      
      // Check that warning was logged (we can't easily test console output, 
      // but we can verify the error history is properly maintained)
      const history = errorHandler.getErrorHistory();
      const recurringErrors = history.filter(e => e.type === 'RECURRING_ERROR');
      expect(recurringErrors.length).to.equal(4);
    });
  });

  describe('Degradation State Management', () => {
    it('should return current degradation state', () => {
      const initialState = errorHandler.getDegradationState();
      expect(initialState.renderingFallback).to.be.false;
      expect(initialState.audioDisabled).to.be.false;
      expect(initialState.inputFallback).to.be.false;
    });

    it('should reset specific degradation types', () => {
      // Enable some degradations
      errorHandler.attemptRecovery(new Error('Test'), 'RENDER_ERROR');
      errorHandler.attemptRecovery(new Error('Test'), 'AUDIO_ERROR');
      
      expect(errorHandler.gracefulDegradation.renderingFallback).to.be.true;
      expect(errorHandler.gracefulDegradation.audioDisabled).to.be.true;
      
      // Reset only rendering
      errorHandler.resetDegradation('rendering');
      
      expect(errorHandler.gracefulDegradation.renderingFallback).to.be.false;
      expect(errorHandler.gracefulDegradation.audioDisabled).to.be.true; // Should remain
    });

    it('should reset all degradation states', () => {
      // Enable all degradations
      errorHandler.attemptRecovery(new Error('Test'), 'RENDER_ERROR');
      errorHandler.attemptRecovery(new Error('Test'), 'AUDIO_ERROR');
      errorHandler.attemptRecovery(new Error('Test'), 'INPUT_ERROR');
      
      // Reset all
      errorHandler.resetDegradation();
      
      const state = errorHandler.getDegradationState();
      expect(state.renderingFallback).to.be.false;
      expect(state.audioDisabled).to.be.false;
      expect(state.inputFallback).to.be.false;
    });
  });

  describe('Error History Management', () => {
    it('should maintain error history up to maximum limit', () => {
      // Add more errors than the maximum
      for (let i = 0; i < 150; i++) {
        const testError = new Error(`Test error ${i}`);
        errorHandler.attemptRecovery(testError, 'TEST_ERROR');
      }
      
      const history = errorHandler.getErrorHistory();
      expect(history.length).to.equal(100); // Should be limited to maxErrorHistory
    });

    it('should return limited error history when requested', () => {
      // Add several errors
      for (let i = 0; i < 10; i++) {
        const testError = new Error(`Test error ${i}`);
        errorHandler.attemptRecovery(testError, 'TEST_ERROR');
      }
      
      const limitedHistory = errorHandler.getErrorHistory(5);
      expect(limitedHistory.length).to.equal(5);
    });
  });
});
