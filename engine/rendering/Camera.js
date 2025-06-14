/**
 * @file Camera.js
 * @description Defines a 2D camera for managing the viewport in the game world.
 * The camera handles position (pan) and zoom, and applies transformations
 * to the rendering context to reflect its view. It also provides utilities
 * for converting coordinates between screen space and world space.
 */

/**
 * @class Camera
 * @classdesc Represents a 2D camera that controls the view of the game world.
 * It allows for panning (changing x, y coordinates) and zooming.
 *
 * @property {number} x - The world x-coordinate the camera is centered on.
 * @property {number} y - The world y-coordinate the camera is centered on.
 * @property {number} zoom - The zoom level of the camera. 1 is normal zoom, >1 zooms in, <1 zooms out.
 * @property {number} viewportWidth - The width of the camera's viewport (typically canvas logical width).
 * @property {number} viewportHeight - The height of the camera's viewport (typically canvas logical height).
 */
class Camera {
    /**
     * Creates an instance of Camera.
     * @param {number} viewportWidth - The width of the viewport (e.g., canvas.width).
     *                                 This is the logical width, not necessarily the styled CSS width.
     * @param {number} viewportHeight - The height of the viewport (e.g., canvas.height).
     *                                  This is the logical height.
     */
    constructor(viewportWidth, viewportHeight) {
        /** @type {number} World x-coordinate of the camera's center. */
        this.x = 0;
        /** @type {number} World y-coordinate of the camera's center. */
        this.y = 0;
        /** @type {number} Zoom level. Must be positive. Defaults to 1. */
        this.zoom = 1;

        /** @type {number} Width of the camera's viewport. */
        this.viewportWidth = viewportWidth;
        /** @type {number} Height of the camera's viewport. */
        this.viewportHeight = viewportHeight;
    }

    /**
     * Applies the camera's transformation to the given 2D rendering context.
     * This involves translating the context to position the camera's view
     * and scaling it according to the camera's zoom level.
     * The transformation sequence is:
     * 1. Translate to the center of the viewport.
     * 2. Scale by the zoom level.
     * 3. Translate by the negative of the camera's world position.
     * This makes `(camera.x, camera.y)` in world space appear at the center of the screen.
     *
     * @param {CanvasRenderingContext2D} ctx - The rendering context to transform.
     */
    applyTransform(ctx) {
        ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
        // Ensure zoom is positive before scaling to prevent errors or inverted rendering
        const currentZoom = this.zoom <= 0 ? 0.01 : this.zoom; // Prevent zero or negative zoom
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Converts world coordinates (coordinates within the game world) to screen coordinates
     * (pixels on the canvas, with (0,0) at the top-left of the canvas).
     *
     * @param {number} worldX - The x-coordinate in world space.
     * @param {number} worldY - The y-coordinate in world space.
     * @returns {{x: number, y: number}} The corresponding screen coordinates.
     */
    worldToScreen(worldX, worldY) {
        let screenX = worldX - this.x; // World relative to camera center
        let screenY = worldY - this.y;

        screenX *= this.zoom; // Apply zoom
        screenY *= this.zoom;

        screenX += this.viewportWidth / 2; // Translate to screen origin (top-left of viewport)
        screenY += this.viewportHeight / 2;

        return { x: screenX, y: screenY };
    }

    /**
     * Converts screen coordinates (pixels on the canvas, (0,0) at top-left) to world coordinates
     * (coordinates within the game world).
     *
     * @param {number} screenX - The x-coordinate on the screen.
     * @param {number} screenY - The y-coordinate on the screen.
     * @returns {{x: number, y: number}} The corresponding world coordinates.
     */
    screenToWorld(screenX, screenY) {
        let worldX = screenX - this.viewportWidth / 2; // Screen relative to viewport center
        let worldY = screenY - this.viewportHeight / 2;

        // Ensure zoom is not zero to prevent division by zero errors
        const currentZoom = this.zoom === 0 ? 1 : this.zoom; // Treat 0 zoom as 1 for inversion
        worldX /= currentZoom; // Un-apply zoom
        worldY /= currentZoom;

        worldX += this.x; // Add camera world position
        worldY += this.y;

        return { x: worldX, y: worldY };
    }

    /**
     * Checks if a rectangle (defined in world coordinates) is potentially within the camera's view.
     * This is a basic Axis-Aligned Bounding Box (AABB) check and does not perform perfect culling
     * for rotated objects or more complex shapes. It's a placeholder for more advanced culling.
     *
     * @param {Object} rect - An object representing the rectangle.
     * @param {number} rect.x - The world x-coordinate of the rectangle's top-left corner.
     * @param {number} rect.y - The world y-coordinate of the rectangle's top-left corner.
     * @param {number} rect.width - The width of the rectangle.
     * @param {number} rect.height - The height of the rectangle.
     * @returns {boolean} True if the rectangle is (or might be) in view, false otherwise.
     *                    Currently, always returns true as it's a placeholder.
     */
    isRectInView({ x, y, width, height }) {
        // More accurate culling (still AABB):
        const currentZoom = this.zoom <= 0 ? 0.01 : this.zoom; // Prevent zero or negative zoom
        const viewHalfWidth = (this.viewportWidth / 2) / currentZoom;
        const viewHalfHeight = (this.viewportHeight / 2) / currentZoom;
        const viewLeft = this.x - viewHalfWidth;
        const viewRight = this.x + viewHalfWidth;
        const viewTop = this.y - viewHalfHeight;
        const viewBottom = this.y + viewHalfHeight;

        const rectRight = x + width;
        const rectBottom = y + height;

        // Check for non-overlap
        if (rectRight < viewLeft || x > viewRight || rectBottom < viewTop || y > viewBottom) {
            return false; // Definitely not in view
        }
        return true; // Potentially in view
    }

    // --- Potential future enhancements ---
    /**
     * Moves the camera's center to the specified world coordinates.
     * @param {number} x - The target world x-coordinate.
     * @param {number} y - The target world y-coordinate.
     */
    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Sets the camera's zoom level.
     * @param {number} zoomLevel - The new zoom level. Must be a positive number.
     */
    setZoom(zoomLevel) {
        if (zoomLevel > 0) {
            this.zoom = zoomLevel;
        } else {
            console.warn("Camera.setZoom: Zoom level must be positive.");
        }
    }

    // smoothZoom(targetZoom, duration) { /* ... */ }
    // smoothMoveTo(targetX, targetY, duration) { /* ... */ }
    // followTarget(gameObject) { /* ... update x,y to follow gameObject ... */ }
}

export default Camera;
