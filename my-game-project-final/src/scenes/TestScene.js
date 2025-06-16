import { Scene } from 'hatch-engine/scenes/Scene.js';

export default class TestScene extends Scene {
    constructor(engine) {
        super(engine);
    }

    load() {
        console.log('TestScene: load() called');
    }

    init() {
        console.log('TestScene: init() called');
    }

    update(deltaTime) {
        // console.log('TestScene: update()', deltaTime);
    }

    render(renderingEngine) {
        // console.log('TestScene: render()');
    }

    exit() {
        console.log('TestScene: exit() called');
    }

    destroy() {
        console.log('TestScene: destroy() called');
    }
}
