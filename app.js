class HandTrackingApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.handTracker = null;
        this.voxelManager = null;
        
        this.state = {
            isInitialized: false,
            isTracking: false,
            isPinching: false,
            lastPinchState: false,
            handPresent: false,
            pinchThreshold: 0.05,
            flipCamera: true
        };

        this.fps = {
            frames: 0,
            lastTime: Date.now(),
            current: 0
        };

        this.init();
    }

    async init() {
        this.showLoading(true);
        
        try {
        this.initThreeJS();
        this.initHandTracker();
        this.initEventListeners();
        
        this.state.isInitialized = true;
            this.showToast('Application initialized. Click "Start Camera" to begin.');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error initializing application: ' + error.message);
        }
        
        this.showLoading(false);
    }

    initThreeJS() {
        const container = document.querySelector('.video-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.z = 3;

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        const threeCanvas = document.getElementById('three-canvas');
        threeCanvas.parentNode.insertBefore(this.renderer.domElement, threeCanvas);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x00ff88, 0.5, 10);
        pointLight.position.set(0, 0, 2);
        this.scene.add(pointLight);

        this.voxelManager = new VoxelManager(this.scene, this.camera);

        this.animate();
    }

    initHandTracker() {
        this.handTracker = new HandTracker({
            maxHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
            pinchThreshold: this.state.pinchThreshold,
            onHandDetected: (handData) => this.handleHandDetected(handData),
            onHandLost: () => this.handleHandLost()
        });
    }

    initEventListeners() {
        document.getElementById('start-camera').addEventListener('click', () => this.startCamera());
        document.getElementById('start-tracking').addEventListener('click', () => this.startTracking());
        document.getElementById('clear-voxels').addEventListener('click', () => this.clearVoxels());

        document.getElementById('pinch-threshold').addEventListener('input', (e) => {
            this.state.pinchThreshold = parseFloat(e.target.value);
            document.getElementById('pinch-value').textContent = this.state.pinchThreshold.toFixed(2);
            if (this.handTracker) {
                this.handTracker.options.pinchThreshold = this.state.pinchThreshold;
            }
        });

        document.getElementById('voxel-size').addEventListener('input', (e) => {
            const size = parseFloat(e.target.value);
            document.getElementById('voxel-size-value').textContent = size.toFixed(2);
            if (this.voxelManager) {
                this.voxelManager.setVoxelSize(size);
            }
        });

        document.getElementById('camera-flip').addEventListener('change', (e) => {
            this.state.flipCamera = e.target.checked;
            const video = document.getElementById('webcam');
            if (video) {
                video.style.transform = e.target.checked ? 'scaleX(-1)' : 'scaleX(1)';
            }
        });

        window.addEventListener('resize', () => this.handleResize());
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            const video = document.getElementById('webcam');
            video.srcObject = stream;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });

            if (this.state.flipCamera) {
                video.style.transform = 'scaleX(-1)';
            }

            await this.handTracker.initialize();
            await this.handTracker.setSource(video);

            document.getElementById('start-camera').disabled = true;
            document.getElementById('start-tracking').disabled = false;
            
            this.showToast('Camera started! Click "Start Tracking" to begin hand tracking.');
        } catch (error) {
            console.error('Camera error:', error);
            this.showToast('Error starting camera: ' + error.message);
        }
    }

    startTracking() {
        if (!this.handTracker) {
            this.showToast('Please start the camera first.');
            return;
        }

        this.handTracker.start();
        this.state.isTracking = true;
        
        document.getElementById('start-tracking').textContent = 'Stop Tracking';
        document.getElementById('start-tracking').onclick = () => this.stopTracking();
        
        this.showToast('Hand tracking started! Make a pinch gesture to create voxels.');
    }

    stopTracking() {
        if (this.handTracker) {
            this.handTracker.stop();
        }
        
        this.state.isTracking = false;
        
        document.getElementById('start-tracking').textContent = 'Start Tracking';
        document.getElementById('start-tracking').onclick = () => this.startTracking();
        
        this.showToast('Hand tracking stopped.');
    }

    handleHandDetected(handData) {
        this.state.handPresent = true;

        if (handData.pinch.isPinching && !this.state.isPinching) {
            this.state.isPinching = true;
            this.voxelManager.startDrag(handData.screenPosition);
            this.showToast('Creating voxel...');
        } else if (!handData.pinch.isPinching && this.state.isPinching) {
            this.state.isPinching = false;
            this.voxelManager.endDrag();
            this.showToast('Voxel placed!');
        }

        if (this.voxelManager.isCurrentlyDragging()) {
            this.voxelManager.updateActiveVoxel(handData.screenPosition);
        }

        if (handData.gestures.isPeaceGesture && !this.state.lastPeaceGesture) {
            this.state.lastPeaceGesture = true;
            if (this.voxelManager.removeLastVoxel()) {
                this.showToast('Last voxel removed');
            }
        } else if (!handData.gestures.isPeaceGesture) {
            this.state.lastPeaceGesture = false;
        }

        document.getElementById('voxel-count').textContent = `Voxels: ${this.voxelManager.getVoxelCount()}`;
    }

    handleHandLost() {
        this.state.handPresent = false;
        
        if (this.state.isPinching) {
            this.state.isPinching = false;
            this.voxelManager.endDrag();
        }
    }

    clearVoxels() {
        if (this.voxelManager) {
            this.voxelManager.clearAllVoxels();
            document.getElementById('voxel-count').textContent = 'Voxels: 0';
            this.showToast('All voxels cleared');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.fps.frames++;
        const now = Date.now();
        if (now - this.fps.lastTime >= 1000) {
            this.fps.current = this.fps.frames;
            this.fps.frames = 0;
            this.fps.lastTime = now;
            document.getElementById('fps-counter').textContent = `FPS: ${this.fps.current}`;
        }

        if (this.voxelManager) {
            this.voxelManager.updatePhysics();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    handleResize() {
        const container = document.querySelector('.video-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new HandTrackingApp();
});