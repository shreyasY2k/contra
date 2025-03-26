export class Level {
    constructor(scene, onLoadCallback) {
        this.scene = scene;
        this.onLoadCallback = onLoadCallback;
        
        // Level configuration
        this.terrainSize = 100;
        this.chunkSize = 20;
        
        try {
            console.log("Creating level...");
            
            // Create terrain and obstacles
            this.createTerrain();
            this.createObstacles();
            this.createSkybox();
            
            console.log("Level creation complete");
            
            // Signal that level is loaded
            if (typeof this.onLoadCallback === 'function') {
                this.onLoadCallback();
            }
        } catch (error) {
            console.error("Error initializing level:", error);
            // Still call callback to avoid blocking the loading process
            if (typeof this.onLoadCallback === 'function') {
                this.onLoadCallback();
            }
        }
    }
    
    createTerrain() {
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x358B20 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createObstacles() {
        // Add random obstacles
        for (let i = 0; i < 30; i++) {
            const obstacleType = Math.random() > 0.5 ? 'rock' : 'tree';
            const size = obstacleType === 'rock' ? 1 + Math.random() * 2 : 1;
            const height = obstacleType === 'rock' ? size : 3 + Math.random() * 2;
            
            let geometry, material;
            
            if (obstacleType === 'rock') {
                geometry = new THREE.DodecahedronGeometry(size, 0);
                material = new THREE.MeshLambertMaterial({ color: 0x777777 });
            } else {
                // Tree trunk
                geometry = new THREE.CylinderGeometry(0.5, 0.7, height, 8);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            }
            
            const obstacle = new THREE.Mesh(geometry, material);
            
            // Random position
            const x = Math.random() * this.terrainSize - this.terrainSize / 2;
            const z = Math.random() * this.terrainSize - this.terrainSize / 2;
            
            // Ensure obstacles aren't too close to the center where player starts
            if (Math.sqrt(x * x + z * z) < 10) continue;
            
            obstacle.position.set(x, obstacleType === 'rock' ? size / 2 : height / 2, z);
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            this.scene.add(obstacle);
            
            // Add foliage to trees
            if (obstacleType === 'tree') {
                const leafGeometry = new THREE.SphereGeometry(2, 8, 8);
                const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 });
                const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
                leaves.position.y = height - 1;
                leaves.castShadow = true;
                obstacle.add(leaves);
            }
        }
    }
    
    createSkybox() {
        // Create a simple skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterials = [
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // right
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // left
            new THREE.MeshBasicMaterial({ color: 0x6CA6CD, side: THREE.BackSide }), // top
            new THREE.MeshBasicMaterial({ color: 0x228B22, side: THREE.BackSide }), // bottom
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // front
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // back
        ];
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
        this.scene.add(skybox);
    }
    
    update(playerPosition) {
        // Future implementation for infinite scrolling terrain
        // Could shift obstacles and terrain as player moves
    }
}
