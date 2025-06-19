/**
 * @file SpriteAtlas.js
 * @description Represents a sprite atlas, typically composed of a texture (image) and a data file (JSON)
 * describing the frames within the texture.
 */

/**
 * @class SpriteAtlas
 * @classdesc Manages data from a sprite atlas, allowing retrieval of frame coordinates and dimensions.
 *
 * @property {import('../core/HatchEngine.js').HatchEngine} engine - Reference to the HatchEngine.
 * @property {object} atlasJsonData - The parsed JSON data describing the atlas frames and meta information.
 * @property {HTMLImageElement|HTMLCanvasElement|ImageBitmap} atlasImage - The image containing all the sprite frames.
 * @property {Map<string, {x: number, y: number, w: number, h: number}>} frames - A map of frame data, keyed by frame name.
 */
export class SpriteAtlas {
    /**
     * Creates an instance of SpriteAtlas.
     * @param {import('../core/HatchEngine.js').HatchEngine} engine - The HatchEngine instance.
     * @param {object} atlasJsonData - The parsed JSON object describing the atlas (e.g., from TexturePacker).
     * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} atlasImage - The atlas image itself.
     */
    constructor(engine, atlasJsonData, atlasImage) {
        if (!engine) throw new Error("SpriteAtlas constructor: engine is required.");
        if (!atlasJsonData) throw new Error("SpriteAtlas constructor: atlasJsonData is required.");
        if (!atlasImage) throw new Error("SpriteAtlas constructor: atlasImage is required.");

        this.engine = engine;
        this.atlasJsonData = atlasJsonData;
        this.atlasImage = atlasImage;
        this.frames = new Map();

        this._parseAtlasData();
    }

    /**
     * Parses the atlas JSON data to populate the frames map.
     * Supports common formats like TexturePacker JSON Array/Hash.
     * @private
     */
    _parseAtlasData() {
        // TexturePacker JSON Array format
        if (this.atlasJsonData.frames && Array.isArray(this.atlasJsonData.frames)) {
            for (const frame of this.atlasJsonData.frames) {
                if (frame.filename && frame.frame) {
                    this.frames.set(frame.filename, {
                        x: frame.frame.x,
                        y: frame.frame.y,
                        w: frame.frame.w,
                        h: frame.frame.h,
                        // Store other properties if needed: rotated, trimmed, sourceSize, spriteSourceSize
                        rotated: !!frame.rotated,
                        trimmed: !!frame.trimmed,
                        sourceSize: frame.sourceSize ? { w: frame.sourceSize.w, h: frame.sourceSize.h } : { w: frame.frame.w, h: frame.frame.h },
                        spriteSourceSize: frame.spriteSourceSize ? { x: frame.spriteSourceSize.x, y: frame.spriteSourceSize.y, w: frame.spriteSourceSize.w, h: frame.spriteSourceSize.h } : { x:0, y:0, w: frame.frame.w, h: frame.frame.h },
                    });
                }
            }
        }
        // TexturePacker JSON Hash format
        else if (this.atlasJsonData.frames && typeof this.atlasJsonData.frames === 'object') {
            for (const filename in this.atlasJsonData.frames) {
                const frame = this.atlasJsonData.frames[filename];
                if (frame.frame) {
                     this.frames.set(filename, {
                        x: frame.frame.x,
                        y: frame.frame.y,
                        w: frame.frame.w,
                        h: frame.frame.h,
                        rotated: !!frame.rotated,
                        trimmed: !!frame.trimmed,
                        sourceSize: frame.sourceSize ? { w: frame.sourceSize.w, h: frame.sourceSize.h } : { w: frame.frame.w, h: frame.frame.h },
                        spriteSourceSize: frame.spriteSourceSize ? { x: frame.spriteSourceSize.x, y: frame.spriteSourceSize.y, w: frame.spriteSourceSize.w, h: frame.spriteSourceSize.h } : { x:0, y:0, w: frame.frame.w, h: frame.frame.h },
                    });
                }
            }
        } else {
            this.engine.errorHandler.error("SpriteAtlas: Could not parse atlas data. 'frames' property not found or in unsupported format.", { component: 'SpriteAtlas' });
        }
        this.engine.errorHandler.info(`SpriteAtlas parsed: ${this.frames.size} frames loaded.`, { component: 'SpriteAtlas'});
    }

    /**
     * Retrieves the frame data (x, y, width, height) for a given frame name.
     * @param {string} frameName - The name of the frame (often the original filename of the sprite).
     * @returns {{x: number, y: number, w: number, h: number, rotated: boolean, trimmed: boolean, sourceSize: {w:number,h:number}, spriteSourceSize: {x:number,y:number,w:number,h:number}} | undefined}
     *          The frame data object, or undefined if the frame name is not found.
     */
    getFrameData(frameName) {
        return this.frames.get(frameName);
    }
}
