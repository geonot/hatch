import { ErrorHandler } from '../../engine/core/ErrorHandler.js';
import { ErrorLevels, ErrorEvents, LogLevelPriority } from '../../engine/core/Constants.js'; // Import necessary constants
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

    it('should initialize with default log level INFO if not specified', () => {
      const handler = new ErrorHandler(mockEventBus);
      expect(handler.currentLogLevel).to.equal(ErrorLevels.INFO);
    });

    it('should initialize with a specified log level', () => {
      const handler = new ErrorHandler(mockEventBus, ErrorLevels.WARN);
      expect(handler.currentLogLevel).to.equal(ErrorLevels.WARN);
    });

    it('should default to INFO if an invalid initialLogLevel is provided', () => {
      // Use the global consoleSpies.warn and reset its history for this specific test
      consoleSpies.warn.resetHistory();
      const handler = new ErrorHandler(mockEventBus, 'INVALID_LEVEL');
      expect(handler.currentLogLevel).to.equal(ErrorLevels.INFO);
      expect(consoleSpies.warn.calledWith(sinon.match(/Invalid initialLogLevel: INVALID_LEVEL/))).to.be.true;
      // No need to restore consoleSpies.warn here, it's handled in afterEach
    });
  });

  describe('setLogLevel', () => {
    it('should change the currentLogLevel and log the change', () => {
      errorHandler.setLogLevel(ErrorLevels.DEBUG);
      expect(errorHandler.currentLogLevel).to.equal(ErrorLevels.DEBUG);
      // console.log is called by setLogLevel to confirm the change
      expect(consoleSpies.log.calledWith(sinon.match(/Log level set to: DEBUG/))).to.be.true;
    });

    it('should warn if an invalid log level is provided and not change the level', () => {
      const initialLevel = errorHandler.currentLogLevel;
      errorHandler.setLogLevel('INVALID_LEVEL');
      expect(errorHandler.currentLogLevel).to.equal(initialLevel); // Remains unchanged
      expect(consoleSpies.warn.calledWith(sinon.match(/Invalid log level 'INVALID_LEVEL'/))).to.be.true;
    });
  });

  describe('Logging Methods', () => {
    // Ensure ErrorHandler is initialized with INFO level for these generic tests
    // Specific log level tests (like for debug) will set their own levels.
    beforeEach(() => {
        errorHandler = new ErrorHandler(mockEventBus, ErrorLevels.INFO);
    });
    const testCases = [
      { level: ErrorLevels.INFO, consoleMethod: 'info', formattedPrefix: '[HATCH|INFO]' },
      { level: ErrorLevels.WARN, consoleMethod: 'warn', formattedPrefix: '[HATCH|WARN]' },
      { level: ErrorLevels.ERROR, consoleMethod: 'error', formattedPrefix: '[HATCH|ERROR]' },
      { level: ErrorLevels.CRITICAL, consoleMethod: 'error', formattedPrefix: '[HATCH|CRITICAL]' }, // uses console.error
    ];

    testCases.forEach(({ level, consoleMethod, formattedPrefix }) => {
      describe(`${level}()`, () => {
        it(`should log a message to console.${consoleMethod} with prefix and emit event if log level is sufficient`, () => {
          const message = `This is a ${level} message.`;
          const errorObj = { detail: `${level} detail` };
          // Ensure current log level is permissive enough for the message to be logged
          errorHandler.setLogLevel(LogLevelPriority[level] > LogLevelPriority[ErrorLevels.DEBUG] ? ErrorLevels.DEBUG : level);


          if (level === ErrorLevels.CRITICAL) {
            expect(() => errorHandler.critical(message, errorObj)).to.throw(Error, message);
          } else {
            errorHandler[level](message, errorObj);
          }

          expect(consoleSpies[consoleMethod].calledOnce).to.be.true;
          expect(consoleSpies[consoleMethod].getCall(0).args[0]).to.equal(`${formattedPrefix} ${message}`);
          expect(consoleSpies[consoleMethod].getCall(0).args[1]).to.equal(errorObj);

          expect(mockEventBus.emit.calledOnceWith(ErrorEvents.LOGGED, { level, message, errorObject: errorObj })).to.be.true;
        });

        it(`should log a message without an error object to console.${consoleMethod} and emit event if log level is sufficient`, () => {
          const message = `Another ${level} message.`;
          errorHandler.setLogLevel(LogLevelPriority[level] > LogLevelPriority[ErrorLevels.DEBUG] ? ErrorLevels.DEBUG : level);

           if (level === ErrorLevels.CRITICAL) {
            expect(() => errorHandler.critical(message)).to.throw(Error, message);
          } else {
            errorHandler[level](message);
          }

          expect(consoleSpies[consoleMethod].calledOnce).to.be.true;
          expect(consoleSpies[consoleMethod].getCall(0).args[0]).to.equal(`${formattedPrefix} ${message}`);
          expect(consoleSpies[consoleMethod].getCall(0).args[1]).to.be.undefined;


          expect(mockEventBus.emit.calledOnceWith(ErrorEvents.LOGGED, { level, message, errorObject: null })).to.be.true;
        });

        it(`should NOT log or emit if log level is too high`, () => {
          // Set log level higher than the message level (unless it's critical)
          if (level !== ErrorLevels.CRITICAL) {
            errorHandler.setLogLevel(ErrorLevels.CRITICAL); // A level that would block INFO, WARN, ERROR, DEBUG
            consoleSpies.log.resetHistory(); // from setLogLevel
            mockEventBus.emit.resetHistory();

            errorHandler[level](`This ${level} message should not appear.`);

            expect(consoleSpies[consoleMethod].called).to.be.false;
            expect(mockEventBus.emit.called).to.be.false;
          }
        });
      });
    });

    describe('debug()', () => {
      it('should log a debug message if currentLogLevel is DEBUG', () => {
        errorHandler.setLogLevel(ErrorLevels.DEBUG); // Enable debug logging
        consoleSpies.log.resetHistory(); // Reset spy for the setLogLevel call's console.log
        mockEventBus.emit.resetHistory();

        const message = 'This is a debug message.';
        const errorObj = { detail: 'debug detail' };
        errorHandler.debug(message, errorObj);

        const targetConsoleMethod = typeof console.debug === 'function' ? 'debug' : 'log';
        expect(consoleSpies[targetConsoleMethod].calledOnce).to.be.true;
        expect(consoleSpies[targetConsoleMethod].getCall(0).args[0]).to.equal(`[HATCH|${ErrorLevels.DEBUG.toUpperCase()}] ${message}`);
        expect(consoleSpies[targetConsoleMethod].getCall(0).args[1]).to.equal(errorObj);
        expect(mockEventBus.emit.calledOnceWith(ErrorEvents.LOGGED, { level: ErrorLevels.DEBUG, message, errorObject: errorObj })).to.be.true;
      });

      it('should not log a debug message if currentLogLevel is INFO (or higher)', () => {
        errorHandler.setLogLevel(ErrorLevels.INFO); // Set level higher than DEBUG
        consoleSpies.log.resetHistory(); // from setLogLevel
        mockEventBus.emit.resetHistory();


        errorHandler.debug('This should not be logged.');
        const targetConsoleMethod = typeof console.debug === 'function' ? 'debug' : 'log';
        expect(consoleSpies[targetConsoleMethod].called).to.be.false;
        expect(mockEventBus.emit.called).to.be.false;
      });
    });
  });

  describe('EventBus Failure', () => {
    it('should use console.error as a fallback if eventBus.emit fails', () => {
      const faultyEventBus = {
        emit: sinon.stub().throws(new Error('EventBus emit failed!')),
      };
      // Initialize with INFO level, doesn't matter for this test
      const handlerWithFaultyBus = new ErrorHandler(faultyEventBus, ErrorLevels.INFO);

      handlerWithFaultyBus.error('Test message for faulty bus.'); // Log an error

      // First call to console.error is for the actual error log
      expect(consoleSpies.error.getCall(0).args[0]).to.equal(`[HATCH|${ErrorLevels.ERROR.toUpperCase()}] Test message for faulty bus.`);
      // Second call to console.error is the fallback for eventBus.emit failure
      expect(consoleSpies.error.getCall(1).args[0]).to.equal('[ErrorHandler] Critical: Failed to emit error:logged event:');
      expect(consoleSpies.error.getCall(1).args[1].message).to.equal('EventBus emit failed!');
    });
  });

  describe('_getConsoleLevel and unknown levels', () => {
    it('should fallback to console.log for debug if console.debug is not a function', () => {
        const originalDebugFn = console.debug;
        console.debug = undefined; // Temporarily remove console.debug

        errorHandler.setLogLevel(ErrorLevels.DEBUG); // Enable debug
        consoleSpies.log.resetHistory(); // from setLogLevel
        mockEventBus.emit.resetHistory();

        errorHandler.debug('A debug message.');

        expect(consoleSpies.log.calledOnce).to.be.true; // Should use console.log
        expect(consoleSpies.log.getCall(0).args[0]).to.equal(`[HATCH|${ErrorLevels.DEBUG.toUpperCase()}] A debug message.`);

        console.debug = originalDebugFn; // Restore console.debug
    });

    it('should log an error and use console.error if an unknown log level is passed to log()', () => {
        // errorHandler is initialized with INFO level by default in beforeEach
        // Spy on console.error specifically for this, as it's expected to be called twice
        // once for the "Unknown log level" message from ErrorHandler.log,
        // and potentially another time if the original message was also an error.
        // However, ErrorHandler.js internally logs the "Unknown log level" message as an ERROR.

        mockEventBus.emit.resetHistory(); // Reset to ensure we only capture emits from this action

        errorHandler.log('FAKE_LEVEL', 'Unknown level test message');

        // The ErrorHandler should log an error message about the unknown level
        expect(consoleSpies.error.calledOnce).to.be.true;
        expect(consoleSpies.error.getCall(0).args[0]).to.include("[HATCH|ERROR] Unknown log level 'FAKE_LEVEL' used for message: Unknown level test message");

        // It should also emit an event for this error
        expect(mockEventBus.emit.calledOnce).to.be.true;
        const emittedArgs = mockEventBus.emit.getCall(0).args[1];
        expect(emittedArgs.level).to.equal(ErrorLevels.ERROR);
        expect(emittedArgs.message).to.include("Unknown log level 'FAKE_LEVEL'");
        expect(emittedArgs.errorObject.originalLevel).to.equal('FAKE_LEVEL');
    });
  });
});
