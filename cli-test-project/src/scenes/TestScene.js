import { Scene } from 'hatch-engine/scenes/Scene.js'; // Adjust path if needed

export default class TestScene extends Scene {
    constructor(engine) { // Scene constructor expects engine
        super(engine);
    }

    load() {
        console.log('TestScene: load() called');
        // Example: await this.assetManager.loadAsset({ name: 'testImage', path: '/assets/images/test-sprite.png', type: 'image' });
    }

    init() {
        console.log('TestScene: init() called');
        // Example: if (this.assetManager.get('testImage')) {
        //     const sprite = new Sprite({ image: this.assetManager.get('testImage'), x: 100, y: 100 });
        //     this.renderingEngine.add(sprite); // Add to rendering engine for visibility
        // }
    }

    update(deltaTime) {
        // console.log('TestScene: update()', deltaTime);
    }

    render(renderingEngine) {
        // console.log('TestScene: render()');
        // Objects added via this.renderingEngine.add() in init or update will be rendered.
        // Or, dynamically add here:
        // renderingEngine.drawText('Hello from TestScene', 50, 50, '20px Arial', 'white');
    }

    exit() {
        console.log('TestScene: exit() called');
    }

    destroy() {
        console.log('TestScene: destroy() called');
        // Clean up scene-specific resources
        // this.renderingEngine.clearDrawables(); // If objects were added directly to RE for this scene.
    }
}