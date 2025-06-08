// Basic test for HatchEngine - not using a formal test runner for Phase 1.
// This test would typically run in a browser environment or a Node.js env with DOM emulation.

// Assuming ErrorHandler and EventSystem are loaded globally or via modules
// For Node.js testing:
// const ErrorHandler = require('./ErrorHandler');
// const EventSystem = require('./EventSystem');
// const HatchEngine = require('./HatchEngine');

// Mock requestAnimationFrame and cancelAnimationFrame for Node.js or non-browser tests
if (typeof requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = (callback) => {
        // Simulate a frame callback, e.g., after a short delay
        return setTimeout(() => callback(performance.now()), 16);
    };
    global.cancelAnimationFrame = (id) => {
        clearTimeout(id);
    };
    // Mock performance.now if not available (older Node versions)
    if (typeof performance === 'undefined') {
        global.performance = { now: () => Date.now() };
    }
}
// Mock document for canvas creation if not in browser
if (typeof document === 'undefined') {
    global.document = {
        createElement: (tagName) => {
            if (tagName === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => ({
                        fillRect: () => {}, clearRect: () => {}, drawImage: () => {},
                        beginPath: () => {}, stroke: () => {}, fill: () => {},
                        // Add other mock methods as needed by engine/render stubs
                    }),
                    style: {},
                    addEventListener: () => {},
                    removeEventListener: () => {}
                };
            }
            return {};
        },
        // body: { appendChild: () => {} } // if createCanvas appends
    };
}


function testHatchEngine() {
    console.log("Running HatchEngine tests...");
    let engine;

    // Test Instantiation
    try {
        engine = new HatchEngine({ width: 300, height: 200 });
        console.log("HatchEngine instantiated successfully.");
        if (engine.width === 300 && engine.height === 200) {
            console.log("Canvas dimensions correctly set on instantiation.");
        } else {
            console.error("Canvas dimensions mismatch:", engine.width, engine.height);
        }
        if (engine.errorHandler && engine.eventSystem) {
            console.log("Core systems (ErrorHandler, EventSystem) seem initialized.");
        } else {
            console.error("Core systems not initialized on engine.");
        }
    } catch (e) {
        console.error("Failed to instantiate HatchEngine:", e);
        return; // Stop tests if instantiation fails
    }

    // Test init()
    try {
        console.log("Testing engine.init()...");
        engine.init().then(() => { // init is async
            console.log("engine.init() completed.");

            // Test start() and stop() - needs a delay to simulate game loop
            console.log("Testing engine.start() and engine.stop()...");
            engine.start();
            if (engine.isRunning && engine.gameLoopId !== null) {
                console.log("engine.start() initiated successfully.");
            } else {
                console.error("engine.start() failed to set engine state.");
            }

            setTimeout(() => {
                engine.stop();
                if (!engine.isRunning && engine.gameLoopId === null) {
                    console.log("engine.stop() executed successfully.");
                } else {
                    console.error("engine.stop() failed to reset engine state.");
                }

                // Test pause() and resume()
                console.log("Testing engine.pause() and engine.resume()...");
                engine.start(); // Restart for pause/resume test
                engine.pause();
                if (engine.isPaused) {
                    console.log("engine.pause() successful.");
                } else {
                    console.error("engine.pause() failed.");
                }
                engine.resume();
                if (!engine.isPaused) {
                    console.log("engine.resume() successful.");
                } else {
                    console.error("engine.resume() failed.");
                }
                engine.stop(); // Stop after test

                // Test resize()
                console.log("Testing engine.resize()...");
                engine.resize(400, 300);
                if (engine.width === 400 && engine.height === 300 && engine.canvas.width === 400 && engine.canvas.height === 300) {
                    console.log("engine.resize() successful.");
                } else {
                    console.error("engine.resize() failed. Dimensions:", engine.width, engine.height);
                }

                // Test destroy()
                console.log("Testing engine.destroy()...");
                engine.destroy();
                // Check if resources are nullified (basic check for stub)
                if (engine.canvas === null && engine.ctx === null && engine.eventSystem === null) {
                    console.log("engine.destroy() appears to have cleaned up resources.");
                } else {
                    console.error("engine.destroy() did not fully nullify resources.");
                }

                console.log("HatchEngine tests finished (async part).");

            }, 100); // Wait for a few frames

        }).catch(initError => {
            console.error("Error during engine.init():", initError);
        });

    } catch (e) {
        console.error("Error during HatchEngine lifecycle tests:", e);
    }

    console.log("HatchEngine synchronous tests finished. Async tests pending...");
}

// Run the tests
// In a browser, ensure ErrorHandler.js, EventSystem.js, and HatchEngine.js are loaded before this script.
// Then call testHatchEngine();
// For Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//     testHatchEngine();
// }
