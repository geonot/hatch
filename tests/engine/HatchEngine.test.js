import { HatchEngine } from '../../engine/core/HatchEngine.js';
import { expect } from 'chai';
import sinon from 'sinon';
import { ErrorLevels } from '../../engine/core/Constants.js';

describe('HatchEngine', () => {
  let projectConfig;

  beforeEach(() => {
    sinon.restore();

    projectConfig = {
      canvasId: 'testCanvas',
      gameWidth: 800,
      gameHeight: 600,
      initialScene: 'TestScene',
      logging: { level: ErrorLevels.INFO },
      renderer: {},
    };

    // Mock global browser environment
    global.document = {
      getElementById: sinon.stub().returns({
        getContext: sinon.stub().returns({}),
        width: 0,
        height: 0,
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
      }),
    };

    global.performance = {
      now: sinon.stub().returns(0),
    };

    global.requestAnimationFrame = sinon.stub();
    global.cancelAnimationFrame = sinon.stub();
  });

  afterEach(() => {
    delete global.document;
    delete global.performance;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  describe('constructor', () => {
    it('should create an instance of HatchEngine with given configuration', () => {
      const engine = new HatchEngine(projectConfig);
      expect(engine).to.be.instanceOf(HatchEngine);
      expect(engine.hatchConfig).to.equal(projectConfig);
      expect(engine.canvasId).to.equal('testCanvas');
      expect(engine.width).to.equal(800);
      expect(engine.height).to.equal(600);
    });

    it('should throw an error if projectConfig is not provided', () => {
      expect(() => new HatchEngine()).to.throw('HatchEngine constructor: projectConfig must be a valid object.');
    });

    it('should throw an error if essential config properties are missing', () => {
      const invalidConfig = { canvasId: 'test' }; // missing gameWidth and gameHeight
      expect(() => new HatchEngine(invalidConfig)).to.throw('HatchEngine constructor: projectConfig is missing essential properties');
    });
  });
});
