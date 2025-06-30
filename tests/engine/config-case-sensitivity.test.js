/**
 * @file config-case-sensitivity.test.js
 * @description Tests for configuration case sensitivity fixes.
 * Tests the specific fix for logging level case sensitivity in config files.
 */

import { expect } from 'chai';
import sinon from 'sinon';

describe('Configuration Case Sensitivity Tests', () => {
  beforeEach(() => {
    sinon.restore();

    // Mock DOM environment
    global.document = {
      getElementById: sinon.stub().returns({
        getContext: sinon.stub().returns({
          fillRect: sinon.stub(),
          clearRect: sinon.stub(),
          drawImage: sinon.stub(),
          save: sinon.stub(),
          restore: sinon.stub(),
          translate: sinon.stub(),
          scale: sinon.stub(),
          rotate: sinon.stub(),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          font: '10px sans-serif',
          textAlign: 'left',
          textBaseline: 'top',
          fillText: sinon.stub(),
          strokeText: sinon.stub(),
          beginPath: sinon.stub(),
          closePath: sinon.stub(),
          moveTo: sinon.stub(),
          lineTo: sinon.stub(),
          fill: sinon.stub(),
          stroke: sinon.stub()
        }),
        width: 800,
        height: 600,
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub()
      })
    };

    global.performance = {
      now: sinon.stub().returns(0)
    };
  });

  describe('Logging Level Case Sensitivity (Fixed)', () => {
    it('should handle lowercase log levels correctly', async () => {
      const { HatchEngine } = await import('../../engine/core/HatchEngine.js');
      
      const lowercaseConfig = {
        canvasId: 'testCanvas',
        gameWidth: 800,
        gameHeight: 600,
        initialScene: 'TestScene',
        logging: { level: 'info' },
        renderer: {}
      };

      expect(() => {
        const engine = new HatchEngine(lowercaseConfig);
        expect(engine.hatchConfig.logging.level).to.equal('info');
      }).to.not.throw();
    });

    it('should normalize uppercase log levels to lowercase silently', async () => {
      const { HatchEngine } = await import('../../engine/core/HatchEngine.js');
      
      const uppercaseConfig = {
        canvasId: 'testCanvas',
        gameWidth: 800,
        gameHeight: 600,
        initialScene: 'TestScene',
        logging: { level: 'INFO' },
        renderer: {}
      };

      const engine = new HatchEngine(uppercaseConfig);
      
      // Should normalize the config value to lowercase
      expect(engine.hatchConfig.logging.level).to.equal('info');
      // Normalization should happen silently without warnings for valid levels that just need case adjustment
    });
  });

  describe('Real Configuration Scenarios', () => {
    it('should handle all valid log levels with correct case', async () => {
      const { HatchEngine } = await import('../../engine/core/HatchEngine.js');
      
      const validLevels = ['debug', 'info', 'warn', 'error'];
      
      for (const level of validLevels) {
        const config = {
          canvasId: 'testCanvas',
          gameWidth: 800,
          gameHeight: 600,
          initialScene: 'TestScene',
          logging: { level: level },
          renderer: {}
        };

        expect(() => {
          const engine = new HatchEngine(config);
          expect(engine.hatchConfig.logging.level).to.equal(level);
        }).to.not.throw();
      }
    });
  });
});
