import { ErrorHandler } from './ErrorHandler.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('ErrorHandler', () => {
  let errorHandler;
  let mockEventBus;
  let consoleSpies;

  beforeEach(() => {
    mockEventBus = {
      emit: sinon.spy(),
    };
    errorHandler = new ErrorHandler(mockEventBus);

    // Spy on all console methods that ErrorHandler might use
    consoleSpies = {
      log: sinon.spy(console, 'log'),
      info: sinon.spy(console, 'info'),
      warn: sinon.spy(console, 'warn'),
      error: sinon.spy(console, 'error'),
      debug: sinon.spy(console, 'debug'),
    };
  });

  afterEach(() => {
    sinon.restore(); // Restores all sinon spies and stubs, including console spies
  });

  describe('constructor', () => {
    it('should initialize with an optional eventBus', () => {
      expect(errorHandler.eventBus).to.equal(mockEventBus);
      const handlerWithoutBus = new ErrorHandler();
      expect(handlerWithoutBus.eventBus).to.be.null;
    });

    it('should initialize with isDebugMode set to false', () => {
      expect(errorHandler.isDebugMode).to.be.false;
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      errorHandler.setDebugMode(true);
      expect(errorHandler.isDebugMode).to.be.true;
      expect(consoleSpies.info.calledWith(sinon.match(/Debug mode has been enabled/))).to.be.true;
    });

    it('should disable debug mode', () => {
      errorHandler.setDebugMode(true); // First enable
      errorHandler.setDebugMode(false); // Then disable
      expect(errorHandler.isDebugMode).to.be.false;
      expect(consoleSpies.info.calledWith(sinon.match(/Debug mode has been disabled/))).to.be.true;
    });
  });

  describe('Logging Methods', () => {
    const testCases = [
      { level: 'info', consoleMethod: 'info', formattedPrefix: '[HATCH|INFO]' },
      { level: 'warn', consoleMethod: 'warn', formattedPrefix: '[HATCH|WARN]' },
      { level: 'error', consoleMethod: 'error', formattedPrefix: '[HATCH|ERROR]' },
      { level: 'critical', consoleMethod: 'error', formattedPrefix: '[HATCH|CRITICAL]' }, // uses console.error
    ];

    testCases.forEach(({ level, consoleMethod, formattedPrefix }) => {
      describe(`${level}()`, () => {
        it(`should log a message to console.${consoleMethod} with prefix and emit event`, () => {
          const message = `This is a ${level} message.`;
          const errorObj = { detail: `${level} detail` };

          if (level === 'critical') {
            expect(() => errorHandler.critical(message, errorObj)).to.throw(Error, message);
          } else {
            errorHandler[level](message, errorObj);
          }

          expect(consoleSpies[consoleMethod].calledOnce).to.be.true;
          expect(consoleSpies[consoleMethod].getCall(0).args[0]).to.equal(`${formattedPrefix} ${message}`);
          expect(consoleSpies[consoleMethod].getCall(0).args[1]).to.equal(errorObj);

          expect(mockEventBus.emit.calledOnceWith('error:logged', { level, message, errorObject: errorObj })).to.be.true;
        });

        it(`should log a message without an error object to console.${consoleMethod} and emit event`, () => {
          const message = `Another ${level} message.`;
           if (level === 'critical') {
            expect(() => errorHandler.critical(message)).to.throw(Error, message);
          } else {
            errorHandler[level](message);
          }

          expect(consoleSpies[consoleMethod].calledOnce).to.be.true;
          expect(consoleSpies[consoleMethod].getCall(0).args[0]).to.equal(`${formattedPrefix} ${message}`);
          expect(consoleSpies[consoleMethod].getCall(0).args[1]).to.be.undefined;


          expect(mockEventBus.emit.calledOnceWith('error:logged', { level, message, errorObject: null })).to.be.true;
        });
      });
    });

    describe('debug()', () => {
      it('should log a debug message if isDebugMode is true', () => {
        errorHandler.setDebugMode(true); // Enable debug mode (also calls console.info)
        consoleSpies.info.resetHistory(); // Reset spy for the setDebugMode call
        mockEventBus.emit.resetHistory();

        const message = 'This is a debug message.';
        const errorObj = { detail: 'debug detail' };
        errorHandler.debug(message, errorObj);

        // ErrorHandler uses console.debug if available, otherwise console.log
        const targetConsoleMethod = typeof console.debug === 'function' ? 'debug' : 'log';
        expect(consoleSpies[targetConsoleMethod].calledOnce).to.be.true;
        expect(consoleSpies[targetConsoleMethod].getCall(0).args[0]).to.equal('[HATCH|DEBUG] This is a debug message.');
        expect(consoleSpies[targetConsoleMethod].getCall(0).args[1]).to.equal(errorObj);
        expect(mockEventBus.emit.calledOnceWith('error:logged', { level: 'debug', message, errorObject: errorObj })).to.be.true;
      });

      it('should not log a debug message if isDebugMode is false', () => {
        errorHandler.setDebugMode(false); // Ensure debug mode is false (also calls console.info)
        consoleSpies.info.resetHistory();
        mockEventBus.emit.resetHistory();

        errorHandler.debug('This should not be logged.');
        const targetConsoleMethod = typeof console.debug === 'function' ? 'debug' : 'log';
        expect(consoleSpies[targetConsoleMethod].called).to.be.false;
        expect(mockEventBus.emit.called).to.be.false; // No event should be emitted either
      });
    });
  });

  describe('EventBus Failure', () => {
    it('should use console.error as a fallback if eventBus.emit fails', () => {
      const faultyEventBus = {
        emit: sinon.stub().throws(new Error('EventBus emit failed!')),
      };
      const handlerWithFaultyBus = new ErrorHandler(faultyEventBus);
      // console.error will be spied by consoleSpies.error

      handlerWithFaultyBus.error('Test message for faulty bus.');

      // First call to console.error is for the actual error log
      expect(consoleSpies.error.getCall(0).args[0]).to.equal('[HATCH|ERROR] Test message for faulty bus.');
      // Second call to console.error is the fallback for eventBus.emit failure
      expect(consoleSpies.error.getCall(1).args[0]).to.equal('[ErrorHandler] Critical: Failed to emit error:logged event:');
      expect(consoleSpies.error.getCall(1).args[1].message).to.equal('EventBus emit failed!');
    });
  });

  describe('_getConsoleLevel fallback', () => {
    it('should fallback to console.log if console.debug is not a function', () => {
        const originalDebug = console.debug;
        console.debug = undefined; // Temporarily remove console.debug

        errorHandler.setDebugMode(true);
        consoleSpies.info.resetHistory(); // from setDebugMode
        mockEventBus.emit.resetHistory();

        errorHandler.debug('A debug message.');

        expect(consoleSpies.log.calledOnce).to.be.true; // Should use console.log
        expect(consoleSpies.log.getCall(0).args[0]).to.equal('[HATCH|DEBUG] A debug message.');

        console.debug = originalDebug; // Restore console.debug
    });

     it('should fallback to console.log if an unknown level is passed to _getConsoleLevel', () => {
        // This tests an internal function indirectly.
        // We call log with a custom, unknown level.
        errorHandler.log('unknownLevel', 'Unknown level test');
        expect(consoleSpies.log.calledOnce).to.be.true;
        expect(consoleSpies.log.getCall(0).args[0]).to.equal('[HATCH|UNKNOWNLEVEL] Unknown level test');
    });
  });
});
