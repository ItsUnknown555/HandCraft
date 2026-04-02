class VoxelManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.voxels = [];
        this.activeVoxel = null;
        this.isDragging = false;
        
        this.options = {
            voxelSize: 0.08,
            colors: [
                0x00ff88, 0x00ccff, 0xff3366, 
                0xffcc00, 0xcc66ff, 0xff6600
            ],
            glowIntensity: 0.5,
            maxVoxels: 50
        };

        this.voxelMaterial = null;
        this.initMaterials();
    }

    initMaterials() {
        this.voxelMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            metalness: 0.3,
            roughness: 0.4,
            emissive: 0x00ff88,
            emissiveIntensity: 0.2
        });
    }

    createVoxel(position, color = null) {
        if (this.voxels.length >= this.options.maxVoxels) {
            this.removeVoxel(this.voxels[0]);
        }

        const size = this.options.voxelSize;
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        const material = new THREE.MeshStandardMaterial({
            color: color || this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
            metalness: 0.3,
            roughness: 0.4,
            emissive: color || 0x00ff88,
            emissiveIntensity: 0.15
        });

        const voxel = new THREE.Mesh(geometry, material);
        
        voxel.position.set(
            position.x * 2,
            position.y * 2,
            -2
        );
        
        voxel.userData = {
            createdAt: Date.now(),
            velocity: new THREE.Vector3(0, 0, 0),
            isActive: false
        };

        this.scene.add(voxel);
        this.voxels.push(voxel);

        this.addPlacementEffect(voxel.position);

        return voxel;
    }

    addPlacementEffect(position) {
        const ringGeometry = new THREE.RingGeometry(0.05, 0.1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.position.z += 0.05;
        ring.rotation.x = -Math.PI / 2;
        
        this.scene.add(ring);
        
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0.5) {
                this.scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
                return;
            }
            
            ring.scale.setScalar(1 + elapsed * 2);
            ring.material.opacity = 0.8 * (1 - elapsed * 2);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    updateActiveVoxel(handPosition) {
        if (!this.activeVoxel) return;
        
        const targetPosition = new THREE.Vector3(
            handPosition.x * 2,
            handPosition.y * 2,
            -2
        );

        this.activeVoxel.position.lerp(targetPosition, 0.3);
        
        this.activeVoxel.rotation.x += 0.02;
        this.activeVoxel.rotation.y += 0.01;
    }

    startDrag(handPosition) {
        if (this.voxels.length === 0) {
            this.activeVoxel = this.createVoxel(handPosition);
            this.activeVoxel.userData.isActive = true;
            return this.activeVoxel;
        }
        
        const lastVoxel = this.voxels[this.voxels.length - 1];
        lastVoxel.position.set(
            handPosition.x * 2,
            handPosition.y * 2,
            -2
        );
        lastVoxel.userData.isActive = true;
        this.activeVoxel = lastVoxel;
        this.isDragging = true;
        
        return lastVoxel;
    }

    endDrag() {
        if (this.activeVoxel) {
            this.activeVoxel.userData.isActive = false;
            this.activeVoxel = null;
        }
        this.isDragging = false;
    }

    removeVoxel(voxel) {
        const index = this.voxels.indexOf(voxel);
        if (index > -1) {
            this.voxels.splice(index, 1);
            this.scene.remove(voxel);
            voxel.geometry.dispose();
            voxel.material.dispose();
        }
    }

    removeLastVoxel() {
        if (this.voxels.length > 0) {
            const lastVoxel = this.voxels[this.voxels.length - 1];
            this.removeVoxel(lastVoxel);
            return true;
        }
        return false;
    }

    clearAllVoxels() {
        while (this.voxels.length > 0) {
            this.removeVoxel(this.voxels[0]);
        }
        this.activeVoxel = null;
        this.isDragging = false;
    }

    updatePhysics() {
        const gravity = -0.001;
        
        this.voxels.forEach(voxel => {
            if (!voxel.userData.isActive) {
                voxel.userData.velocity.y += gravity;
                voxel.position.add(voxel.userData.velocity);
                
                if (voxel.position.y < -3) {
                    voxel.position.y = -3;
                    voxel.userData.velocity.y *= -0.3;
                }
            }
        });
    }

    getVoxelCount() {
        return this.voxels.length;
    }

    getActiveVoxel() {
        return this.activeVoxel;
    }

    isCurrentlyDragging() {
        return this.isDragging;
    }

    setVoxelSize(size) {
        this.options.voxelSize = size;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoxelManager;
}