import { Scene } from 'hatch-engine/scenes/Scene.js';

export default class TestScene extends Scene {
    constructor(engine) {
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
        //     this.renderingEngine.add(sprite);
        // }
    }

    update(deltaTime) {
        // console.log('TestScene: update()', deltaTime);
    }

    render(renderingEngine) {
        // console.log('TestScene: render()');
        // renderingEngine.drawText('Hello from TestScene', 50, 50, '20px Arial', 'white');
    }

    exit() {
        console.log('TestScene: exit() called');
    }

    destroy() {
        console.log('TestScene: destroy() called');
        // this.renderingEngine.clearDrawables();
    }
}
