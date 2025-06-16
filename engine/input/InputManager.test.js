import InputManager from './InputManager.js';
import KeyboardInput from './KeyboardInput.js'; // Will be the mock constructor
import MouseInput from './MouseInput.js';   // Will be the mock constructor
import { expect } from 'chai';
import { jest } from '@jest/globals';
// No sinon needed for jest's own mocks, but can keep for other spies if necessary
import sinon from 'sinon';


// Mock the KeyboardInput and MouseInput modules
jest.unstable_mockModule('./KeyboardInput.js', () => jest.fn());
jest.unstable_mockModule('./MouseInput.js', () => jest.fn());

describe('InputManager', () => {
  let inputManager;
  let mockEngine;
  let mockCanvasElement;
  let mockKeyboardEventTarget; // Can be window or a mock object

  beforeEach(() => {
    mockEngine = {
        // config: { gameWidth: 800, gameHeight: 600 } // Example if MouseInput needs it
    };
    mockCanvasElement = {
      getBoundingClientRect: jest.fn().mockReturnValue({ top: 0, left: 0, width: 800, height: 600 }),
      // Jest's auto-mock for classes handles methods, so direct addEventListener spies not needed here
      // if MouseInput's constructor/methods are correctly mocked.
    };
    mockKeyboardEventTarget = { // Mock event target if not using actual window
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    };

    // Reset mocks before each test. This clears call history for constructors and methods.
    KeyboardInput.mockClear();
    MouseInput.mockClear();

    // If you need to define specific return values or implementations for methods
    // on the *instances* created by the mocked constructors, you can do it
    // after InputManager is instantiated, or by further refining the mockImplementation
    // of the constructor if needed (though often not necessary for simple cases).
    // For now, rely on auto-mocked methods being jest.fn().

    const defaultOptions = {
        keyboardEventTarget: mockKeyboardEventTarget, // Use a mock target
        preventContextMenu: true,
    };
    inputManager = new InputManager(mockEngine, mockCanvasElement, defaultOptions);
  });

   afterEach(() => {
    // sinon.restore(); // If you use sinon.spy() for non-Jest mocks
  });


  describe('constructor', () => {
    it('should throw an error if engine is not provided', () => {
      expect(() => new InputManager(null, mockCanvasElement)).to.throw('InputManager constructor: HatchEngine instance is required.');
    });

    it('should throw an error if canvasElement is not provided', () => {
      expect(() => new InputManager(mockEngine, null)).to.throw('InputManager constructor: Canvas element is required for MouseInput.');
    });

    it('should instantiate KeyboardInput and MouseInput', () => {
      expect(KeyboardInput).toHaveBeenCalledTimes(1);
      expect(KeyboardInput).toHaveBeenCalledWith(mockKeyboardEventTarget);
      expect(MouseInput).toHaveBeenCalledTimes(1);
      expect(MouseInput).toHaveBeenCalledWith(mockCanvasElement, mockEngine);
      expect(inputManager.keyboard).to.exist;
      expect(inputManager.mouse).to.exist;
    });

    it('should use window as default keyboardEventTarget if not provided in options', () => {
        const realGlobalWindow = global.window;
        global.window = mockKeyboardEventTarget; // Use the mock as stand-in for global window

        new InputManager(mockEngine, mockCanvasElement); // No options
        expect(KeyboardInput).toHaveBeenCalledWith(global.window);

        global.window = realGlobalWindow;
    });

    it('should set preventContextMenu property from options, defaulting to true', () => {
        const imDefault = new InputManager(mockEngine, mockCanvasElement, {}); // keyboardEventTarget will be global.window
        expect(imDefault.preventContextMenu).to.be.true;

        const imFalse = new InputManager(mockEngine, mockCanvasElement, { preventContextMenu: false, keyboardEventTarget: mockKeyboardEventTarget });
        expect(imFalse.preventContextMenu).to.be.false;

        const imTrue = new InputManager(mockEngine, mockCanvasElement, { preventContextMenu: true, keyboardEventTarget: mockKeyboardEventTarget });
        expect(imTrue.preventContextMenu).to.be.true;
    });
  });

  describe('update()', () => {
    it('should call update on keyboard and mouse handlers', () => {
      // Instances are auto-mocked, their methods are jest.fn()
      inputManager.update(0.016);
      expect(inputManager.keyboard.update).toHaveBeenCalledTimes(1);
      expect(inputManager.mouse.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Convenience Methods', () => {
    it('isKeyPressed should call keyboard.isKeyPressed', () => {
      inputManager.keyboard.isKeyPressed.mockReturnValue(true); // Mock return value of the instance's method
      expect(inputManager.isKeyPressed('KeyA')).to.be.true;
      expect(inputManager.keyboard.isKeyPressed).toHaveBeenCalledWith('KeyA');
    });

    it('isKeyJustPressed should call keyboard.isKeyJustPressed', () => {
      inputManager.keyboard.isKeyJustPressed.mockReturnValue(true);
      expect(inputManager.isKeyJustPressed('KeyB')).to.be.true;
      expect(inputManager.keyboard.isKeyJustPressed).toHaveBeenCalledWith('KeyB');
    });

    it('isKeyJustReleased should call keyboard.isKeyJustReleased', () => {
      inputManager.keyboard.isKeyJustReleased.mockReturnValue(true);
      expect(inputManager.isKeyJustReleased('KeyC')).to.be.true;
      expect(inputManager.keyboard.isKeyJustReleased).toHaveBeenCalledWith('KeyC');
    });
  });

  describe('Mouse Convenience Methods', () => {
    it('getMousePosition should call mouse.getMousePosition', () => {
      inputManager.mouse.getMousePosition.mockReturnValue({ x: 100, y: 200 });
      expect(inputManager.getMousePosition()).to.deep.equal({ x: 100, y: 200 });
      expect(inputManager.mouse.getMousePosition).toHaveBeenCalledTimes(1);
    });

    it('isMouseButtonPressed should call mouse.isMouseButtonPressed', () => {
      inputManager.mouse.isMouseButtonPressed.mockReturnValue(true);
      expect(inputManager.isMouseButtonPressed(0)).to.be.true;
      expect(inputManager.mouse.isMouseButtonPressed).toHaveBeenCalledWith(0);
    });

    it('isMouseButtonJustPressed should call mouse.isMouseButtonJustPressed', () => {
      inputManager.mouse.isMouseButtonJustPressed.mockReturnValue(true);
      expect(inputManager.isMouseButtonJustPressed(1)).to.be.true;
      expect(inputManager.mouse.isMouseButtonJustPressed).toHaveBeenCalledWith(1);
    });

    it('isMouseButtonJustReleased should call mouse.isMouseButtonJustReleased', () => {
      inputManager.mouse.isMouseButtonJustReleased.mockReturnValue(true);
      expect(inputManager.isMouseButtonJustReleased(2)).to.be.true;
      expect(inputManager.mouse.isMouseButtonJustReleased).toHaveBeenCalledWith(2);
    });

    it('getMouseScrollDeltaX should call mouse.getScrollDeltaX', () => {
        inputManager.mouse.getScrollDeltaX.mockReturnValue(10);
        expect(inputManager.getMouseScrollDeltaX()).to.equal(10);
        expect(inputManager.mouse.getScrollDeltaX).toHaveBeenCalledTimes(1);
    });

    it('getMouseScrollDeltaY should call mouse.getScrollDeltaY', () => {
        inputManager.mouse.getScrollDeltaY.mockReturnValue(-5);
        expect(inputManager.getMouseScrollDeltaY()).to.equal(-5);
        expect(inputManager.mouse.getScrollDeltaY).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy()', () => {
    it('should call detachEvents on keyboard and mouse handlers', () => {
      inputManager.destroy();
      expect(inputManager.keyboard.detachEvents).toHaveBeenCalledTimes(1);
      expect(inputManager.mouse.detachEvents).toHaveBeenCalledTimes(1);
    });

     it('should not throw if keyboard or mouse handlers are null', () => {
        // This scenario is less likely due to constructor guarantees, but tests robustness
        const tempInputManager = new InputManager(mockEngine, mockCanvasElement, { keyboardEventTarget: mockKeyboardEventTarget });
        tempInputManager.keyboard = null;
        tempInputManager.mouse = null;
        expect(() => tempInputManager.destroy()).to.not.throw();
    });
  });
});
