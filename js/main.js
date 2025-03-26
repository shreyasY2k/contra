import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Vehicle } from './vehicle.js';
import { Weapon } from './weapon.js';
import { WeaponPickup } from './weaponPickup.js';
import { Level } from './level.js';
import { Minimap } from './minimap.js';
import ModelFactory from './models.js';

class ContraGame {
    constructor() {
        // Make game instance globally accessible for components like Enemy to use
        window.game = this;
        
        // Game state
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.isLoaded = false;
        this.assetsLoaded = 0;
        this.totalAssets = 5;
        
        // Mouse state for aiming
        this.mouse = { x: 0, y: 0 };
        this.mouseDown = false;
        this.mouseTarget = new THREE.Vector3();
        
        // Add loading timeout safety mechanism
        this.loadingTimeout = null;
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Game clock for animations
        this.clock = new THREE.Clock();
        
        // Initialize UI elements first to avoid undefined references
        this.initUI();
        
        // Initialize scene, camera, and renderer
        this.initThree();
        
        // Create model factory
        this.modelFactory = new ModelFactory(this.scene);
        
        // Initialize game systems
        this.enemies = [];
        this.vehicles = [];
        this.bullets = [];
        this.particles = [];
        this.spawnPoints = [];
        this.weaponPickups = [];
        
        // Initialize controls
        this.initControls();
        
        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (this.isMobile) {
            if (document.getElementById('mobile-controls')) {
                document.getElementById('mobile-controls').style.display = 'block';
                this.initMobileControls();
            }
        }
        
        // Initialize minimap if element exists
        const minimapContainer = document.getElementById('minimap');
        if (minimapContainer) {
            this.minimap = new Minimap(minimapContainer);
        }
        
        // Show debug panel (can be toggled)
        this.showDebugInfo(true);
        
        // Load game assets
        this.preloadModels();
        
        // Set a fallback timer to ensure the game starts even if some assets fail to load
        this.loadingTimeout = setTimeout(() => {
            console.log("Loading timeout triggered - starting game anyway");
            if (!this.isLoaded) {
                this.isLoaded = true;
                if (this.loadingElement) {
                    this.loadingElement.style.display = 'none';
                }
                this.startGame();
            }
        }, 15000); // 15 seconds timeout
        
        // Track time for weapon spawning
        this.lastWeaponSpawnTime = 0;
        this.weaponSpawnInterval = 15000; // ms between weapon spawns
        
        // Start animation loop
        this.animate();
    }
    
    initUI() {
        try {
            this.scoreElement = document.getElementById('score');
            this.healthElement = document.getElementById('health');
            this.ammoElement = document.getElementById('ammo');
            this.loadingElement = document.getElementById('loading-screen');
            this.progressElement = document.getElementById('progress');
            this.gameOverElement = document.getElementById('game-over');
            this.finalScoreElement = document.getElementById('final-score');
            
            // Check if elements exist and log warning if they don't
            if (!this.progressElement) {
                console.warn("Progress element not found in the DOM");
            }
            if (!this.loadingElement) {
                console.warn("Loading screen element not found in the DOM");
            }
        } catch (error) {
            console.error("Error initializing UI elements:", error);
        }
    }
    
    showDebugInfo(show) {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.style.display = show ? 'block' : 'none';
        }
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    preloadModels() {
        console.log("Preloading models...");
        
        // Initialize model factory first
        this.modelFactory.initialize();
        
        // Start asset loading process
        this.loadAssets();
    }
    
    createModelDirectory() {
        // Create a placeholder models directory structure with fallbacks
        // This avoids loading errors if the models aren't available
        
        try {
            // Checking if we're in a secure context for blob storage
            if (window.URL && window.Blob) {
                // Create placeholder models
                const models = [
                    'soldier.glb',
                    'enemy_soldier.glb',
                    'enemy_tank.glb',
                    'enemy_helicopter.glb'
                ];
                
                // Create a simple placeholder GLB file
                const minimalGlb = new Blob([new Uint8Array([
                    // Minimal glTF 2.0 binary header
                    103, 108, 84, 70, // magic: glTF
                    2, 0, 0, 0,       // version: 2
                    0, 0, 0, 0,       // length: to be filled
                    0, 0, 0, 0,       // jsonLength: to be filled
                    123, 125          // minimal JSON: {}
                ])], {type: 'model/gltf-binary'});
                
                // Set model URLs
                for (const modelName of models) {
                    const url = URL.createObjectURL(minimalGlb);
                    console.log(`Created placeholder for ${modelName}: ${url}`);
                }
            }
        } catch (error) {
            console.error("Error creating model placeholders:", error);
        }
    }
    
    loadAssets() {
        console.log("Starting to load assets...");
        
        try {
            // Load level
            this.level = new Level(this.scene, () => {
                console.log("Level loaded");
                this.updateLoadingProgress();
            });
            
            // Load player model and animations
            this.player = new Player(this.scene, this.camera, () => {
                console.log("Player loaded");
                this.updateLoadingProgress();
            });
            
            // Load enemy models - simplified to count as one asset
            this.enemyTypes = [
                { type: 'soldier', model: null, probability: 0.7 },
                { type: 'tank', model: null, probability: 0.2 },
                { type: 'helicopter', model: null, probability: 0.1 }
            ];
            console.log("Enemy types defined");
            this.updateLoadingProgress();
            
            // Load vehicle models - simplified to count as one asset
            this.vehicleTypes = [
                { type: 'jeep', model: null },
                { type: 'tank', model: null },
                { type: 'helicopter', model: null }
            ];
            console.log("Vehicle types defined");
            this.updateLoadingProgress();
            
            // Add one more asset to guarantee we hit 100%
            setTimeout(() => {
                console.log("Final asset loaded");
                this.updateLoadingProgress();
            }, 1000);
            
        } catch (error) {
            console.error("Error loading assets:", error);
            // Force progress to continue even on error
            this.updateLoadingProgress();
        }
    }
    
    updateLoadingProgress() {
        this.assetsLoaded++;
        const progress = Math.min((this.assetsLoaded / this.totalAssets) * 100, 100);
        console.log(`Loading progress: ${progress}% (${this.assetsLoaded}/${this.totalAssets})`);
        
        // Check if element exists before setting style
        if (this.progressElement && this.progressElement.style) {
            this.progressElement.style.width = `${progress}%`;
        }
        
        if (this.loadingElement && document.getElementById('loading-text')) {
            document.getElementById('loading-text').textContent = `Loading... ${Math.round(progress)}%`;
        }
        
        if (this.assetsLoaded >= this.totalAssets) {
            console.log("All assets loaded, starting game...");
            
            // Clear the timeout since we're done loading
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            setTimeout(() => {
                this.isLoaded = true;
                if (this.loadingElement) {
                    this.loadingElement.style.display = 'none';
                }
                this.startGame();
            }, 500);
        }
    }
    
    startGame() {
        // Initialize game state
        this.score = 0;
        this.updateScore(0);
        this.player.reset();
        
        // Clear existing entities
        this.enemies.forEach(enemy => this.scene.remove(enemy.mesh));
        this.vehicles.forEach(vehicle => this.scene.remove(vehicle.mesh));
        this.bullets.forEach(bullet => this.scene.remove(bullet.mesh));
        this.weaponPickups.forEach(pickup => pickup.remove());
        
        this.enemies = [];
        this.vehicles = [];
        this.bullets = [];
        this.weaponPickups = [];
        
        // Start entity spawning
        this.startSpawning();
    }
    
    startSpawning() {
        // Set up spawn points
        this.spawnPoints = [
            { x: -20, y: 0, z: -10 },
            { x: 20, y: 0, z: -10 },
            { x: 0, y: 0, z: -30 }
        ];
        
        // Start enemy spawning
        this.enemySpawnInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.spawnEnemy();
            }
        }, 2000);
        
        // Vehicle spawning - increased frequency and closer to player
        this.vehicleSpawnInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.spawnVehicle();
            }
        }, 7000); // Reduced from 15000 to 7000ms
        
        // Weapon pickup spawning
        this.weaponSpawnInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.spawnWeapon();
            }
        }, 10000); // Spawn a weapon pickup every 10 seconds
        
        // Reset weapon spawn timer
        this.lastWeaponSpawnTime = Date.now();
    }
    
    spawnWeapon() {
        // Don't spawn too many weapons at once
        if (this.weaponPickups.length >= 5) return;
        
        const weaponTypes = ['rifle', 'rocket', 'laser', 'shotgun'];
        const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        
        // Pick a random position away from the player
        const playerPos = this.player.mesh.position;
        let position;
        
        do {
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 80,
                0.5,
                (Math.random() - 0.5) * 80
            );
        } while (position.distanceTo(playerPos) < 15); // Ensure minimum distance from player
        
        const weaponPickup = new WeaponPickup(this.scene, randomType, position);
        this.weaponPickups.push(weaponPickup);
        
        console.log(`Spawned ${randomType} weapon at position`, position);
        
        // Update debug panel
        const weaponCountElement = document.getElementById('weapon-count');
        if (weaponCountElement) {
            weaponCountElement.textContent = this.weaponPickups.length;
        }
    }
    
    spawnEnemy() {
        // Randomly select a spawn point
        const spawnIndex = Math.floor(Math.random() * this.spawnPoints.length);
        const spawnPoint = this.spawnPoints[spawnIndex];
        
        // Randomly select enemy type based on probability
        let rand = Math.random();
        let cumProb = 0;
        let selectedType = null;
        
        for (const enemyType of this.enemyTypes) {
            cumProb += enemyType.probability;
            if (rand <= cumProb) {
                selectedType = enemyType.type;
                break;
            }
        }
        
        const enemy = new Enemy(this.scene, selectedType, spawnPoint, this.player);
        this.enemies.push(enemy);
    }
    
    spawnVehicle() {
        // Random vehicle type
        const vehicleTypeIndex = Math.floor(Math.random() * this.vehicleTypes.length);
        const vehicleType = this.vehicleTypes[vehicleTypeIndex].type;
        
        // Random position - closer to player for easier access
        let spawnPoint;
        const playerPos = this.player.mesh.position;
        
        // Create a position that's relatively close to the player (15-25 units away)
        const angle = Math.random() * Math.PI * 2; // Random angle
        const distance = 15 + Math.random() * 10; // Distance between 15-25 units
        
        spawnPoint = {
            x: playerPos.x + Math.cos(angle) * distance,
            y: vehicleType === 'helicopter' ? 5 : 0, // Height based on type
            z: playerPos.z + Math.sin(angle) * distance
        };
        
        const vehicle = new Vehicle(this.scene, vehicleType, spawnPoint);
        
        // Add a visual indicator for vehicles
        this.createVehicleIndicator(vehicle);
        
        this.vehicles.push(vehicle);
        
        // Show hint message about vehicle
        this.showMessage(`New ${vehicleType} available! Press E to enter.`, 3000);
    }
    
    createVehicleIndicator(vehicle) {
        // Create an arrow pointing down at the vehicle
        const arrowGeometry = new THREE.ConeGeometry(0.5, 1, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = Math.PI; // Point downward
        
        // Position above vehicle
        const height = vehicle.type === 'helicopter' ? 8 : 4;
        arrow.position.y = height;
        
        // Add to vehicle
        vehicle.indicator = arrow;
        vehicle.mesh.add(arrow);
        
        // Add pulsing animation
        vehicle.indicatorPulse = 0;
    }
    
    showMessage(text, duration = 3000) {
        // Check if message container exists, create if not
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.position = 'absolute';
            messageContainer.style.top = '100px';
            messageContainer.style.left = '50%';
            messageContainer.style.transform = 'translateX(-50%)';
            messageContainer.style.color = 'white';
            messageContainer.style.fontSize = '20px';
            messageContainer.style.textAlign = 'center';
            messageContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
            messageContainer.style.zIndex = '1000';
            document.body.appendChild(messageContainer);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.textContent = text;
        messageElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
        messageElement.style.padding = '10px 15px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.marginBottom = '10px';
        messageElement.style.opacity = '1';
        messageElement.style.transition = 'opacity 0.5s';
        
        // Add to container
        messageContainer.appendChild(messageElement);
        
        // Remove after duration
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                if (messageContainer.contains(messageElement)) {
                    messageContainer.removeChild(messageElement);
                }
            }, 500);
        }, duration);
    }
    
    toggleCameraView() {
        if (!this.player) return;
        
        // Toggle between three view modes
        if (!this.cameraMode) {
            this.cameraMode = 'tpp-far'; // Default third person far
        }
        
        switch(this.cameraMode) {
            case 'tpp-far':
                this.cameraMode = 'tpp-close';
                this.showMessage("Camera: Third Person Close", 1500);
                break;
            case 'tpp-close':
                this.cameraMode = 'fpp';
                this.showMessage("Camera: First Person", 1500);
                break;
            case 'fpp':
                this.cameraMode = 'tpp-far';
                this.showMessage("Camera: Third Person Far", 1500);
                break;
        }
    }
    
    updateCameraView() {
        if (!this.player || !this.cameraMode) return;
        
        let targetPos, cameraOffset;
        
        if (this.player.inVehicle) {
            targetPos = this.player.currentVehicle.mesh.position.clone();
            
            // Adjust camera based on view mode and vehicle type
            switch(this.cameraMode) {
                case 'tpp-far':
                    cameraOffset = new THREE.Vector3(0, 5, 10);
                    break;
                case 'tpp-close':
                    cameraOffset = new THREE.Vector3(0, 3, 6);
                    break;
                case 'fpp':
                    // First person view from vehicle cockpit
                    const vehicleType = this.player.currentVehicle.type;
                    if (vehicleType === 'helicopter') {
                        cameraOffset = new THREE.Vector3(0, 1.5, -0.5);
                    } else if (vehicleType === 'tank') {
                        cameraOffset = new THREE.Vector3(0, 1.8, 0);
                    } else {
                        cameraOffset = new THREE.Vector3(0, 1.2, 0);
                    }
                    break;
            }
        } else {
            targetPos = this.player.mesh.position.clone();
            
            // Adjust camera based on view mode
            switch(this.cameraMode) {
                case 'tpp-far':
                    cameraOffset = new THREE.Vector3(0, 5, 8);
                    break;
                case 'tpp-close':
                    cameraOffset = new THREE.Vector3(0, 3, 4);
                    break;
                case 'fpp':
                    cameraOffset = new THREE.Vector3(0, 1.7, 0.1); // Slightly forward from head
                    break;
            }
        }
        
        // Apply rotation to camera offset for first person view
        if (this.cameraMode === 'fpp') {
            // Get player or vehicle rotation
            const rotation = this.player.inVehicle 
                ? this.player.currentVehicle.rotation 
                : this.player.rotation;
            
            // Apply rotation to offset
            const rotMatrix = new THREE.Matrix4().makeRotationY(rotation);
            cameraOffset.applyMatrix4(rotMatrix);
        }
        
        // Set camera position
        this.camera.position.copy(targetPos).add(cameraOffset);
        
        // Set camera look target
        if (this.cameraMode === 'fpp') {
            // In first person, look in the direction of movement
            const lookAtPoint = targetPos.clone();
            
            // Get forward direction vector based on rotation
            const forwardVector = new THREE.Vector3(0, 0, -10);
            const rotation = this.player.inVehicle 
                ? this.player.currentVehicle.rotation 
                : this.player.rotation;
                
            forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            lookAtPoint.add(forwardVector);
            
            this.camera.lookAt(lookAtPoint);
        } else {
            // In third person, look at player/vehicle
            this.camera.lookAt(targetPos);
        }
    }
    
    initControls() {
        // Keyboard controls
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Weapon switching with number keys
            if (e.code.startsWith('Digit') && this.player) {
                const num = parseInt(e.code.substring(5)) - 1;
                if (num >= 0 && num < 4) {
                    this.player.switchWeapon(num);
                }
            }
            
            // Weapon cycling with Q key
            if (e.code === 'KeyQ' && this.player) {
                this.player.cycleWeapon();
            }
            
            // Camera view toggle with V key
            if (e.code === 'KeyV') {
                this.toggleCameraView();
                // Reset mouse target when switching views
                if (this.mouseTarget) {
                    if (this.player) {
                        this.player.setMouseTarget(this.mouse, this.camera);
                    }
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            // Handle special key events
            if (e.code === 'KeyE' || e.code === 'KeyF') {
                this.tryActionAtPosition();
            }
        });
        
        // Mouse controls for aiming and shooting
        window.addEventListener('mousemove', (e) => {
            // Convert mouse coordinates to normalized device coordinates (-1 to +1)
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            // Update player's aim direction
            if (this.player && !this.isGameOver && !this.isPaused) {
                const target = this.player.setMouseTarget(this.mouse, this.camera);
                this.mouseTarget.copy(target);
            }
        });
        
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                if (!this.isPaused && !this.isGameOver && this.player) {
                    this.player.shoot(this.bullets, this.scene, this.mouseTarget);
                }
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
            }
        });
        
        // Restart button
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.gameOverElement.style.display = 'none';
                this.startGame();
            });
        }
        
        // Handle window resize for minimap and renderer
        window.addEventListener('resize', () => {
            if (this.minimap) {
                this.minimap.resize();
            }
            
            // Update camera aspect ratio
            if (this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
            }
            
            // Update renderer size
            if (this.renderer) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }
    
    initMobileControls() {
        // Set up movement joystick
        const joystickBase = document.getElementById('joystick-base');
        const joystickThumb = document.getElementById('joystick-thumb');
        
        if (joystickBase && joystickThumb) {
            this.joystick = new Joystick(joystickBase, joystickThumb);
        }
        
        // Action buttons
        const jumpButton = document.getElementById('jump-button');
        if (jumpButton) {
            jumpButton.addEventListener('touchstart', () => {
                if (this.player) this.player.jump();
            });
        }
        
        // Add shoot button with auto-aim
        const shootButton = document.getElementById('shoot-button');
        if (shootButton) {
            shootButton.addEventListener('touchstart', () => {
                if (this.player) {
                    // Auto-aim at the nearest enemy
                    let nearestEnemy = this.findNearestEnemy();
                    let target;
                    
                    if (nearestEnemy) {
                        target = nearestEnemy.mesh.position.clone();
                    } else {
                        // If no enemy, shoot forward
                        target = new THREE.Vector3(
                            this.player.mesh.position.x,
                            this.player.mesh.position.y,
                            this.player.mesh.position.z - 10
                        );
                    }
                    
                    this.player.shoot(this.bullets, this.scene, target);
                }
            });
        }
        
        // Action button for interacting with vehicles/pickups
        const actionButton = document.getElementById('action-button');
        if (actionButton) {
            actionButton.addEventListener('touchstart', () => {
                this.tryActionAtPosition();
            });
        }
        
        // Sprint button
        const sprintButton = document.getElementById('sprint-button');
        if (sprintButton) {
            // Sprint while pressed
            sprintButton.addEventListener('touchstart', () => {
                this.mobileSprintActive = true;
            });
            
            sprintButton.addEventListener('touchend', () => {
                this.mobileSprintActive = false;
            });
        }
    }
    
    tryActionAtPosition() {
        // Check for vehicle entry/exit
        if (this.player.inVehicle) {
            this.player.exitVehicle();
        } else {
            // Try to enter a nearby vehicle
            for (let i = 0; i < this.vehicles.length; i++) {
                const vehicle = this.vehicles[i];
                if (!vehicle.isOccupied && this.player.distanceTo(vehicle) < 3) {
                    this.player.enterVehicle(vehicle);
                    break;
                }
            }
        }
        
        // Try to pick up weapons
        this.checkWeaponPickups();
    }
    
    findNearestEnemy() {
        if (!this.player || !this.enemies.length) return null;
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const enemy of this.enemies) {
            const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        }
        
        // Only target if within reasonable range
        return minDistance < 20 ? nearest : null;
    }
    
    checkWeaponPickups() {
        if (!this.player) return;
        
        for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
            const pickup = this.weaponPickups[i];
            if (pickup.checkPlayerCollision(this.player)) {
                // Player picked up the weapon
                this.player.pickupWeapon(pickup);
                pickup.remove();
                this.weaponPickups.splice(i, 1);
                
                // Update debug panel
                const weaponCountElement = document.getElementById('weapon-count');
                if (weaponCountElement) {
                    weaponCountElement.textContent = this.weaponPickups.length;
                }
            }
        }
    }
    
    updatePlayerControls() {
        if (!this.player) return;
        
        if (this.isMobile) {
            // Mobile controls via joystick
            const position = this.joystick.getPosition();
            this.player.moveWithJoystick(position.x, position.y, this.mobileSprintActive);
            
            // Auto-fire if holding shoot button
            if (this.mobileAutoFire && !this.isPaused && !this.isGameOver) {
                const nearestEnemy = this.findNearestEnemy();
                if (nearestEnemy) {
                    this.player.shoot(this.bullets, this.scene, nearestEnemy.mesh.position);
                }
            }
        } else {
            // Keyboard controls
            const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
            
            if (this.keys['KeyW'] || this.keys['ArrowUp']) this.player.move('forward', isSprinting);
            if (this.keys['KeyS'] || this.keys['ArrowDown']) this.player.move('backward', isSprinting);
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.move('left', isSprinting);
            if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.move('right', isSprinting);
            if (this.keys['Space']) this.player.jump();
            
            // Auto-fire if mouse button is held down
            if (this.mouseDown && !this.isPaused && !this.isGameOver) {
                this.player.shoot(this.bullets, this.scene, this.mouseTarget);
            }
        }
        
        // Always check for weapon pickups when moving
        this.checkWeaponPickups();
    }
    
    update() {
        if (!this.isLoaded || this.isPaused || this.isGameOver) return;
        
        // Calculate delta time for smooth animations
        const deltaTime = this.clock.getDelta();
        
        // Update FPS counter
        this.updateFPS();
        
        // Update player
        this.updatePlayerControls();
        this.player.update(deltaTime);
        
        // Update camera position based on view mode
        this.updateCameraView();
        
        // Update vehicle indicators
        this.updateVehicleIndicators(deltaTime);
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                // Add explosion effect
                this.createExplosion(enemy.mesh.position.clone());
                
                this.scene.remove(enemy.mesh);
                if (enemy.enemyGroup) {
                    this.scene.remove(enemy.enemyGroup);
                }
                this.enemies.splice(i, 1);
                this.updateScore(100);
            }
        }
        
        // Update vehicles
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const vehicle = this.vehicles[i];
            vehicle.update(deltaTime);
            
            // Remove destroyed vehicles
            if (vehicle.health <= 0) {
                // Add explosion effect
                this.createExplosion(vehicle.mesh.position.clone(), 2.0);
                
                this.scene.remove(vehicle.mesh);
                if (vehicle.vehicleGroup) {
                    this.scene.remove(vehicle.vehicleGroup);
                }
                this.vehicles.splice(i, 1);
                this.updateScore(250);
            }
        }
        
        // Update bullets
        this.updateBullets();
        
        // Update weapon pickups
        this.updateWeaponPickups(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Check if player is dead
        if (this.player.health <= 0 && !this.isGameOver) {
            this.gameOver();
        }
        
        // Update level
        this.level.update(this.player.position);
        
        // Update minimap
        if (this.minimap) {
            this.minimap.update(this.player, this.enemies, this.vehicles, this.weaponPickups);
        }
        
        // Update debug info
        this.updateDebugInfo();
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            
            // Check bullet collisions with enemies
            for (const enemy of this.enemies) {
                // Use the improved collision detection from the enemy class
                if (bullet.isFromPlayer && enemy.checkCollision(bullet)) {
                    enemy.takeDamage(bullet.damage);
                    
                    // Add hit effect
                    this.createHitEffect(bullet.mesh.position.clone());
                    
                    // Handle explosion for explosive bullets
                    if (bullet.isExplosive) {
                        bullet.explode(this.scene);
                    }
                    
                    this.scene.remove(bullet.mesh);
                    if (bullet.particles) {
                        this.scene.remove(bullet.particles);
                    }
                    this.bullets.splice(i, 1);
                    break;
                }
            }
            
            // Check bullet collisions with vehicles
            for (const vehicle of this.vehicles) {
                if (bullet.isFromPlayer && bullet.checkCollision(vehicle.mesh)) {
                    vehicle.takeDamage(bullet.damage);
                    
                    // Add hit effect
                    this.createHitEffect(bullet.mesh.position.clone());
                    
                    // Handle explosion for explosive bullets
                    if (bullet.isExplosive) {
                        bullet.explode(this.scene);
                    }
                    
                    this.scene.remove(bullet.mesh);
                    if (bullet.particles) {
                        this.scene.remove(bullet.particles);
                    }
                    this.bullets.splice(i, 1);
                    break;
                }
            }
            
            // Check bullet collisions with player
            if (!bullet.isFromPlayer && bullet.checkCollision(this.player.mesh)) {
                this.player.takeDamage(bullet.damage);
                this.updateHealth();
                
                // Add hit effect
                this.createHitEffect(bullet.mesh.position.clone());
                
                this.scene.remove(bullet.mesh);
                if (bullet.particles) {
                    this.scene.remove(bullet.particles);
                }
                this.bullets.splice(i, 1);
            }
            
            // Remove bullets that are out of range
            if (bullet.distanceTraveled > bullet.range) {
                // For explosive bullets, explode when reaching max range
                if (bullet.isExplosive) {
                    bullet.explode(this.scene);
                }
                
                this.scene.remove(bullet.mesh);
                if (bullet.particles) {
                    this.scene.remove(bullet.particles);
                }
                this.bullets.splice(i, 1);
            }
        }
        
        // Check enemy collisions with player
        for (const enemy of this.enemies) {
            if (this.player.checkCollision(enemy.mesh)) {
                this.player.takeDamage(10);
                this.updateHealth();
            }
        }
    }
    
    checkBulletCollision(bullet, target) {
        // Get bullet position and target position
        const bulletPos = bullet.mesh.position;
        const targetPos = target.mesh.position;
        
        // Get collision radius based on target type
        let collisionRadius = 1; // Default
        
        if (target.type === 'helicopter') {
            collisionRadius = 2; // Larger collision area for helicopters
        } else if (target.type === 'tank') {
            collisionRadius = 2; // Larger for tanks too
        }
        
        // Check distance
        return bulletPos.distanceTo(targetPos) < collisionRadius;
    }
    
    updateWeaponPickups(deltaTime) {
        // Update existing pickups
        for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
            const pickup = this.weaponPickups[i];
            const stillExists = pickup.update(deltaTime);
            
            if (!stillExists) {
                pickup.remove();
                this.weaponPickups.splice(i, 1);
                
                // Update weapon count in debug panel
                const weaponCountElement = document.getElementById('weapon-count');
                if (weaponCountElement) {
                    weaponCountElement.textContent = this.weaponPickups.length;
                }
            }
        }
    }
    
    updateFPS() {
        this.frameCount++;
        
        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;
        
        if (elapsed >= 1000) { // Update every second
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.lastFpsUpdate = now;
            this.frameCount = 0;
            
            // Update FPS display if debug panel is active
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
            }
        }
    }
    
    updateDebugInfo() {
        // Update enemy count
        const enemyCountElement = document.getElementById('enemy-count');
        if (enemyCountElement) {
            enemyCountElement.textContent = this.enemies.length;
        }
        
        // Update bullet count
        const bulletCountElement = document.getElementById('bullet-count');
        if (bulletCountElement) {
            bulletCountElement.textContent = this.bullets.length;
        }
        
        // Update weapon count
        const weaponCountElement = document.getElementById('weapon-count');
        if (weaponCountElement) {
            weaponCountElement.textContent = this.weaponPickups.length;
        }
    }
    
    createExplosion(position, scale = 1.0) {
        // Create particle system for explosion
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particleCount; i++) {
            vertices.push(
                position.x + (Math.random() - 0.5) * 0.5 * scale,
                position.y + (Math.random() - 0.5) * 0.5 * scale,
                position.z + (Math.random() - 0.5) * 0.5 * scale
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xff5500,
            size: 0.5 * scale,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Add to particles array for animation
        this.particles.push({
            mesh: particles,
            velocity: [], // Array of velocity vectors for each particle
            life: 1.0,    // Life of the particle system (0-1)
            position: position.clone(),
            scale: scale,
            update: function(deltaTime) {
                // Initialize velocities if not already done
                if (this.velocity.length === 0) {
                    const positions = particles.geometry.attributes.position.array;
                    for (let i = 0; i < positions.length; i += 3) {
                        this.velocity.push({
                            x: (Math.random() - 0.5) * 2 * scale,
                            y: (Math.random() - 0.5) * 2 * scale + 2 * scale, // Upward bias
                            z: (Math.random() - 0.5) * 2 * scale
                        });
                    }
                }
                
                // Update particle positions
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
                    positions[i] += this.velocity[j].x * deltaTime * 2;
                    positions[i+1] += this.velocity[j].y * deltaTime * 2;
                    positions[i+2] += this.velocity[j].z * deltaTime * 2;
                    
                    // Add gravity effect
                    this.velocity[j].y -= 3 * deltaTime;
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
                
                // Update material opacity for fade-out effect
                this.life -= deltaTime * 1.5;
                material.opacity = this.life;
                
                // Return whether the particle system is still alive
                return this.life > 0;
            }
        });
    }
    
    createHitEffect(position) {
        // Create a simple hit effect (smaller than explosion)
        const particleCount = 10;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particleCount; i++) {
            vertices.push(
                position.x + (Math.random() - 0.5) * 0.2,
                position.y + (Math.random() - 0.5) * 0.2,
                position.z + (Math.random() - 0.5) * 0.2
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.2,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Add to particles array for animation
        this.particles.push({
            mesh: particles,
            velocity: [], // Array of velocity vectors for each particle
            life: 0.5,    // Life of the particle system (0-1) - shorter for hit effects
            position: position.clone(),
            update: function(deltaTime) {
                if (this.velocity.length === 0) {
                    const positions = particles.geometry.attributes.position.array;
                    for (let i = 0; i < positions.length; i += 3) {
                        this.velocity.push({
                            x: (Math.random() - 0.5) * 3,
                            y: (Math.random() - 0.5) * 3,
                            z: (Math.random() - 0.5) * 3
                        });
                    }
                }
                
                // Update particle positions
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
                    positions[i] += this.velocity[j].x * deltaTime * 2;
                    positions[i+1] += this.velocity[j].y * deltaTime * 2;
                    positions[i+2] += this.velocity[j].z * deltaTime * 2;
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
                
                // Update material opacity for fade-out effect
                this.life -= deltaTime * 3;
                material.opacity = this.life;
                
                return this.life > 0;
            }
        });
    }
    
    updateParticles(deltaTime) {
        // Update all particle systems and remove dead ones
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const isAlive = particle.update(deltaTime);
            
            if (!isAlive) {
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateVehicleIndicators(deltaTime) {
        // Make vehicle indicators pulse and follow the vehicle
        for (const vehicle of this.vehicles) {
            if (vehicle.indicator) {
                // Pulsing effect
                vehicle.indicatorPulse = (vehicle.indicatorPulse || 0) + deltaTime * 5;
                const scale = 1 + 0.2 * Math.sin(vehicle.indicatorPulse);
                vehicle.indicator.scale.set(scale, scale, scale);
                
                // Rotation for attention
                vehicle.indicator.rotation.y += deltaTime * 2;
                
                // Hide indicator if player is close or the vehicle is occupied
                const distance = this.player.mesh.position.distanceTo(vehicle.mesh.position);
                vehicle.indicator.visible = !vehicle.isOccupied && distance > 5;
            }
        }
    }
    
    updateScore(points) {
        this.score += points;
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${this.score}`;
        }
    }
    
    updateHealth() {
        if (this.healthElement) {
            this.healthElement.textContent = `Health: ${this.player.health}`;
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        clearInterval(this.enemySpawnInterval);
        clearInterval(this.vehicleSpawnInterval);
        clearInterval(this.weaponSpawnInterval);
        
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = this.score;
        }
        if (this.gameOverElement) {
            this.gameOverElement.style.display = 'flex';
        }
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when DOM is fully loaded to ensure all elements are available
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded, initializing game...");
    const game = new ContraGame();
});
