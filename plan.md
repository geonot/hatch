**Overall Approach for v0.1:**

1.  **Engine First, Iteratively:** Focus on getting the core runtime engine modules up and running, piece by piece.
2.  **CLI Scaffolding Early:** Develop basic project initialization (`hatch new`) and the dev server (`hatch dev`) early to facilitate engine development and testing within a realistic project structure.
3.  **Templates as Testbeds:** Use the "basic-square" game template as the primary integration point and testbed for the engine features as they are developed.
4.  **Prioritize Core Functionality:** Ensure the game loop, rendering, input, and basic asset loading are functional before moving to more specialized systems like grids or advanced UI.
5.  **Vanilla JS & Modularity:** Stick to vanilla ES6+ modules. Each class/manager described in the TDD will typically reside in its own `.js` file.
6.  **Minimal Viable CLI:** For the "first pass" of the CLI, `new`, `dev`, and `build` are the key commands. `templates list` and `help` can follow.

---

**Development Plan for Hatch v0.1**

**Phase 1: Engine Core & Basic CLI Setup**

*(Goal: Get a minimal project running, drawing something, and responding to input)*

1.  **Project Structure & CLI Basics (`hatch-cli`)**:
    *   Set up the Node.js project for `hatch-cli`.
    *   Implement `hatch new <project-name>`:
        *   Creates directory structure (as per 7.3 Template Structure).
        *   Generates a minimal `index.html` (with a canvas element).
        *   Generates a basic `hatch.config.yaml` (project name, canvasId, width, height).
        *   Generates a placeholder `src/main.js`.
    *   Implement `hatch dev`:
        *   Use `vite` (recommended for simplicity and HMR) or a simple `http-server` with a file watcher for `src/` and `assets/`.
        *   Serves `index.html`.
        *   Hot-reloading for JavaScript.

2.  **Engine Foundation (`HatchEngine`, `EventBus`, `ErrorHandler`)**:
    *   `ErrorHandler.js`: Implement as described (4.1.4).
    *   `EventBus.js`: Implement as described (4.1.5).
    *   `HatchEngine.js` (Initial Pass - Section 5.1):
        *   Constructor: Initialize `eventBus`, `errorHandler`. Parse basic config from `hatch.config.yaml` (passed in or loaded).
        *   `init()`: Basic setup (e.g., get canvas).
        *   `start()` / `stop()`: Basic game loop (`requestAnimationFrame`) setup.
        *   `_loop()`: Placeholder for input, update, render calls. Just `console.log('tick')` for now.
    *   Update `src/main.js` in the template to instantiate and start `HatchEngine`.

3.  **Rendering Engine (Canvas 2D - Initial Pass - Section 5.4)**:
    *   `RenderingEngine.js`:
        *   Constructor: Get canvas context, handle DPI scaling.
        *   `Camera.js`: Basic camera class (constructor, `applyTransform` with no pan/zoom initially).
        *   `RenderingEngine.clear()`: Implement.
        *   `RenderingEngine.render()`: Implement basic loop structure, call `clear()`, apply camera transform (even if identity).
    *   Integrate `RenderingEngine` into `HatchEngine`'s `_loop()`: Call `renderingEngine.render()`.
    *   Test: `hatch new mygame`, `cd mygame`, `hatch dev`. The canvas should clear each frame.

4.  **Input Management (Initial Pass - Section 5.5)**:
    *   `InputManager.js`, `KeyboardInput.js`, `MouseInput.js`:
        *   `InputManager`: Constructor, basic event listener setup for keyboard (keydown, keyup) and mouse (mousemove, mousedown, mouseup) on the canvas/window.
        *   `KeyboardInput`: `isKeyPressed()`, `isKeyJustPressed()`.
        *   `MouseInput`: `getMousePosition()`, `isMouseButtonPressed()`.
    *   Integrate `InputManager` into `HatchEngine`: Instantiate, call its update method (to handle "just pressed" states) in `_loop()`.
    *   Test: Log input states in `main.js` or a simple test scene.

**Phase 2: Assets, Scenes, and Basic Drawing**

*(Goal: Load and display a sprite, manage basic game states)*

5.  **Asset Management & Sprites (Initial Pass - Section 4.4, 5.6)**:
    *   `AssetManager.js`:
        *   Constructor, `setManifestPath()`, `get()`.
        *   `_loadImage()`: Implement image loading.
        *   `loadAll()`: Basic version to load only images from `asset-manifest.json`.
    *   `Sprite.js`:
        *   Constructor (takes an Image object, x, y, optionally width/height).
        *   `render(context)`: `context.drawImage(...)`.
        *   `getBounds()`: Returns `{x, y, width, height}`.
    *   Update `RenderingEngine.js`:
        *   Implement `createLayer()`, `_sortLayers()`, `addDrawable()`, `removeDrawable()`.
        *   Modify `render()` to iterate through layers and drawables, calling `drawable.render(context)`. Basic viewport culling using `camera.isRectInView()` (implement this in `Camera`).
    *   Test:
        *   Add a sample image to `assets/`.
        *   Create `assets/asset-manifest.json`: `{ "assets": [{ "type": "image", "name": "player", "path": "assets/player.png" }] }`.
        *   In `main.js` (or a test scene later): Load assets, create a `Sprite`, add it to a layer in `RenderingEngine`. See it drawn.

6.  **Scene Management (Section 5.8)**:
    *   `Scene.js`: Base class with lifecycle methods (stubs for now: `load`, `init`, `enter`, `exit`, `update`, `render`, `destroy`).
    *   `SceneManager.js`:
        *   `constructor(engine)`.
        *   `add(name, sceneInstance)`.
        *   `async switchTo(name, ...args)`: Basic version – call `exit` on old, `enter` on new, set current scene.
    *   Integrate `SceneManager` into `HatchEngine`:
        *   `init()`: Load initial scene specified in config.
        *   `_loop()`: Call `currentScene.update(deltaTime)` and `currentScene.render(renderingEngine)`.
    *   Test:
        *   Create a simple `TestScene.js` extending `Scene`.
        *   In `TestScene.render()`, draw the sprite created earlier.
        *   Configure `TestScene` as `initialScene` in `hatch.config.yaml`.

**Phase 3: Grid, Tiles, and Core Gameplay Mechanics**

*(Goal: Implement grid logic and tile rendering)*

7.  **Grid System (`GridManager` - Section 5.2)**:
    *   `GridManager.js`:
        *   Constructor (grid type: 'square'/'hex', dimensions, tileSize).
        *   Implement for **Square Grids first**:
            *   Coordinate conversions (screenToGrid, gridToScreen).
            *   Neighbor finding.
    *   Integrate `GridManager` into `HatchEngine` (or typically, it's used by a game scene).
    *   Test: In `TestScene`, instantiate `GridManager`. Draw a visual grid using `RenderingEngine`'s primitive drawing methods (add these: `drawRect`, `drawLine`). Convert mouse clicks to grid coordinates.

8.  **Tile Management (`TileManager` - Section 5.3)**:
    *   `TileManager.js`:
        *   `defineTileType(name, properties)` (e.g., spriteName, color).
        *   `createTile(typeName, gridX, gridY)`: Creates a tile instance.
        *   `getTile(gridX, gridY)`.
        *   Tiles should be drawable: either they have a `render(context)` method or `TileManager` renders them. For simplicity, let `TileManager` have a `render(context, gridManager, assetManager)` method.
    *   Test: In `TestScene`, define tile types, create some tiles, and render them on the grid. Tiles could initially be colored rectangles, then later use sprites.

9.  **Rendering Engine Enhancements & Camera (Section 5.4)**:
    *   `RenderingEngine.js`: Add convenience drawing primitives (`drawRect`, `drawText`, `drawImage`).
    *   `Camera.js`: Implement pan (`camera.pan(dx, dy)`) and zoom (`camera.zoomAt(point, amount)`).
    *   Test: Add keyboard controls in `TestScene` to pan/zoom the camera.

**Phase 4: Audio, UI, and Remaining Assets**

*(Goal: Add sound, basic UI, and other asset types)*

10. **Audio Management (`AudioManager` - Section 5.9)**:
    *   `AudioManager.js`:
        *   `constructor(engine)`, `init()` (create `AudioContext`).
        *   `setMasterVolume()`.
        *   `playSound(soundName)` (initially plays an `AudioBuffer` associated with `soundName`).
    *   `AssetManager.js`:
        *   `_loadSound()`: Fetch and `decodeAudioData`. Store `AudioBuffer`.
    *   `Sound.js` (Asset Class - Section 5.6): Wrapper for `AudioBuffer` (might be minimal if `AudioManager` handles playback logic directly from named buffers).
    *   Integrate `AudioManager` into `HatchEngine`.
    *   Test: Load a sound, play it on an input event.

11. **Asset Management (Full - Section 4.4, 5.6)**:
    *   `SpriteAtlas.js`:
        *   Constructor (takes atlas image, atlas JSON data).
        *   `getFrame(name)`: Returns `{ x, y, w, h }` for a sprite within the atlas.
    *   `AssetManager.js`:
        *   `_loadAtlas()`: Load image and JSON, create `SpriteAtlas` instance.
        *   `_loadFont()`: Use `FontFace` API.
        *   `_loadJson()`: Fetch and parse JSON.
    *   `Sprite.js` enhancements:
        *   Support for drawing from a `SpriteAtlas` frame.
        *   Basic frame-by-frame animation (e.g., `playAnimation(framesArray, speed)`).
    *   `Font.js` (Asset Class): Wrapper for font name/details for `RenderingEngine`.
    *   Test: Load a sprite atlas, draw sprites from it. Load a custom font, render text with it.

12. **UI Components (Basic Canvas-based - Section 5.7)**:
    *   `UIComponent.js` (Base class).
    *   `Label.js`: Renders text.
    *   `ImageComponent.js`: Renders a sprite/image.
    *   `BasicButton.js`: Clickable area, basic visual states, dispatches click event (via engine's `EventBus`).
    *   `UIManager.js` (Optional for v0.1 core, scenes can manage their own UI components directly, or a very simple manager): To hold UI elements, perhaps manage focus.
    *   Test: Create a main menu scene with a `Label` and a `BasicButton` that transitions to `TestScene`.

**Phase 5: Polish, CLI Build, and Templates**

*(Goal: Finalize core features, CLI build, and deliver basic templates)*

13. **Grid System (`GridManager` - Hexagonal & A* - Section 5.2)**:
    *   Implement Hexagonal grid support in `GridManager`.
    *   Implement basic A* pathfinding (if deemed essential for v0.1, otherwise defer).

14. **Input Management (Touch - Section 5.5)**:
    *   `TouchInput.js`: Implement basic tap detection.
    *   Integrate into `InputManager`.

15. **Memory Pool System (Section 4.2.2)**:
    *   `ObjectPool.js`, `PoolManager.js`: Implement as described.
    *   Identify 1-2 classes for pooling (e.g., `Vector2D` if used, or temporary event objects) and integrate. This can be deferred if v0.1 timeline is tight, but good to have.

16. **CLI Build Process (`hatch build` - Section 6.2.3)**:
    *   Implement `hatch build [--prod]`.
    *   Use `vite build` (which uses Rollup/esbuild) or `esbuild` directly to bundle and minify JS into `dist/`.
    *   Copy `index.html` and `assets/` to `dist/`.

17. **Game Templates (Section 7)**:
    *   **`basic-square` Template**: Flesh this out using the developed engine features. It should be a runnable example.
    *   **`basic-hex` Template**: Create this, demonstrating hexagonal grid usage.
    *   `hatch new <project-name> --template basic-square` should copy the template.
    *   Implement `hatch templates list`.

18. **Documentation & Final CLI**:
    *   Basic JSDoc comments for all public APIs in the engine.
    *   Implement `hatch help [<command>]`.
    *   Refine `hatch.config.yaml` options and parsing.

**General Considerations Throughout v0.1 Development:**

*   **Testing:**
    *   Manual testing via the game templates is key.
    *   Consider simple unit tests for pure functions (e.g., grid calculations, vector math if any).
*   **Error Handling:** Actively use the `ErrorHandler` in all modules.
*   **Performance:** Keep an eye on the performance targets (8.1), but deep optimization is for later versions. Focus on not making obvious performance mistakes.
*   **Browser Compatibility:** Test primarily in one modern browser (e.g., Chrome) during development, then cross-check in others (Firefox, Safari, Edge) towards the end of v0.1.

This phased plan provides a structured approach to building the core essentials of Hatch. Each phase delivers tangible progress and allows for iterative testing and refinement. Good luck!