/**
 * @file AudioManager.js
 * @description Manages audio playback for sound effects and music using HTMLAudioElement.
 */

/**
 * @class AudioManager
 * @classdesc Handles loading (via AssetManager), managing, and playing audio.
 *
 * @property {import('../core/HatchEngine.js').default} engine - Reference to the HatchEngine instance.
 * @property {Map<string, HTMLAudioElement>} sounds - Stores defined sound effects.
 * @property {Map<string, HTMLAudioElement>} musicTracks - Stores defined music tracks.
 * @property {HTMLAudioElement | null} currentMusicTrack - The currently playing music track element.
 * @property {number} globalSfxVolume - Global volume multiplier for sound effects (0.0 to 1.0).
 * @property {number} globalMusicVolume - Global volume multiplier for music (0.0 to 1.0).
 * @property {number} masterVolume - Master volume multiplier for all audio (0.0 to 1.0).
 */
class AudioManager {
    /**
     * Creates an instance of AudioManager.
     * @param {import('../core/HatchEngine.js').default} engine - The HatchEngine instance.
     */
    constructor(engine) {
        if (!engine) {
            throw new Error("AudioManager constructor: HatchEngine instance is required.");
        }
        /** @type {import('../core/HatchEngine.js').default} */
        this.engine = engine;
        /** @type {Map<string, HTMLAudioElement>} */
        this.sounds = new Map();
        /** @type {Map<string, HTMLAudioElement>} */
        this.musicTracks = new Map();

        /** @type {HTMLAudioElement | null} */
        this.currentMusicTrack = null;
        /** @type {string | null} */
        this.currentMusicName = null; // To store the name of the current music

        this.globalSfxVolume = 1.0;
        this.globalMusicVolume = 1.0;
        this.masterVolume = 1.0;

        if (this.engine.errorHandler) {
            this.engine.errorHandler.info("AudioManager Initialized.", { component: "AudioManager" });
        } else {
            console.info("AudioManager Initialized (errorHandler not available).")
        }
    }

    /**
     * Defines a sound effect by associating a name with a pre-loaded audio asset.
     * @param {string} name - The unique name to identify this sound effect.
     * @param {string} assetName - The name of the audio asset in the AssetManager.
     * @returns {boolean} True if defined successfully, false otherwise.
     */
    defineSound(name, assetName) {
        if (!this.engine.assetManager) {
            this.engine.errorHandler.error("AudioManager.defineSound: AssetManager is not available.", { name, assetName, component: "AudioManager" });
            return false;
        }
        const audioAsset = this.engine.assetManager.get(assetName);
        if (!audioAsset || !(audioAsset instanceof HTMLAudioElement)) {
            this.engine.errorHandler.warn(`AudioManager.defineSound: Audio asset '${assetName}' not found or not an HTMLAudioElement.`, { name, assetName, component: "AudioManager" });
            return false;
        }
        this.sounds.set(name, audioAsset);
        this.engine.errorHandler.info(`AudioManager.defineSound: Sound '${name}' defined with asset '${assetName}'.`, { name, assetName, component: "AudioManager" });
        return true;
    }

    /**
     * Defines a music track by associating a name with a pre-loaded audio asset.
     * @param {string} name - The unique name to identify this music track.
     * @param {string} assetName - The name of the audio asset in the AssetManager.
     * @returns {boolean} True if defined successfully, false otherwise.
     */
    defineMusic(name, assetName) {
        if (!this.engine.assetManager) {
            this.engine.errorHandler.error("AudioManager.defineMusic: AssetManager is not available.", { name, assetName, component: "AudioManager" });
            return false;
        }
        const audioAsset = this.engine.assetManager.get(assetName);
        if (!audioAsset || !(audioAsset instanceof HTMLAudioElement)) {
            this.engine.errorHandler.warn(`AudioManager.defineMusic: Audio asset '${assetName}' not found or not an HTMLAudioElement.`, { name, assetName, component: "AudioManager" });
            return false;
        }
        this.musicTracks.set(name, audioAsset);
        this.engine.errorHandler.info(`AudioManager.defineMusic: Music '${name}' defined with asset '${assetName}'.`, { name, assetName, component: "AudioManager" });
        return true;
    }

    /**
     * Plays a sound effect.
     * @param {string} name - The name of the sound effect to play.
     * @param {boolean} [loop=false] - Whether the sound should loop.
     * @param {number} [volume=1.0] - Specific volume for this sound instance (0.0 to 1.0), combined with global SFX and master volumes.
     * @returns {HTMLAudioElement | null} The created Audio element for this sound instance, or null if the sound is not found.
     */
    playSound(name, loop = false, volume = 1.0) {
        const originalAudioElement = this.sounds.get(name);
        if (!originalAudioElement) {
            this.engine.errorHandler.warn(`AudioManager.playSound: Sound '${name}' not found.`, { name, component: "AudioManager" });
            return null;
        }

        // Create a new Audio object from the original to allow overlapping playback
        const audio = new Audio();
        audio.src = originalAudioElement.src; // This is key for playing multiple instances

        audio.loop = loop;
        audio.volume = Math.max(0, Math.min(1, volume * this.globalSfxVolume * this.masterVolume));

        audio.play().catch(e => {
            // Common error: User hasn't interacted with the page yet.
            // Browsers often block autoplay until a user gesture.
            this.engine.errorHandler.warn(`AudioManager.playSound: Error playing sound '${name}'. May require user interaction.`, { name, originalError: e, component: "AudioManager" });
        });

        return audio;
    }

    /**
     * Sets the global volume for sound effects.
     * @param {number} volume - The volume level (0.0 to 1.0).
     */
    setSfxVolume(volume) {
        this.globalSfxVolume = Math.max(0, Math.min(1, volume));
        this.engine.errorHandler.info(`AudioManager.setSfxVolume: Global SFX volume set to ${this.globalSfxVolume}.`, { volume: this.globalSfxVolume, component: "AudioManager" });
        // Note: This does not affect already playing sounds that were cloned.
        // To affect them, they would need to be tracked and updated, which adds complexity.
    }

    /**
     * Sets the master volume for all audio.
     * Updates the volume of the currently playing music track.
     * @param {number} volume - The master volume level (0.0 to 1.0).
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.engine.errorHandler.info(`AudioManager.setMasterVolume: Master volume set to ${this.masterVolume}.`, { volume: this.masterVolume, component: "AudioManager" });

        // Update current music volume
        if (this.currentMusicTrack && this.currentMusicName) {
            const musicData = this.musicTracks.get(this.currentMusicName);
            if (musicData) { // musicData here is the original element, currentMusicTrack is the playing one
                 // We need to know the individual volume set when playMusic was called.
                 // This requires storing that individual volume or recalculating based on currentMusicTrack.volume
                 // For simplicity, let's assume currentMusicTrack.volume was set considering its individual volume * global * master.
                 // So, to adjust for a new master, we need the original individual * global part.
                 // This gets complex. A simpler approach for now:
                 // Re-apply volume based on its original intended individual volume, new globalMusicVolume, and new masterVolume.
                 // This implies playMusic needs to store the 'individualVolume' parameter.
                 // For now, let's assume currentMusicTrack's volume was set based on its 'base' volume (passed to playMusic)
                 // and the THEN current global/master. We need to re-calculate.
                 // Let's assume playMusic stored the 'base' volume on the element, e.g., musicTrack._baseVolume
                if (typeof this.currentMusicTrack._baseVolume === 'number') {
                     this.currentMusicTrack.volume = Math.max(0, Math.min(1, this.currentMusicTrack._baseVolume * this.globalMusicVolume * this.masterVolume));
                }
            }
        }
        // Note: This does not affect already playing SFX that were cloned.
    }

    // --- Music Playback Methods (to be implemented next) ---

    /**
     * Plays a music track. Stops any currently playing music.
     * @param {string} name - The name of the music track to play.
     * @param {boolean} [loop=true] - Whether the music should loop.
     * @param {number} [volume=1.0] - Specific volume for this music track (0.0 to 1.0).
     * @param {number} [crossfadeDuration=0] - Duration in seconds for crossfading. (Fade out current, fade in new).
     *                                         Currently, only fade out of old track is basic. True crossfade is complex.
     * @returns {HTMLAudioElement | null} The Audio element for the music track, or null if not found/error.
     */
    playMusic(name, loop = true, volume = 1.0, crossfadeDuration = 0) {
        const musicAsset = this.musicTracks.get(name);
        if (!musicAsset) {
            this.engine.errorHandler.warn(`AudioManager.playMusic: Music track '${name}' not found.`, { name, component: "AudioManager" });
            return null;
        }

        if (this.currentMusicTrack && this.currentMusicName !== name) {
            this.stopMusic(crossfadeDuration > 0 ? crossfadeDuration / 2 : 0); // Basic fade out for old track
        } else if (this.currentMusicTrack && this.currentMusicName === name) {
            // If it's the same track, just ensure volume/loop are updated and it's playing.
            this.currentMusicTrack.loop = loop;
            this.currentMusicTrack._baseVolume = volume; // Store base volume for adjustments
            this.currentMusicTrack.volume = Math.max(0, Math.min(1, volume * this.globalMusicVolume * this.masterVolume));
            if (this.currentMusicTrack.paused) {
                this.currentMusicTrack.play().catch(e => this.engine.errorHandler.warn(`AudioManager.playMusic: Error restarting music '${name}'.`, { name, originalError: e, component: "AudioManager" }));
            }
            return this.currentMusicTrack;
        }

        // If crossfadeDuration > 0, the new track should ideally start after old one fades.
        // This needs more complex timing logic. For now, new track starts after a delay if crossfading.
        const startDelay = (this.currentMusicTrack && crossfadeDuration > 0) ? (crossfadeDuration / 2) * 1000 : 0;

        setTimeout(() => {
            // Stop any remnants of old music if it wasn't the one we just called stopMusic on
            if (this.currentMusicTrack && this.currentMusicName !== name) {
                 this.currentMusicTrack.pause(); // Ensure it's stopped if stopMusic's fade wasn't fully handled or different track
            }

            this.currentMusicTrack = new Audio(); // Music is usually not stacked, so we can reuse a single element or create new
            this.currentMusicTrack.src = musicAsset.src;
            this.currentMusicTrack.loop = loop;
            this.currentMusicTrack._baseVolume = volume; // Store base volume for adjustments
            this.currentMusicTrack.volume = Math.max(0, Math.min(1, volume * this.globalMusicVolume * this.masterVolume));

            this.currentMusicTrack.play().then(() => {
                this.currentMusicName = name;
                this.engine.errorHandler.info(`AudioManager.playMusic: Playing music '${name}'.`, { name, component: "AudioManager" });
            }).catch(e => {
                this.engine.errorHandler.warn(`AudioManager.playMusic: Error playing music '${name}'.`, { name, originalError: e, component: "AudioManager" });
                this.currentMusicTrack = null; // Reset if play failed
                this.currentMusicName = null;
            });
        }, startDelay);

        return this.currentMusicTrack; // This returns the new Audio object almost immediately.
    }

    /**
     * Stops the currently playing music track.
     * @param {number} [fadeOutDuration=0] - Duration in seconds for fading out. 0 for immediate stop.
     */
    stopMusic(fadeOutDuration = 0) {
        if (!this.currentMusicTrack) {
            return;
        }
        const trackToStop = this.currentMusicTrack;
        const initialVolume = trackToStop.volume;
        this.currentMusicTrack = null;
        this.currentMusicName = null;

        if (fadeOutDuration > 0 && initialVolume > 0) {
            const fadeSteps = 20; // Number of steps in the fade
            const fadeInterval = fadeOutDuration * 1000 / fadeSteps;
            let currentStep = 0;

            const fade = () => {
                currentStep++;
                const newVolume = initialVolume * (1 - (currentStep / fadeSteps));
                if (newVolume <= 0.01) {
                    trackToStop.volume = 0;
                    trackToStop.pause();
                    trackToStop.currentTime = 0; // Reset for next play
                    this.engine.errorHandler.info(`AudioManager.stopMusic: Music faded out and stopped.`, { component: "AudioManager" });
                } else {
                    trackToStop.volume = newVolume;
                    setTimeout(fade, fadeInterval);
                }
            };
            setTimeout(fade, fadeInterval);
        } else {
            trackToStop.pause();
            trackToStop.currentTime = 0; // Reset for next play
            this.engine.errorHandler.info(`AudioManager.stopMusic: Music stopped immediately.`, { component: "AudioManager" });
        }
    }

    /**
     * Sets the global volume for music tracks.
     * Updates the volume of the currently playing music track.
     * @param {number} volume - The volume level (0.0 to 1.0).
     */
    setMusicVolume(volume) {
        this.globalMusicVolume = Math.max(0, Math.min(1, volume));
        this.engine.errorHandler.info(`AudioManager.setMusicVolume: Global music volume set to ${this.globalMusicVolume}.`, { volume: this.globalMusicVolume, component: "AudioManager" });
        if (this.currentMusicTrack && typeof this.currentMusicTrack._baseVolume === 'number') {
            this.currentMusicTrack.volume = Math.max(0, Math.min(1, this.currentMusicTrack._baseVolume * this.globalMusicVolume * this.masterVolume));
        }
    }
}

export default AudioManager;
