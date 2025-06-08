// Basic test for AssetManager - primarily for browser environments due to Image object.
// For Node.js, Image object needs to be mocked.

// Assuming HatchEngine core classes (ErrorHandler, EventSystem) are available for the engine mock.
// For Node.js testing:
// const AssetManager = require('./AssetManager');
// const EventSystem = require('../core/EventSystem'); // Adjust path
// const ErrorHandler = require('../core/ErrorHandler'); // Adjust path

// Mock minimal engine for testing AssetManager
const mockEngineForAssets = {
    eventSystem: new EventSystem(), // Assuming EventSystem is available
    errorHandler: new ErrorHandler(), // Assuming ErrorHandler is available
};

// Mock Image for Node.js environment
if (typeof Image === 'undefined') {
    global.Image = class MockImage {
        constructor() {
            this.src = '';
            this.onload = null;
            this.onerror = null;
            this.crossOrigin = ''; // To match the code
            // Simulate async loading
            setTimeout(() => {
                if (this.src && this.src !== 'fail_path.png') {
                    this.width = 100; // Mock dimensions
                    this.height = 100;
                    if (this.onload) this.onload();
                } else if (this.src === 'fail_path.png') {
                    if (this.onerror) this.onerror(new Error("Mock load error"));
                }
            }, 50);
        }
    };
}


async function testAssetManager() {
    console.log("Running AssetManager tests...");
    let assetManager;

    try {
        assetManager = new AssetManager(mockEngineForAssets);
        await assetManager.init();
        console.log("AssetManager instantiated and initialized successfully.");
    } catch (e) {
        console.error("Failed to instantiate or initialize AssetManager:", e);
        return;
    }

    // Test loadImage
    // Use a placeholder image path. For a real browser test, use a valid small image URL/path.
    // For Node.js test with mock, any path that doesn't trigger error in mock is fine.
    // A common public domain 1x1 pixel PNG for testing:
    const testImagePath = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const failImagePath = "fail_path.png"; // Will be handled by mock Image to call onerror
    const assetName = "testImage";

    console.log("Testing loadImage (success)...");
    try {
        const image = await assetManager.loadImage(testImagePath, assetName);
        if (image && assetManager.getAsset(assetName) === image && image.width > 0) {
            console.log(`loadImage test passed for '${assetName}'. Dimensions: ${image.width}x${image.height}`);
        } else {
            console.error("loadImage test FAILED for success case. Image:", image, "Asset in map:", assetManager.getAsset(assetName));
        }

        // Test loading same image again (should return cached/promise)
        const imageAgain = await assetManager.loadImage(testImagePath, assetName);
        if (imageAgain === image) {
            console.log("Loading existing image returned cached asset: PASSED");
        } else {
            console.error("Loading existing image did not return cached asset: FAILED");
        }

    } catch (e) {
        console.error("Error during loadImage (success) test:", e);
    }

    console.log("Testing loadImage (failure)...");
    try {
        await assetManager.loadImage(failImagePath, "failingImage");
        console.error("loadImage failure test FAILED: Promise should have rejected.");
    } catch (e) {
        if (e.message.includes("Failed to load image") || e.message.includes("Mock load error")) {
            console.log("loadImage failure test passed (promise rejected as expected). Error:", e.message);
        } else {
            console.error("loadImage failure test FAILED: Promise rejected, but with unexpected error:", e);
        }
        if (assetManager.getAsset("failingImage")) {
             console.error("loadImage failure test FAILED: Asset 'failingImage' should not be in cache after error.");
        }
    }

    // Test getAsset and getImage
    console.log("Testing getAsset and getImage...");
    const retrievedAsset = assetManager.getAsset(assetName);
    const retrievedImage = assetManager.getImage(assetName);
    if (retrievedAsset && retrievedAsset === retrievedImage && retrievedImage instanceof Image) {
        console.log("getAsset and getImage tests passed.");
    } else {
        console.error("getAsset or getImage tests FAILED. Asset:", retrievedAsset, "Image:", retrievedImage);
    }
    const nonExistent = assetManager.getAsset("nonExistentAsset");
    if (nonExistent === null) {
        console.log("getAsset for non-existent asset returned null: PASSED");
    } else {
        console.error("getAsset for non-existent asset did not return null: FAILED");
    }

    // Test unloadAsset
    console.log("Testing unloadAsset...");
    let unloaded = assetManager.unloadAsset(assetName);
    if (unloaded && assetManager.getAsset(assetName) === null) {
        console.log("unloadAsset test passed.");
    } else {
        console.error("unloadAsset test FAILED. Unloaded:", unloaded, "Asset in map:", assetManager.getAsset(assetName));
    }
    unloaded = assetManager.unloadAsset("nonExistentAsset");
    if (!unloaded) {
        console.log("unloadAsset for non-existent asset returned false: PASSED");
    } else {
        console.error("unloadAsset for non-existent asset returned true: FAILED");
    }

    // Test unloadAllAssets
    console.log("Testing unloadAllAssets...");
    await assetManager.loadImage(testImagePath, "tempImage1"); // Load some assets
    await assetManager.loadImage(testImagePath, "tempImage2");
    assetManager.unloadAllAssets();
    if (assetManager.getAsset("tempImage1") === null && assetManager.getAsset("tempImage2") === null && assetManager.assets.size === 0) {
        console.log("unloadAllAssets test passed.");
    } else {
        console.error("unloadAllAssets test FAILED. Assets map size:", assetManager.assets.size);
    }


    try {
        assetManager.destroy();
        console.log("AssetManager destroyed successfully.");
    } catch (e) {
        console.error("Failed to destroy AssetManager:", e);
    }

    console.log("AssetManager tests finished (async).");
}

// Run the tests
// In a browser, ensure core engine files and AssetManager.js are loaded.
// Then call testAssetManager();
// For Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//     const EventSystem = require('../core/EventSystem'); // Adjust path
//     const ErrorHandler = require('../core/ErrorHandler'); // Adjust path
//     testAssetManager();
// }
