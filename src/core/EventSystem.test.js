// Basic test for EventSystem - not using a formal test runner for Phase 1.

// const EventSystem = require('./EventSystem'); // For Node.js environment

function testEventSystem() {
    console.log("Running EventSystem tests...");
    let eventSystem;

    try {
        eventSystem = new EventSystem();
        console.log("EventSystem instantiated successfully.");
    } catch (e) {
        console.error("Failed to instantiate EventSystem:", e);
        return;
    }

    let testEventHandled = false;
    let testEventData = null;
    let onceHandlerCalled = 0;

    // Test 'on' and 'emit' (queued)
    try {
        console.log("Testing 'on' and 'emit' (queued)...");
        eventSystem.on('testEvent', (data) => {
            testEventHandled = true;
            testEventData = data;
            console.log("testEvent handler called with data:", data);
        });

        eventSystem.on('onceEvent', () => {
            onceHandlerCalled++;
            console.log("onceEvent handler called.");
        }, { once: true });

        eventSystem.emit('testEvent', { message: "Hello from queued event" });
        eventSystem.emit('onceEvent', { detail: "first call" });
        eventSystem.emit('onceEvent', { detail: "second call" }); // Should only trigger handler once

        console.log("Events emitted to queue. Processing queue...");
        eventSystem.processEventQueue();

        if (testEventHandled && testEventData && testEventData.message === "Hello from queued event") {
            console.log("'on' and queued 'emit' test passed.");
        } else {
            console.error("'on' and queued 'emit' test failed. Handled:", testEventHandled, "Data:", testEventData);
        }
        if (onceHandlerCalled === 1) {
            console.log("'once' handler test passed.");
        } else {
            console.error("'once' handler test failed. Called times:", onceHandlerCalled);
        }
        // Check if 'onceEvent' listener is removed
        if (!eventSystem.listeners.has('onceEvent') || eventSystem.listeners.get('onceEvent').size === 0) {
            console.log("'once' handler removal test passed.");
        } else {
            console.error("'once' handler removal test failed. Listeners remaining:", eventSystem.listeners.get('onceEvent'));
        }


    } catch (e) {
        console.error("Error during 'on' and 'emit' (queued) test:", e);
    }

    // Reset for next test
    testEventHandled = false;
    testEventData = null;

    // Test 'emit' (immediate)
    try {
        console.log("Testing 'emit' (immediate)...");
        const handlerId = eventSystem.on('immediateTestEvent', (data) => {
            testEventHandled = true;
            testEventData = data;
            console.log("immediateTestEvent handler called with data:", data);
        });

        eventSystem.emit('immediateTestEvent', { message: "Hello from immediate event" }, true);

        if (testEventHandled && testEventData && testEventData.message === "Hello from immediate event") {
            console.log("'emit' (immediate) test passed.");
        } else {
            console.error("'emit' (immediate) test failed. Handled:", testEventHandled, "Data:", testEventData);
        }
        eventSystem.off('immediateTestEvent', handlerId); // Clean up
    } catch (e) {
        console.error("Error during 'emit' (immediate) test:", e);
    }

    // Test 'off'
    try {
        console.log("Testing 'off'...");
        let offTestHandled = false;
        const handlerToRemove = () => { offTestHandled = true; };
        const idToRemove = eventSystem.on('offTestEvent', handlerToRemove);

        const removedById = eventSystem.off('offTestEvent', idToRemove);
        if (removedById && (!eventSystem.listeners.has('offTestEvent') || eventSystem.listeners.get('offTestEvent').size === 0)) {
            console.log("'off' by ID test passed.");
        } else {
            console.error("'off' by ID test failed. Removed:", removedById, "Listeners:", eventSystem.listeners.get('offTestEvent'));
        }

        eventSystem.emit('offTestEvent', {}, true); // Should not call handler
        if (!offTestHandled) {
            console.log("Handler correctly not called after 'off'.");
        } else {
            console.error("Handler was called after 'off'. 'off' test failed.");
        }

        // Test removing by function reference
        eventSystem.on('offTestEventFunc', handlerToRemove);
        const removedByFunc = eventSystem.off('offTestEventFunc', handlerToRemove);
         if (removedByFunc && (!eventSystem.listeners.has('offTestEventFunc') || eventSystem.listeners.get('offTestEventFunc').size === 0)) {
            console.log("'off' by function reference test passed.");
        } else {
            console.error("'off' by function reference test failed. Removed:", removedByFunc, "Listeners:", eventSystem.listeners.get('offTestEventFunc'));
        }

    } catch (e) {
        console.error("Error during 'off' test:", e);
    }

    console.log("EventSystem tests finished.");
}

// To run this test in a browser, include EventSystem.js and this script,
// then call testEventSystem() from the console or another script.
// For Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//     testEventSystem();
// }
