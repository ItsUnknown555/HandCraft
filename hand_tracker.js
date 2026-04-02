class HandTracker {
    constructor(options = {}) {
        this.options = {
            maxHands: options.maxHands || 1,
            modelComplexity: options.modelComplexity || 1,
            minDetectionConfidence: options.minDetectionConfidence || 0.7,
            minTrackingConfidence: options.minTrackingConfidence || 0.5,
            ...options
        };

        this.hands = null;
        this.isRunning = false;
        this.lastHandData = null;
        this.onHandDetected = options.onHandDetected || (() => {});
        this.onHandLost = options.onHandLost || (() => {});
    }

    async initialize() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: this.options.maxHands,
            modelComplexity: this.options.modelComplexity,
            minDetectionConfidence: this.options.minDetectionConfidence,
            minTrackingConfidence: this.options.minTrackingConfidence
        });

        this.hands.onResults((results) => this.handleResults(results));

        return this;
    }

    async setSource(mediaSource) {
        this.camera = new Camera(mediaSource, {
            onFrame: async () => {
                if (this.isRunning && this.hands) {
                    await this.hands.send({ image: mediaSource });
                }
            },
            width: this.options.width || 640,
            height: this.options.height || 480
        });

        return this.camera.start();
    }

    start() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    handleResults(results) {
        const canvas = document.getElementById('mediapipe-canvas');
        const ctx = canvas?.getContext('2d');

        if (canvas && ctx && results.image) {
            canvas.width = results.image.videoWidth || 640;
            canvas.height = results.image.videoHeight || 480;
            
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                this.drawHandLandmarks(ctx, results.multiHandLandmarks[0], canvas.width, canvas.height);
            }
            
            ctx.restore();
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const handData = this.processHandLandmarks(
                results.multiHandLandmarks[0],
                results.image?.videoWidth || 640,
                results.image?.videoHeight || 480
            );
            this.lastHandData = handData;
            this.onHandDetected(handData);
        } else {
            this.lastHandData = null;
            this.onHandLost();
        }
    }

    drawHandLandmarks(ctx, landmarks, width, height) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];

        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 2;

        connections.forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
        });

        landmarks.forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point.x * width, point.y * height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = i === 0 ? '#00ccff' : '#00ff88';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    processHandLandmarks(landmarks, width, height) {
        const palm = landmarks[0];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        const pinchDistance = this.calculateDistance(thumbTip, indexTip);
        const isPinching = pinchDistance < (this.options.pinchThreshold || 0.05);

        const isPeaceGesture = 
            this.calculateDistance(indexTip, middleTip) < 0.03 &&
            this.calculateDistance(middleTip, ringTip) < 0.03 &&
            this.calculateDistance(ringTip, pinkyTip) > 0.05;

        const palmCenter = {
            x: palm.x,
            y: palm.y,
            z: palm.z || 0
        };

        const direction = this.calculateDirection(landmarks);

        return {
            landmarks: landmarks,
            palm: palmCenter,
            pinch: {
                distance: pinchDistance,
                isPinching: isPinching,
                thumbTip: { x: thumbTip.x, y: thumbTip.y },
                indexTip: { x: indexTip.x, y: indexTip.y }
            },
            gestures: {
                isPeaceGesture: isPeaceGesture
            },
            direction: direction,
            screenPosition: {
                x: (palm.x - 0.5) * 2,
                y: -(palm.y - 0.5) * 2,
                normalizedX: palm.x,
                normalizedY: palm.y
            },
            timestamp: Date.now()
        };
    }

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    calculateDirection(landmarks) {
        const wrist = landmarks[0];
        const middleFingerBase = landmarks[9];
        
        return {
            x: middleFingerBase.x - wrist.x,
            y: middleFingerBase.y - wrist.y,
            angle: Math.atan2(middleFingerBase.y - wrist.y, middleFingerBase.x - wrist.x)
        };
    }

    getLastHandData() {
        return this.lastHandData;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandTracker;
}