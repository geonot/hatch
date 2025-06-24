// Jest setup file for global test configuration

// Mock DOM globals for browser-based tests
global.HTMLCanvasElement = class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
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

// Suppress console warnings for cleaner test output
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes('ExperimentalWarning')) {
    return;
  }
  originalWarn.apply(console, args);
};
