import { EventBus } from '../../engine/core/EventBus.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('EventBus', () => {
  let eventBus;
  let consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    eventBus = new EventBus();
    consoleWarnSpy = sinon.spy(console, 'warn');
    consoleErrorSpy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with an empty listeners object', () => {
      expect(eventBus.listeners).to.deep.equal({});
    });
  });

  describe('on()', () => {
    it('should register a callback for an event', () => {
      const callback = sinon.spy();
      eventBus.on('testEvent', callback);
      expect(eventBus.listeners['testEvent']).to.be.an('array').with.lengthOf(1);
      expect(eventBus.listeners['testEvent'][0]).to.equal(callback);
    });

    it('should register multiple callbacks for the same event', () => {
      const callback1 = sinon.spy();
      const callback2 = sinon.spy();
      eventBus.on('testEvent', callback1);
      eventBus.on('testEvent', callback2);
      expect(eventBus.listeners['testEvent']).to.be.an('array').with.lengthOf(2);
      expect(eventBus.listeners['testEvent']).to.include(callback1);
      expect(eventBus.listeners['testEvent']).to.include(callback2);
    });

    it('should warn if registering a non-function callback', () => {
      eventBus.on('testEvent', 'not a function');
      expect(consoleWarnSpy.calledOnceWith(sinon.match(/Attempted to register non-function callback/))).to.be.true;
      expect(eventBus.listeners['testEvent']).to.be.undefined;
    });

    it('should not create an event entry if callback is invalid', () => {
        eventBus.on('anotherTestEvent', null);
        expect(eventBus.listeners['anotherTestEvent']).to.be.undefined;
    });
  });

  describe('emit()', () => {
    it('should call all registered callbacks for an event with arguments', () => {
      const callback1 = sinon.spy();
      const callback2 = sinon.spy();
      eventBus.on('testEvent', callback1);
      eventBus.on('testEvent', callback2);

      const arg1 = 'hello';
      const arg2 = 123;
      eventBus.emit('testEvent', arg1, arg2);

      expect(callback1.calledOnceWith(arg1, arg2)).to.be.true;
      expect(callback2.calledOnceWith(arg1, arg2)).to.be.true;
    });

    it('should do nothing if emitting an event with no listeners', () => {
      const callback = sinon.spy();
      // Register a listener for a different event to ensure emit targets correctly
      eventBus.on('anotherEvent', callback);

      expect(() => eventBus.emit('nonExistentEvent', 'data')).to.not.throw();
      expect(callback.called).to.be.false; // Ensure other listeners not called
    });

    it('should handle errors in callbacks gracefully and log them', () => {
      const failingCallback = sinon.stub().throws(new Error('Callback failed!'));
      const successfulCallback = sinon.spy();

      eventBus.on('mixedEvent', failingCallback);
      eventBus.on('mixedEvent', successfulCallback);

      eventBus.emit('mixedEvent', 'testData');

      expect(failingCallback.calledOnce).to.be.true;
      expect(successfulCallback.calledOnce).to.be.true; // Ensure subsequent callbacks are still called
      expect(consoleErrorSpy.calledOnce).to.be.true;
      expect(consoleErrorSpy.getCall(0).args[0]).to.contain('[EventBus] Error in callback for event "mixedEvent":');
      expect(consoleErrorSpy.getCall(0).args[1].message).to.equal('Callback failed!');
    });
  });

  describe('off()', () => {
    it('should remove a specific callback for an event', () => {
      const callback1 = sinon.spy();
      const callback2 = sinon.spy();
      eventBus.on('testEvent', callback1);
      eventBus.on('testEvent', callback2);

      eventBus.off('testEvent', callback1);

      expect(eventBus.listeners['testEvent']).to.be.an('array').with.lengthOf(1);
      expect(eventBus.listeners['testEvent'][0]).to.equal(callback2);
      expect(eventBus.listeners['testEvent']).to.not.include(callback1);

      // Emit to confirm only remaining listener is called
      eventBus.emit('testEvent', 'data');
      expect(callback1.called).to.be.false;
      expect(callback2.calledOnceWith('data')).to.be.true;
    });

    it('should do nothing if trying to remove a non-existent callback', () => {
      const callback1 = sinon.spy();
      const nonExistentCallback = sinon.spy();
      eventBus.on('testEvent', callback1);

      eventBus.off('testEvent', nonExistentCallback);
      expect(eventBus.listeners['testEvent']).to.be.an('array').with.lengthOf(1);
      expect(eventBus.listeners['testEvent'][0]).to.equal(callback1);
    });

    it('should do nothing if trying to remove a listener from a non-existent event', () => {
      const callback = sinon.spy();
      eventBus.off('nonExistentEvent', callback);
      // Optional: check for console.warn if that behavior is desired and implemented in EventBus.off
      // For now, just ensure it doesn't throw and listeners object remains empty for that event.
      expect(eventBus.listeners['nonExistentEvent']).to.be.undefined;
    });

    it('should remove all listeners if the event array becomes empty', () => {
      const callback = sinon.spy();
      eventBus.on('testEvent', callback);
      eventBus.off('testEvent', callback);
      // The current implementation keeps an empty array.
      // Depending on desired behavior, it might delete listeners[eventName].
      // The provided code filters, potentially leaving an empty array.
      expect(eventBus.listeners['testEvent']).to.be.an('array').with.lengthOf(0);
    });
  });
});
