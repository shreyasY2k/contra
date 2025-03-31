class Game {
    constructor() {
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clock = new THREE.Clock();
      this.deltaTime = 0;
      this.player = null;
      this.enemies = [];
      this.projectiles = [];
      this.vehicles = [];
      this.environmentObjects = [];
      this.isGameActive = false;
      this.currentCameraMode = 'farTPP'; // 'farTPP', 'closeTPP', 'FPS'
      
      // Detect mobile device for smaller map size
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Set map size based on device type
      this.mapSize = this.isMobile ? 250 : 500; // Half the size on mobile
      
      this.minimap = null;
      
      // Camera control variables
      this.cameraMatrix = new THREE.Matrix4();
      this.cameraOffset = {
        farTPP: new THREE.Vector3(0, 10, -15),
        closeTPP: new THREE.Vector3(0, 3, -5),
        FPS: new THREE.Vector3(0, 1.7, 0.5)
      };
      this.cameraLerpFactor = 0.05; // Very smooth
      this.currentOffset = new THREE.Vector3();
      this.lastPlayerPosition = new THREE.Vector3();
      this.lastPlayerRotation = new THREE.Euler();
      this.lastCameraPosition = new THREE.Vector3();
      
      this.init();
    }
  
    init() {
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
      this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
  
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      
      // Create renderer
      const canvas = document.getElementById('game-canvas');
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
  
      // Add lights
      this.addLights();
      
      // Create game world
      this.createWorld();
      
      // Create player
      this.player = new Player(this);
      this.scene.add(this.player.object);
      
      // Initialize camera position
      this.currentOffset.copy(this.cameraOffset.farTPP);
      this.lastPlayerPosition.copy(this.player.object.position);
      this.lastPlayerRotation.copy(this.player.object.rotation);
      this.updateCameraPosition();
  
      // Create minimap
      this.minimap = new Minimap(this);
      
      // Set up controls AFTER player is created
      this.controls = new Controls(this);
      
      // Initialize enemies and vehicles
      this.setupEnemies();
      this.setupVehicles();
  
      // Start game loop and activate game
      this.isGameActive = true;
      
      // Hide loading screen
      document.getElementById('loading-screen').style.display = 'none';
      
      // Force a first render
      this.renderer.render(this.scene, this.camera);
      
      // Start animation loop
      requestAnimationFrame(() => this.animate());
      
      // Handle window resize
      window.addEventListener('resize', () => this.onWindowResize());
    }
  
    addLights() {
      // Ambient light
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      this.scene.add(ambientLight);
      
      // Directional light (sun)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(100, 200, 100);
      directionalLight.castShadow = true;
      
      // Optimize shadow settings
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 10;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -200;
      directionalLight.shadow.camera.right = 200;
      directionalLight.shadow.camera.top = 200;
      directionalLight.shadow.camera.bottom = -200;
      
      this.scene.add(directionalLight);
    }
    
    createWorld() {
      // Ground
      const groundGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a7e52, // Green
        roughness: 0.8,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ground.userData.type = 'ground';
      this.scene.add(ground);
      
      // Create environment objects (buildings, trees, rocks)
      const environment = new Environment(this);
      environment.createObjects();
      
      // Add boundaries (optional, to keep player within the map)
      this.addBoundaries();
    }
    
    addBoundaries() {
      const boundaryHeight = 5;
      const boundaryThickness = 2;
      const halfMapSize = this.mapSize / 2;
      
      // Material for boundaries
      const boundaryMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        roughness: 0.8
      });
      
      // North wall
      const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(this.mapSize + boundaryThickness * 2, boundaryHeight, boundaryThickness),
        boundaryMaterial
      );
      northWall.position.set(0, boundaryHeight / 2, -halfMapSize - boundaryThickness / 2);
      northWall.castShadow = true;
      northWall.receiveShadow = true;
      this.scene.add(northWall);
      this.environmentObjects.push(northWall);
      
      // South wall
      const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(this.mapSize + boundaryThickness * 2, boundaryHeight, boundaryThickness),
        boundaryMaterial
      );
      southWall.position.set(0, boundaryHeight / 2, halfMapSize + boundaryThickness / 2);
      southWall.castShadow = true;
      southWall.receiveShadow = true;
      this.scene.add(southWall);
      this.environmentObjects.push(southWall);
      
      // East wall
      const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(boundaryThickness, boundaryHeight, this.mapSize),
        boundaryMaterial
      );
      eastWall.position.set(halfMapSize + boundaryThickness / 2, boundaryHeight / 2, 0);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      this.scene.add(eastWall);
      this.environmentObjects.push(eastWall);
      
      // West wall
      const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(boundaryThickness, boundaryHeight, this.mapSize),
        boundaryMaterial
      );
      westWall.position.set(-halfMapSize - boundaryThickness / 2, boundaryHeight / 2, 0);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      this.scene.add(westWall);
      this.environmentObjects.push(westWall);
    }
  
    setupEnemies() {
      // Create enemy spawner that will add enemies regularly
      this.enemySpawnInterval = setInterval(() => {
        // Adjust enemy count based on device type
        const maxEnemies = this.isMobile ? 5 : 10; // Fewer enemies on mobile
        
        if (this.enemies.length < maxEnemies && this.isGameActive) {
          const enemyTypes = ['soldier', 'tank', 'jeep'];
          const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
          const enemy = new Enemy(this, randomType);
          
          // Place at random position away from player
          let position = new THREE.Vector3(
            Math.random() * this.mapSize - this.mapSize / 2,
            0,
            Math.random() * this.mapSize - this.mapSize / 2
          );
          
          // Ensure enemy is not too close to player
          while (position.distanceTo(this.player.object.position) < (this.isMobile ? 30 : 50)) {
            position = new THREE.Vector3(
              Math.random() * this.mapSize - this.mapSize / 2,
              0,
              Math.random() * this.mapSize - this.mapSize / 2
            );
          }
          
          enemy.object.position.copy(position);
          this.enemies.push(enemy);
          this.scene.add(enemy.object);
        }
      }, this.isMobile ? 5000 : 3000); // Slower enemy spawn rate on mobile
    }
  
    setupVehicles() {
      // Create some vehicles on the map
      const vehiclePositions = [
        new THREE.Vector3(50, 0, 50),
        new THREE.Vector3(-50, 0, -70),
        new THREE.Vector3(80, 0, -120)
      ];
      
      vehiclePositions.forEach(position => {
        const vehicle = new Vehicle(this);
        vehicle.object.position.copy(position);
        this.vehicles.push(vehicle);
        this.scene.add(vehicle.object);
      });
    }
    
    changeCameraMode() {
      // Cycle through camera modes
      const modes = ['farTPP', 'closeTPP', 'FPS'];
      const currentIndex = modes.indexOf(this.currentCameraMode);
      this.currentCameraMode = modes[(currentIndex + 1) % modes.length];
      
      // Update offset based on new mode
      this.currentOffset.copy(this.cameraOffset[this.currentCameraMode]);
      
      document.getElementById('camera-toggle-btn').textContent = this.currentCameraMode.slice(0, 3);
    }
    
    updateCameraPosition() {
      if (!this.player) return;
      
      // Get player position and rotation
      const playerPos = this.player.object.position;
      const playerRot = this.player.object.rotation.y;
      
      // Check if player position or rotation has changed significantly
      const positionChanged = this.lastPlayerPosition.distanceTo(playerPos) > 0.01;
      const rotationChanged = Math.abs(this.lastPlayerRotation.y - playerRot) > 0.01;
      
      // If nothing changed, no need to update camera
      if (!positionChanged && !rotationChanged && this.camera.position.distanceTo(this.lastCameraPosition) < 0.01) {
        return;
      }
      
      // Create rotation matrix from player's Y rotation only
      this.cameraMatrix.makeRotationY(playerRot);
      
      // Get the correct offset for the current camera mode
      const offset = this.cameraOffset[this.currentCameraMode];
      
      // Calculate camera position based on player position + rotated offset
      const rotatedOffset = offset.clone().applyMatrix4(this.cameraMatrix);
      const targetCameraPos = new THREE.Vector3().addVectors(playerPos, rotatedOffset);
      
      // Smoothly move camera to target position
      this.camera.position.lerp(targetCameraPos, this.cameraLerpFactor);
      
      // Set camera look target based on mode
      if (this.currentCameraMode === 'FPS') {
        // In FPS mode, look in the direction the player is facing
        // Create a point in front of the player on the same horizontal plane
        const forward = new THREE.Vector3(0, 0, 10).applyMatrix4(this.cameraMatrix);
        const lookTarget = new THREE.Vector3().addVectors(playerPos, forward);
        this.camera.lookAt(lookTarget);
      } else {
        // In TPP modes, look at the player but maintain fixed vertical angle
        // Create a look target that's at the player's position but at camera's height
        const lookTarget = new THREE.Vector3(
          playerPos.x,
          playerPos.y, // Look at player's height directly (no vertical angle)
          playerPos.z
        );
        this.camera.lookAt(lookTarget);
      }
      
      // Store current position and rotation for next frame
      this.lastPlayerPosition.copy(playerPos);
      this.lastPlayerRotation.y = playerRot;
      this.lastCameraPosition = this.camera.position.clone();
    }
  
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    update() {
      this.deltaTime = this.clock.getDelta();
      
      // Limit delta time to prevent physics issues during lag spikes
      if (this.deltaTime > 0.1) {
        this.deltaTime = 0.1;
      }
      
      // Update player
      if (this.player) {
        this.player.update(this.deltaTime);
      }
      
      // Update camera position
      this.updateCameraPosition();
      
      // Update enemies
      this.enemies.forEach(enemy => enemy.update(this.deltaTime));
      
      // Update projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        if (projectile.update(this.deltaTime)) {
          // If projectile is dead (update returns true), remove it
          this.scene.remove(projectile.object);
          this.projectiles.splice(i, 1);
        }
      }
      
      // Update vehicles
      this.vehicles.forEach(vehicle => vehicle.update(this.deltaTime));
      
      // Update minimap
      if (this.minimap) {
        this.minimap.update();
      }
      
      // Check collisions
      this.checkCollisions();
    }
    
    checkCollisions() {
      // Projectile collisions with entities
      this.projectiles.forEach(projectile => {
        // Check projectile collisions with enemies
        if (projectile.source === 'player') {
          this.enemies.forEach(enemy => {
            if (projectile.checkCollision(enemy.object)) {
              enemy.takeDamage(projectile.damage);
              projectile.destroy();
            }
          });
        } 
        // Check projectile collisions with player
        else if (projectile.source === 'enemy') {
          if (projectile.checkCollision(this.player.object) && !this.player.isInvulnerable) {
            this.player.takeDamage(projectile.damage);
            projectile.destroy();
          }
        }
        
        // Check projectile collisions with environment
        this.environmentObjects.forEach(obj => {
          if (projectile.checkCollision(obj)) {
            projectile.destroy();
          }
        });
      });
      
      // Player collision with vehicles (for entering)
      if (!this.player.isInVehicle) {
        this.vehicles.forEach(vehicle => {
          if (this.player.checkCollision(vehicle.object) && !vehicle.isOccupied) {
            // Set flag to indicate player can enter the vehicle
            this.player.canEnterVehicle = vehicle;
          } else if (this.player.canEnterVehicle === vehicle) {
            this.player.canEnterVehicle = null;
          }
        });
      }
    }
  
    animate() {
      if (!this.isGameActive) return;
      
      requestAnimationFrame(() => this.animate());
      this.update();
      this.renderer.render(this.scene, this.camera);
    }
    
    spawnProjectile(position, direction, source, weapon) {
      const projectile = new Projectile(this, position, direction, source, weapon);
      this.projectiles.push(projectile);
      this.scene.add(projectile.object);
      return projectile;
    }
    
    removeEnemy(enemy) {
      const index = this.enemies.indexOf(enemy);
      if (index !== -1) {
        this.enemies.splice(index, 1);
        this.scene.remove(enemy.object);
      }
    }
  }
  
  // Initialize game when document is fully loaded
  window.addEventListener('DOMContentLoaded', () => {
    // Store game instance globally so the joystick can access it
    window.game = new Game();
  });