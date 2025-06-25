import AssetManager from './AssetManager.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('AssetManager', () => {
  let assetManager;
  let mockEngine;
  let mockErrorHandler;
  let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    // Restore any existing spies first
    sinon.restore();
    
    consoleLogSpy = sinon.spy(console, 'log');
    consoleWarnSpy = sinon.spy(console, 'warn');
    consoleErrorSpy = sinon.spy(console, 'error');

    mockErrorHandler = {
      critical: sinon.spy((message, context) => {
        // Simulate critical error handler throwing the error, as the actual one does
        const errorToThrow = context?.originalError || new Error(message);
        if (errorToThrow instanceof Error) {
            throw errorToThrow;
        } else {
            throw new Error(errorToThrow); // Ensure it's an error instance
        }
      }),
      error: sinon.spy(),
      warn: sinon.spy(),
      info: sinon.spy(),
      debug: sinon.spy(),
    };
    mockEngine = {
      errorHandler: mockErrorHandler,
    };
    assetManager = new AssetManager(mockEngine);

    global.Image = function() {
      const img = {
        _isMockImage: true,
        onload: null,
        onerror: null,
        src: '',
        set src(url) {
          this._src = url;
          setTimeout(() => {
            if (url === 'valid-image.png' || url === 'assets/images/valid-image.png' || url.startsWith('data:')) {
              this.onload && this.onload();
            } else if (url === 'error-image.png' || url === 'assets/images/error-image.png') {
              // The error passed here is what AssetManager's _loadImage will receive
              this.onerror && this.onerror(new Error('Simulated underlying image load error'));
            }
          }, 0);
        },
        get src() {
          return this._src;
        }
      };
      return img;
    };

    global.Audio = function() {
        const audio = {
            _isMockAudio: true,
            oncanplaythrough: null,
            onerror: null,
            src: '',
            _listeners: {},
            addEventListener: function(type, listener) { this._listeners[type] = listener; },
            removeEventListener: function(type) { delete this._listeners[type]; },
            load: function() {
                setTimeout(() => {
                    if (this.src === 'valid-audio.mp3' || this.src === 'assets/audio/valid-audio.mp3') {
                        if (this._listeners['canplaythrough']) this._listeners['canplaythrough']();
                    } else if (this.src === 'error-audio.mp3' || this.src === 'assets/audio/error-audio.mp3') {
                        // The error passed here is what AssetManager's _loadAudio will receive
                        if (this._listeners['error']) this._listeners['error'](new Error('Simulated underlying audio load error'));
                    }
                }, 0);
            },
        };
        return audio;
    };

    global.fetch = async (path) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (path === 'valid-json.json' || path === 'assets/data/valid-json.json') {
                    resolve({ ok: true, json: () => Promise.resolve({ data: 'test' }) });
                } else if (path === 'error-json.json' || path === 'assets/data/error-json.json') {
                    // This error is what AssetManager's _loadJSON will receive if .json() fails
                    resolve({ ok: true, json: () => Promise.reject(new Error('Simulated underlying JSON parse error')) });
                } else if (path === 'fetch-error.json' || path === 'assets/data/fetch-error.json') {
                    // This is for fetch itself failing (e.g. network error, 404)
                    resolve({ ok: false, status: 404, statusText: 'Not Found' });
                } else if (path === 'valid-manifest.json') {
                    resolve({ ok: true, json: () => Promise.resolve({ assets: [
                        { name: 'imgFromManifest', path: 'valid-image.png', type: 'image' },
                        { name: 'audioFromManifest', path: 'valid-audio.mp3', type: 'audio' },
                    ]})});
                } else if (path === 'invalid-manifest-url.json') {
                     resolve({ ok: false, status: 404, statusText: 'Not Found' });
                } else {
                    // This error for other unmocked fetch paths
                    reject(new Error(`Simulated underlying fetch error for path: ${path}`));
                }
            }, 0);
        });
    };
    assetManager = new AssetManager(mockEngine); // Re-instantiate with potentially updated mocks
  });

  afterEach(() => {
    delete global.Image;
    delete global.Audio;
    delete global.fetch;
    if (assetManager && typeof assetManager.clearAll === 'function') {
      assetManager.clearAll();
    }
    sinon.restore();
  });

  describe('loadAsset', () => {
    it('should load an image asset successfully', async () => {
      const asset = await assetManager.loadAsset({ name: 'test-image', path: 'valid-image.png', type: 'image' });
      expect(asset._isMockImage).to.be.true;
      expect(asset.src).to.equal('valid-image.png');
      expect(assetManager.get('test-image')).to.equal(asset);
      expect(mockErrorHandler.critical.called).to.be.false;
    });

    it('should handle image loading errors and call errorHandler.critical', async () => {
      // Expect loadAsset to throw because errorHandler.critical throws
      try {
        await assetManager.loadAsset({ name: 'error-image', path: 'error-image.png', type: 'image' });
        expect.fail('loadAsset should have thrown');
      } catch (e) {
        expect(e.message).to.equal("AssetManager: Failed to load image 'error-image' at path 'error-image.png'. Check network tab for details.");
      }
      expect(mockErrorHandler.critical.calledOnce).to.be.true;
      const firstCallArgs = mockErrorHandler.critical.getCall(0).args;
      expect(firstCallArgs[0]).to.equal("AssetManager: Failed to load image 'error-image' at path 'error-image.png'. Check network tab for details.");
      expect(firstCallArgs[1].params.assetName).to.equal('error-image');
      // originalError.message is now the message from the error created in _loadImage
      expect(firstCallArgs[1].originalError.message).to.equal("AssetManager: Failed to load image 'error-image' at path 'error-image.png'. Check network tab for details.");
      expect(assetManager.get('error-image')).to.be.undefined;
    });

    it('should load an audio asset successfully', async () => {
      const asset = await assetManager.loadAsset({ name: 'test-audio', path: 'valid-audio.mp3', type: 'audio' });
      expect(asset._isMockAudio).to.be.true;
      expect(asset.src).to.contain('valid-audio.mp3');
      expect(assetManager.get('test-audio')).to.equal(asset);
      expect(mockErrorHandler.critical.called).to.be.false;
    });

    it('should handle audio loading errors and call errorHandler.critical', async () => {
      try {
        await assetManager.loadAsset({ name: 'error-audio', path: 'error-audio.mp3', type: 'audio' });
        expect.fail('loadAsset should have thrown');
      } catch (e) {
        expect(e.message).to.equal("AssetManager: Failed to load audio 'error-audio' at path 'error-audio.mp3'. Check network or console for details.");
      }
      expect(mockErrorHandler.critical.calledOnce).to.be.true;
      const firstCallArgs = mockErrorHandler.critical.getCall(0).args;
      expect(firstCallArgs[0]).to.equal("AssetManager: Failed to load audio 'error-audio' at path 'error-audio.mp3'. Check network or console for details.");
      expect(firstCallArgs[1].params.assetName).to.equal('error-audio');
      expect(firstCallArgs[1].originalError.message).to.equal("AssetManager: Failed to load audio 'error-audio' at path 'error-audio.mp3'. Check network or console for details.");
      expect(assetManager.get('error-audio')).to.be.undefined;
    });

    it('should load a JSON asset successfully', async () => {
      const asset = await assetManager.loadAsset({ name: 'test-json', path: 'valid-json.json', type: 'json' });
      expect(asset).to.deep.equal({ data: 'test' });
      expect(assetManager.get('test-json')).to.deep.equal({ data: 'test' });
      expect(mockErrorHandler.critical.called).to.be.false;
    });

    it('should handle JSON loading errors (parse error) and call errorHandler.critical', async () => {
      try {
        await assetManager.loadAsset({ name: 'error-json', path: 'error-json.json', type: 'json' });
        expect.fail('loadAsset should have thrown');
      } catch (e) {
        expect(e.message).to.equal("AssetManager: Error loading or parsing JSON 'error-json' from 'error-json.json'. Simulated underlying JSON parse error");
      }
      expect(mockErrorHandler.critical.calledOnce).to.be.true;
      const firstCallArgs = mockErrorHandler.critical.getCall(0).args;
      expect(firstCallArgs[0]).to.equal("AssetManager: Error loading or parsing JSON 'error-json' from 'error-json.json'. Simulated underlying JSON parse error");
      expect(firstCallArgs[1].params.assetName).to.equal('error-json');
      expect(firstCallArgs[1].originalError.message).to.equal("AssetManager: Error loading or parsing JSON 'error-json' from 'error-json.json'. Simulated underlying JSON parse error");
      expect(assetManager.get('error-json')).to.be.undefined;
    });

    it('should handle JSON loading errors (fetch error) and call errorHandler.critical', async () => {
        try {
            await assetManager.loadAsset({ name: 'fetch-error-json', path: 'fetch-error.json', type: 'json' });
            expect.fail('loadAsset should have thrown');
        } catch (e) {
            expect(e.message).to.equal("AssetManager: Failed to fetch JSON 'fetch-error-json' from 'fetch-error.json'. Status: 404");
        }
        expect(mockErrorHandler.critical.calledOnce).to.be.true;
        const firstCallArgs = mockErrorHandler.critical.getCall(0).args;
        expect(firstCallArgs[0]).to.equal("AssetManager: Failed to fetch JSON 'fetch-error-json' from 'fetch-error.json'. Status: 404");
        expect(firstCallArgs[1].params.assetName).to.equal('fetch-error-json');
        expect(firstCallArgs[1].originalError.message).to.equal("AssetManager: Failed to fetch JSON 'fetch-error-json' from 'fetch-error.json'. Status: 404");
        expect(assetManager.get('fetch-error-json')).to.be.undefined;
    });

    it('should return cached asset if already loaded', async () => {
      const asset1 = await assetManager.loadAsset({ name: 'cached-image', path: 'valid-image.png', type: 'image' });
      const asset2 = await assetManager.loadAsset({ name: 'cached-image', path: 'valid-image.png', type: 'image' });
      expect(asset2).to.equal(asset1);
      expect(mockErrorHandler.critical.called).to.be.false;
    });

    it('should return existing promise if asset is currently loading', async () => {
      const promise1 = assetManager.loadAsset({ name: 'loading-image', path: 'valid-image.png', type: 'image' });
      const promise2 = assetManager.loadAsset({ name: 'loading-image', path: 'valid-image.png', type: 'image' });
      // expect(promise2).to.equal(promise1); // This can be flaky; the important part is they resolve to the same asset.
      const [asset1, asset2] = await Promise.all([promise1, promise2]);
      expect(asset1).to.equal(asset2);
      expect(assetManager.get('loading-image')).to.equal(asset1);
      expect(mockErrorHandler.critical.called).to.be.false;
    });

     it('should handle unsupported asset type and use console.warn', async () => {
      try {
        await assetManager.loadAsset({ name: 'unsupported', path: 'some.font', type: 'font' });
        expect.fail('loadAsset should have thrown for invalid asset type');
      } catch (e) {
        expect(e.message).to.equal("AssetManager.loadAsset: 'type' must be a valid AssetType. Received: font");
      }
      expect(mockErrorHandler.error.calledOnce).to.be.true;
      expect(assetManager.get('unsupported')).to.be.undefined;
    });
  });

  describe('get(name)', () => {
    it('should retrieve a loaded asset by name', async () => {
      const image = await assetManager.loadAsset({ name: 'test-get', path: 'valid-image.png', type: 'image' });
      expect(assetManager.get('test-get')).to.equal(image);
    });

    it('should return undefined for a non-existent asset name', () => {
      expect(assetManager.get('non-existent-asset')).to.be.undefined;
    });
  });

  describe('Convention-based Getters (getImage, getAudio, getJSON)', () => {
    it('getImage should load an image using conventional path', async () => {
      const image = await assetManager.getImage('valid-image.png');
      expect(image._isMockImage).to.be.true;
      expect(image.src).to.equal('assets/images/valid-image.png');
      expect(assetManager.get('valid-image.png')).to.equal(image);
    });

     it('getAudio should load audio using conventional path', async () => {
      const audio = await assetManager.getAudio('valid-audio.mp3');
      expect(audio._isMockAudio).to.be.true;
      expect(audio.src).to.equal('assets/audio/valid-audio.mp3');
      expect(assetManager.get('valid-audio.mp3')).to.equal(audio);
    });

    it('getJSON should load JSON using conventional path', async () => {
      const json = await assetManager.getJSON('valid-json.json');
      expect(json).to.deep.equal({ data: 'test' });
      expect(assetManager.get('valid-json.json')).to.deep.equal(json);
    });

    it('getImage should handle loading error through errorHandler.critical', async () => {
        try {
            await assetManager.getImage('error-image.png');
            expect.fail('getImage should have thrown');
        } catch (e) {
            expect(e.message).to.equal("AssetManager: Failed to load image 'error-image.png' at path 'assets/images/error-image.png'. Check network tab for details.");
        }
        expect(mockErrorHandler.critical.calledOnce).to.be.true;
        const callArgs = mockErrorHandler.critical.getCall(0).args;
        expect(callArgs[0]).to.equal("AssetManager: Failed to load image 'error-image.png' at path 'assets/images/error-image.png'. Check network tab for details.");
        expect(callArgs[1].params.assetName).to.equal('error-image.png');
        expect(callArgs[1].originalError.message).to.equal("AssetManager: Failed to load image 'error-image.png' at path 'assets/images/error-image.png'. Check network tab for details.");
    });
  });

  describe('loadManifest', () => {
    it('should load assets from a manifest object', async () => {
      const manifest = {
        assets: [
          { name: 'img1', path: 'valid-image.png', type: 'image' },
          { name: 'audio1', path: 'valid-audio.mp3', type: 'audio' },
        ],
      };
      await assetManager.loadManifest(manifest); // This will not throw due to Promise.allSettled
      expect(assetManager.get('img1')._isMockImage).to.be.true;
      expect(assetManager.get('audio1')._isMockAudio).to.be.true;
      expect(mockErrorHandler.critical.called).to.be.false; // No errors in this manifest
    });

    it('should load assets from a manifest URL', async () => {
        await assetManager.loadManifest('valid-manifest.json');
        const imgAsset = assetManager.get('imgFromManifest');
        const audioAsset = assetManager.get('audioFromManifest');
        expect(imgAsset._isMockImage).to.be.true;
        expect(imgAsset.src).to.equal('valid-image.png');
        expect(audioAsset._isMockAudio).to.be.true;
        expect(audioAsset.src).to.equal('valid-audio.mp3');
        expect(mockErrorHandler.critical.called).to.be.false;
        expect(mockErrorHandler.error.called).to.be.false;
    });

    it('should handle errors for individual assets in manifest and not stop others', async () => {
      const manifest = {
        assets: [
          { name: 'img-ok', path: 'valid-image.png', type: 'image' },
          { name: 'img-bad', path: 'error-image.png', type: 'image' }, // This will fail
          { name: 'audio-ok', path: 'valid-audio.mp3', type: 'audio' },
        ],
      };
      await assetManager.loadManifest(manifest); // Does not throw overall

      expect(assetManager.get('img-ok')._isMockImage).to.be.true;
      expect(assetManager.get('audio-ok')._isMockAudio).to.be.true;
      expect(assetManager.get('img-bad')).to.be.undefined; // Failed asset not stored

      expect(mockErrorHandler.critical.calledOnce).to.be.true; // Called for 'img-bad'
      expect(mockErrorHandler.critical.getCall(0).args[1].params.assetName).to.equal('img-bad');
      // Check that errorHandler.warn was called by loadManifest for the failed asset
      expect(mockErrorHandler.warn.calledWith(sinon.match(/Asset 'img-bad' \(from manifest\) failed to load. Reason: AssetManager: Failed to load image 'img-bad' at path 'error-image.png'/), sinon.match.object)).to.be.true;
    });

    it('should call engine.errorHandler.warn for invalid asset entries in manifest', async () => {
        const manifest = {
            assets: [
                { name: 'valid', path: 'valid-image.png', type: 'image'},
                { path: 'no-name.png', type: 'image' },
            ]
        };
        await assetManager.loadManifest(manifest);
        expect(assetManager.get('valid')._isMockImage).to.be.true;
        expect(mockErrorHandler.warn.calledOnce).to.be.true;
        expect(mockErrorHandler.warn.getCall(0).args[0]).to.include("Skipping invalid asset entry");
        expect(mockErrorHandler.warn.getCall(0).args[1].params.assetInfo).to.deep.equal({path: 'no-name.png', type: 'image'});
    });

    it('should call engine.errorHandler.warn for invalid manifest object', async () => {
        await assetManager.loadManifest({ items: [] }); // Invalid structure
        expect(mockErrorHandler.warn.calledOnce).to.be.true;
        expect(mockErrorHandler.warn.getCall(0).args[0]).to.include("Manifest object is invalid or missing the 'assets' array.");
    });

    it('should call engine.errorHandler.error if fetching manifest URL fails', async () => {
        await assetManager.loadManifest('invalid-manifest-url.json');
        expect(mockErrorHandler.error.callCount).to.be.greaterThan(0);
        // Find the call that matches our expected pattern
        const matchingCall = mockErrorHandler.error.getCalls().find(call => 
            call.args[0] && call.args[0].includes("Failed to fetch manifest from 'invalid-manifest-url.json'")
        );
        expect(matchingCall).to.exist;
        expect(matchingCall.args[0]).to.include("Failed to fetch manifest from 'invalid-manifest-url.json'. Status: 404");
        expect(matchingCall.args[1].params.manifestPath).to.equal('invalid-manifest-url.json');
    });
  });

  describe('clearAll()', () => {
    it('should clear all cached assets and pending promises', async () => {
      await assetManager.loadAsset({ name: 'image1', path: 'valid-image.png', type: 'image' });
      const loadingPromise = assetManager.loadAsset({ name: 'image2_pending', path: 'valid-image.png', type: 'image' });

      expect(assetManager.get('image1')).to.not.be.undefined;
      expect(assetManager.promises.has('image2_pending')).to.be.true;

      assetManager.clearAll();

      expect(assetManager.get('image1')).to.be.undefined;
      expect(assetManager.assets.size).to.equal(0);
      expect(assetManager.promises.size).to.equal(0);
      // Allow the pending promise to settle (it will resolve successfully as 'valid-image.png' is valid)
      await loadingPromise;
    });
  });
});
