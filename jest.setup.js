// Jest setup file for global test configuration

// Mock DOM globals for browser-based tests
global.HTMLCanvasElement = class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    // Mock the style property that HatchEngine tries to modify
    this.style = {
      width: '',
      height: '',
      minWidth: '',
      minHeight: '',
      maxWidth: '',
      maxHeight: ''
    };
  }
  
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'left',
      textBaseline: 'top',
      fillText: () => {},
      strokeText: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fill: () => {},
      stroke: () => {}
    };
  }
  
  // Add getBoundingClientRect method for MouseInput
  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      right: this.width,
      bottom: this.height,
      width: this.width,
      height: this.height,
      x: 0,
      y: 0
    };
  }
  
  // Add event listener methods for input handling
  addEventListener() {}
  removeEventListener() {}
};

global.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 0;
    this.height = 0;
  }
  
  set src(value) {
    this._src = value;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};

global.Audio = class MockAudio {
  constructor() {
    this.src = '';
    this.oncanplaythrough = null;
    this.onerror = null;
  }
};

global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve('')
});

// Mock window object for browser-based code
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (callback) => setTimeout(callback, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  devicePixelRatio: 1,
  innerWidth: 800,
  innerHeight: 600,
  location: {
    href: 'http://localhost',
    origin: 'http://localhost'
  },
  document: global.document || {
    createElement: (tagName) => {
      if (tagName === 'canvas') {
        return new global.HTMLCanvasElement();
      }
      return {};
    },
    getElementById: (id) => new global.HTMLCanvasElement()
  }
};

// Mock navigator for user agent detection
global.navigator = {
  userAgent: 'Node.js Jest Test Environment'
};

// Also set global document
global.document = global.window.document;

// Suppress console warnings for cleaner test output
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes('ExperimentalWarning')) {
    return;
  }
  originalWarn.apply(console, args);
};
