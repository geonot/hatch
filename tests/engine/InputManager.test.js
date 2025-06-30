import InputManager from '../../engine/input/InputManager.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('InputManager', () => {
  let inputManager;
  let mockEngine;
  let mockCanvasElement;
  let mockKeyboardEventTarget;

  beforeEach(() => {
    mockEngine = {
        width: 800,
        height: 600,
        errorHandler: {
            warn: sinon.spy(),
            error: sinon.spy(),
            info: sinon.spy(),
            debug: sinon.spy(),
            critical: sinon.spy(),
        }
    };
    mockCanvasElement = {
      getBoundingClientRect: sinon.stub().returns({ top: 0, left: 0, width: 800, height: 600 }),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    };
    mockKeyboardEventTarget = {
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
    };

    const defaultOptions = {
        keyboardEventTarget: mockKeyboardEventTarget,
        preventContextMenu: true,
    };
    inputManager = new InputManager(mockEngine, mockCanvasElement, defaultOptions);
  });

   afterEach(() => {
    sinon.restore();
  });


  describe('constructor', () => {
    it('should throw an error if engine is not provided', () => {
      expect(() => new InputManager(null, mockCanvasElement)).to.throw('InputManager constructor: HatchEngine instance is required.');
    });

    it('should throw an error if canvasElement is not provided', () => {
      expect(() => new InputManager(mockEngine, null)).to.throw('InputManager constructor: Canvas element is required for MouseInput.');
    });

    it('should instantiate KeyboardInput and MouseInput', () => {
      // Test that the inputManager has keyboard and mouse properties
      expect(inputManager.keyboard).to.exist;
      expect(inputManager.mouse).to.exist;
      expect(inputManager.keyboard).to.be.an('object');
      expect(inputManager.mouse).to.be.an('object');
    });

    it('should use window as default keyboardEventTarget if not provided in options', () => {
        const realGlobalWindow = global.window;
        global.window = mockKeyboardEventTarget;

        const imWithoutOptions = new InputManager(mockEngine, mockCanvasElement);
        expect(imWithoutOptions.keyboard).to.exist;

        global.window = realGlobalWindow;
    });

    it('should set preventContextMenu property from options, defaulting to true', () => {
        const imDefault = new InputManager(mockEngine, mockCanvasElement, {});
        expect(imDefault.preventContextMenu).to.be.true;

        const imFalse = new InputManager(mockEngine, mockCanvasElement, { preventContextMenu: false, keyboardEventTarget: mockKeyboardEventTarget });
        expect(imFalse.preventContextMenu).to.be.false;

        const imTrue = new InputManager(mockEngine, mockCanvasElement, { preventContextMenu: true, keyboardEventTarget: mockKeyboardEventTarget });
        expect(imTrue.preventContextMenu).to.be.true;
    });
  });

  describe('update()', () => {
    it('should call update on keyboard and mouse handlers', () => {
      const keyboardUpdateSpy = sinon.spy(inputManager.keyboard, 'update');
      const mouseUpdateSpy = sinon.spy(inputManager.mouse, 'update');
      
      inputManager.update(0.016);
      
      expect(keyboardUpdateSpy.calledOnce).to.be.true;
      expect(mouseUpdateSpy.calledOnce).to.be.true;
    });
  });

  describe('Keyboard Convenience Methods', () => {
    it('isKeyPressed should call keyboard.isKeyPressed', () => {
      const keyboardStub = sinon.stub(inputManager.keyboard, 'isKeyPressed').returns(true);
      
      expect(inputManager.isKeyPressed('KeyA')).to.be.true;
      expect(keyboardStub.calledWith('KeyA')).to.be.true;
    });

    it('isKeyJustPressed should call keyboard.isKeyJustPressed', () => {
      const keyboardStub = sinon.stub(inputManager.keyboard, 'isKeyJustPressed').returns(true);
      
      expect(inputManager.isKeyJustPressed('KeyB')).to.be.true;
      expect(keyboardStub.calledWith('KeyB')).to.be.true;
    });

    it('isKeyJustReleased should call keyboard.isKeyJustReleased', () => {
      const keyboardStub = sinon.stub(inputManager.keyboard, 'isKeyJustReleased').returns(true);
      
      expect(inputManager.isKeyJustReleased('KeyC')).to.be.true;
      expect(keyboardStub.calledWith('KeyC')).to.be.true;
    });
  });

  describe('Mouse Convenience Methods', () => {
    it('getMousePosition should call mouse.getMousePosition', () => {
      const mouseStub = sinon.stub(inputManager.mouse, 'getMousePosition').returns({ x: 100, y: 200 });
      
      expect(inputManager.getMousePosition()).to.deep.equal({ x: 100, y: 200 });
      expect(mouseStub.calledOnce).to.be.true;
    });

    it('isMouseButtonPressed should call mouse.isMouseButtonPressed', () => {
      const mouseStub = sinon.stub(inputManager.mouse, 'isMouseButtonPressed').returns(true);
      
      expect(inputManager.isMouseButtonPressed(0)).to.be.true;
      expect(mouseStub.calledWith(0)).to.be.true;
    });

    it('isMouseButtonJustPressed should call mouse.isMouseButtonJustPressed', () => {
      const mouseStub = sinon.stub(inputManager.mouse, 'isMouseButtonJustPressed').returns(true);
      
      expect(inputManager.isMouseButtonJustPressed(1)).to.be.true;
      expect(mouseStub.calledWith(1)).to.be.true;
    });

    it('isMouseButtonJustReleased should call mouse.isMouseButtonJustReleased', () => {
      const mouseStub = sinon.stub(inputManager.mouse, 'isMouseButtonJustReleased').returns(true);
      
      expect(inputManager.isMouseButtonJustReleased(2)).to.be.true;
      expect(mouseStub.calledWith(2)).to.be.true;
    });

    it('getMouseScrollDeltaX should call mouse.getScrollDeltaX', () => {
        const mouseStub = sinon.stub(inputManager.mouse, 'getScrollDeltaX').returns(10);
        
        expect(inputManager.getMouseScrollDeltaX()).to.equal(10);
        expect(mouseStub.calledOnce).to.be.true;
    });

    it('getMouseScrollDeltaY should call mouse.getScrollDeltaY', () => {
        const mouseStub = sinon.stub(inputManager.mouse, 'getScrollDeltaY').returns(-5);
        
        expect(inputManager.getMouseScrollDeltaY()).to.equal(-5);
        expect(mouseStub.calledOnce).to.be.true;
    });
  });

  describe('destroy()', () => {
    it('should call detachEvents on keyboard and mouse handlers', () => {
      const keyboardDetachSpy = sinon.spy(inputManager.keyboard, 'detachEvents');
      const mouseDetachSpy = sinon.spy(inputManager.mouse, 'detachEvents');
      
      inputManager.destroy();
      
      expect(keyboardDetachSpy.calledOnce).to.be.true;
      expect(mouseDetachSpy.calledOnce).to.be.true;
    });

     it('should not throw if keyboard or mouse handlers are null', () => {
        const tempInputManager = new InputManager(mockEngine, mockCanvasElement, { keyboardEventTarget: mockKeyboardEventTarget });
        tempInputManager.keyboard = null;
        tempInputManager.mouse = null;
        expect(() => tempInputManager.destroy()).to.not.throw();
    });
  });
});
