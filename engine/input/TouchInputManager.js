/**
 * @file TouchInputManager.js
 * @description Touch input handling and gesture recognition for mobile devices.
 * Provides tap, swipe, pinch, and rotation gesture detection.
 */

import { getLogger } from '../core/Logger.js';

export class TouchInputManager {
    constructor(canvas, eventBus) {
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.logger = getLogger('TouchInput');
        
        // Touch tracking
        this.touches = new Map();
        this.maxTouches = 10;
        
        // Gesture configuration
        this.gestureConfig = {
            tapThreshold: 300,        // ms
            doubleTapThreshold: 500,  // ms
            moveThreshold: 10,        // pixels
            swipeThreshold: 100,      // pixels
            swipeVelocityThreshold: 0.5, // pixels/ms
            pinchThreshold: 10,       // pixels
            rotationThreshold: 0.1    // radians
        };
        
        // Gesture state
        this.gestureState = {
            isPinching: false,
            isRotating: false,
            lastPinchDistance: 0,
            lastRotation: 0,
            startPinchDistance: 0,
            startRotation: 0
        };
        
        // Tap detection
        this.lastTapTime = 0;
        this.tapCount = 0;
        
        this.setupEventListeners();
        this.logger.info('TouchInputManager initialized');
    }

    setupEventListeners() {
        if (!this.canvas) {
            this.logger.warn('No canvas provided for touch input');
            return;
        }

        // Prevent default touch behaviors
        this.canvas.style.touchAction = 'none';
        
        // Bind event handlers
        this.onTouchStart = this.handleTouchStart.bind(this);
        this.onTouchMove = this.handleTouchMove.bind(this);
        this.onTouchEnd = this.handleTouchEnd.bind(this);
        this.onTouchCancel = this.handleTouchCancel.bind(this);
        
        // Add event listeners
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.onTouchCancel, { passive: false });
        
        this.logger.debug('Touch event listeners attached');
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        const now = performance.now();
        
        // Process each new touch
        for (const touch of event.changedTouches) {
            if (this.touches.size >= this.maxTouches) {
                this.logger.warn('Maximum touch limit reached');
                break;
            }
            
            const touchData = {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: now,
                lastMoveTime: now,
                moved: false,
                velocityX: 0,
                velocityY: 0
            };
            
            this.touches.set(touch.identifier, touchData);
        }

        // Emit touch start event
        this.emitTouchEvent('touch:start', {
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });

        // Handle multi-touch gestures
        if (this.touches.size === 2) {
            this.initializeGestures();
        }
        
        this.logger.debug(`Touch start: ${this.touches.size} active touches`);
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        const now = performance.now();
        
        // Update touch positions and calculate velocity
        for (const touch of event.changedTouches) {
            const touchData = this.touches.get(touch.identifier);
            if (!touchData) continue;

            // Calculate movement
            const deltaX = touch.clientX - touchData.currentX;
            const deltaY = touch.clientY - touchData.currentY;
            const totalDelta = Math.sqrt(
                Math.pow(touch.clientX - touchData.startX, 2) + 
                Math.pow(touch.clientY - touchData.startY, 2)
            );

            // Calculate velocity
            const timeDelta = now - touchData.lastMoveTime;
            if (timeDelta > 0) {
                touchData.velocityX = deltaX / timeDelta;
                touchData.velocityY = deltaY / timeDelta;
            }

            // Update position
            touchData.currentX = touch.clientX;
            touchData.currentY = touch.clientY;
            touchData.lastMoveTime = now;
            
            // Mark as moved if beyond threshold
            if (totalDelta > this.gestureConfig.moveThreshold) {
                touchData.moved = true;
            }

            // Emit move event
            this.emitTouchEvent('touch:move', {
                touchId: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                deltaX,
                deltaY,
                velocityX: touchData.velocityX,
                velocityY: touchData.velocityY,
                touches: Array.from(this.touches.values()),
                originalEvent: event
            });
        }

        // Handle multi-touch gestures
        if (this.touches.size === 2) {
            this.updateGestures();
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        
        const now = performance.now();
        
        // Process ended touches
        for (const touch of event.changedTouches) {
            const touchData = this.touches.get(touch.identifier);
            if (!touchData) continue;

            // Check for tap
            if (!touchData.moved && (now - touchData.startTime) < this.gestureConfig.tapThreshold) {
                this.handleTap(touchData, now);
            }

            // Check for swipe
            if (touchData.moved) {
                this.checkForSwipe(touchData);
            }

            this.touches.delete(touch.identifier);
        }

        // Emit touch end event
        this.emitTouchEvent('touch:end', {
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });

        // Reset gesture state if no touches remain
        if (this.touches.size < 2) {
            this.resetGestureState();
        }
        
        this.logger.debug(`Touch end: ${this.touches.size} active touches`);
    }

    handleTouchCancel(event) {
        event.preventDefault();
        
        // Remove all cancelled touches
        for (const touch of event.changedTouches) {
            this.touches.delete(touch.identifier);
        }

        this.emitTouchEvent('touch:cancel', {
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });

        this.resetGestureState();
        this.logger.debug('Touch cancelled');
    }

    handleTap(touchData, currentTime) {
        const timeSinceLastTap = currentTime - this.lastTapTime;
        
        if (timeSinceLastTap < this.gestureConfig.doubleTapThreshold) {
            this.tapCount++;
        } else {
            this.tapCount = 1;
        }
        
        if (this.tapCount === 1) {
            // Single tap
            setTimeout(() => {
                if (this.tapCount === 1) {
                    this.emitTouchEvent('touch:tap', {
                        x: touchData.currentX,
                        y: touchData.currentY,
                        touch: touchData
                    });
                }
            }, this.gestureConfig.doubleTapThreshold);
        } else if (this.tapCount === 2) {
            // Double tap
            this.emitTouchEvent('touch:doubletap', {
                x: touchData.currentX,
                y: touchData.currentY,
                touch: touchData
            });
            this.tapCount = 0;
        }
        
        this.lastTapTime = currentTime;
    }

    checkForSwipe(touchData) {
        const deltaX = touchData.currentX - touchData.startX;
        const deltaY = touchData.currentY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < this.gestureConfig.swipeThreshold) return;
        
        const duration = touchData.lastMoveTime - touchData.startTime;
        const velocity = distance / duration;
        
        if (velocity < this.gestureConfig.swipeVelocityThreshold) return;
        
        // Determine swipe direction
        const angle = Math.atan2(deltaY, deltaX);
        let direction;
        
        if (Math.abs(angle) < Math.PI / 4) {
            direction = 'right';
        } else if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) {
            direction = 'down';
        } else if (Math.abs(angle) > 3 * Math.PI / 4) {
            direction = 'left';
        } else {
            direction = 'up';
        }
        
        this.emitTouchEvent('touch:swipe', {
            direction,
            distance,
            velocity,
            deltaX,
            deltaY,
            touch: touchData
        });
    }

    initializeGestures() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;

        const [touch1, touch2] = touches;
        
        // Initialize pinch gesture
        this.gestureState.startPinchDistance = this.getDistance(touch1, touch2);
        this.gestureState.lastPinchDistance = this.gestureState.startPinchDistance;
        this.gestureState.isPinching = true;
        
        // Initialize rotation gesture
        this.gestureState.startRotation = this.getAngle(touch1, touch2);
        this.gestureState.lastRotation = this.gestureState.startRotation;
        this.gestureState.isRotating = true;
        
        this.logger.debug('Initialized multi-touch gestures');
    }

    updateGestures() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;

        const [touch1, touch2] = touches;
        
        // Update pinch gesture
        if (this.gestureState.isPinching) {
            const currentDistance = this.getDistance(touch1, touch2);
            const scale = currentDistance / this.gestureState.lastPinchDistance;
            const totalScale = currentDistance / this.gestureState.startPinchDistance;
            
            if (Math.abs(currentDistance - this.gestureState.lastPinchDistance) > this.gestureConfig.pinchThreshold) {
                this.emitTouchEvent('touch:pinch', {
                    scale,
                    totalScale,
                    distance: currentDistance,
                    centerX: (touch1.currentX + touch2.currentX) / 2,
                    centerY: (touch1.currentY + touch2.currentY) / 2
                });
                
                this.gestureState.lastPinchDistance = currentDistance;
            }
        }

        // Update rotation gesture
        if (this.gestureState.isRotating) {
            const currentRotation = this.getAngle(touch1, touch2);
            const rotationDelta = currentRotation - this.gestureState.lastRotation;
            const totalRotation = currentRotation - this.gestureState.startRotation;
            
            if (Math.abs(rotationDelta) > this.gestureConfig.rotationThreshold) {
                this.emitTouchEvent('touch:rotate', {
                    rotation: rotationDelta,
                    totalRotation,
                    angle: currentRotation,
                    centerX: (touch1.currentX + touch2.currentX) / 2,
                    centerY: (touch1.currentY + touch2.currentY) / 2
                });
                
                this.gestureState.lastRotation = currentRotation;
            }
        }
    }

    resetGestureState() {
        this.gestureState = {
            isPinching: false,
            isRotating: false,
            lastPinchDistance: 0,
            lastRotation: 0,
            startPinchDistance: 0,
            startRotation: 0
        };
    }

    getDistance(touch1, touch2) {
        const dx = touch2.currentX - touch1.currentX;
        const dy = touch2.currentY - touch1.currentY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAngle(touch1, touch2) {
        const dx = touch2.currentX - touch1.currentX;
        const dy = touch2.currentY - touch1.currentY;
        return Math.atan2(dy, dx);
    }

    emitTouchEvent(eventName, data) {
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit(eventName, data);
        }
    }

    // Configuration methods
    setGestureThreshold(type, value) {
        if (this.gestureConfig.hasOwnProperty(type)) {
            this.gestureConfig[type] = value;
            this.logger.debug(`Set ${type} threshold to ${value}`);
        }
    }

    getTouchCount() {
        return this.touches.size;
    }

    getActiveTouches() {
        return Array.from(this.touches.values());
    }

    getTouchById(id) {
        return this.touches.get(id);
    }

    destroy() {
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.onTouchStart);
            this.canvas.removeEventListener('touchmove', this.onTouchMove);
            this.canvas.removeEventListener('touchend', this.onTouchEnd);
            this.canvas.removeEventListener('touchcancel', this.onTouchCancel);
        }
        
        this.touches.clear();
        this.resetGestureState();
        
        this.logger.info('TouchInputManager destroyed');
    }
}
