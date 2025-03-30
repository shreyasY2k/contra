class Vehicle {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Group();
    this.speed = 15;
    this.turnSpeed = 2;
    this.health = 200;
    this.maxHealth = 200;
    this.weapon = new Weapon('fullAuto', 15, 0.15); // Default vehicle weapon
    this.isOccupied = false;
    this.occupant = null;
    this.direction = new THREE.Vector3(0, 0, 1);
    this.velocity = new THREE.Vector3();
    
    this.createVehicleModel();
  }
  
  createVehicleModel() {
    // Create a jeep model
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x446633 }); // Military green
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 1;
    bodyMesh.castShadow = true;
    
    // Top part / roof
    const topGeometry = new THREE.BoxGeometry(2, 1, 2.5);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x446633 });
    const topMesh = new THREE.Mesh(topGeometry, topMaterial);
    topMesh.position.set(-0.5, 2.25, 0);
    topMesh.castShadow = true;
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const wheelPositions = [
      { x: 1.5, y: 0.7, z: 1.5 },
      { x: 1.5, y: 0.7, z: -1.5 },
      { x: -1.5, y: 0.7, z: 1.5 },
      { x: -1.5, y: 0.7, z: -1.5 }
    ];
    
    this.wheels = [];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.x = Math.PI / 2;
      wheel.castShadow = true;
      this.object.add(wheel);
      this.wheels.push(wheel);
    });
    
    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(1.8, 1);
    const windshieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.5
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0.5, 2, 0);
    windshield.rotation.y = Math.PI / 2;
    
    // Machine gun on top
    const gunBaseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8);
    const gunBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gunBase = new THREE.Mesh(gunBaseGeometry, gunBaseMaterial);
    gunBase.position.set(-0.5, 3, 0);
    
    const gunBarrelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
    const gunBarrelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const gunBarrel = new THREE.Mesh(gunBarrelGeometry, gunBarrelMaterial);
    gunBarrel.position.set(0, 0, 0.75);
    gunBarrel.rotation.x = Math.PI / 2;
    
    gunBase.add(gunBarrel);
    
    // Add all parts to vehicle object
    this.object.add(bodyMesh);
    this.object.add(topMesh);
    this.object.add(windshield);
    this.object.add(gunBase);
    
    // Add to vehicle properties
    this.bodyMesh = bodyMesh;
    this.gunBase = gunBase;
    this.gunBarrel = gunBarrel;
    
    // Set up collider
    this.collider = new THREE.Box3().setFromObject(this.object);
    
    // Position the vehicle at ground level
    this.object.position.y = 0;
  }
  
  update(deltaTime) {
    // Rotate wheels based on velocity
    if (this.velocity.length() > 0.1) {
      const speed = this.velocity.length();
      this.wheels.forEach(wheel => {
        wheel.rotation.z -= speed * deltaTime * 2;
      });
    }
    
    // Update position based on velocity
    this.object.position.x += this.velocity.x * deltaTime;
    this.object.position.z += this.velocity.z * deltaTime;
    
    // Make sure vehicle stays within map boundaries
    const halfMapSize = this.game.mapSize / 2 - 5; // 5 units buffer from edge
    this.object.position.x = Math.max(-halfMapSize, Math.min(halfMapSize, this.object.position.x));
    this.object.position.z = Math.max(-halfMapSize, Math.min(halfMapSize, this.object.position.z));
    
    // Update collider
    this.collider.setFromObject(this.object);

    // Reset velocity (vehicle stops when no input)
    this.velocity.x *= 0.95; // Friction effect
    this.velocity.z *= 0.95;
    
    // Point the gun towards the closest enemy if occupied
    if (this.isOccupied) {
      let closestEnemy = null;
      let closestDistance = Infinity;
      
      this.game.enemies.forEach(enemy => {
        const distance = this.object.position.distanceTo(enemy.object.position);
        if (distance < closestDistance && distance < 50) { // 50 units detection range
          closestDistance = distance;
          closestEnemy = enemy;
        }
      });
      
      if (closestEnemy) {
        const targetPos = closestEnemy.object.position.clone();
        const gunBasePos = new THREE.Vector3();
        this.gunBase.getWorldPosition(gunBasePos);
        
        // Make gun base look at enemy
        this.gunBase.lookAt(targetPos);
      }
    }
  }
  
  move(x, z) {
    // Get the vehicle's forward direction based on its rotation
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.object.quaternion);
    
    // Calculate movement direction
    this.velocity.x = forward.x * z * this.speed + right.x * x * this.speed;
    this.velocity.z = forward.z * z * this.speed + right.z * x * this.speed;
    
    // Update direction if moving
    if (z !== 0) {
      this.direction.copy(z > 0 ? forward : forward.negate());
    }
    
    // Turn the vehicle if moving sideways
    if (x !== 0) {
      const turnAngle = x * this.turnSpeed * -1; // Negative for correct steering
      this.object.rotation.y += turnAngle * (Math.abs(z) > 0.1 ? 0.05 : 0.02); // Turn faster when moving forward
    }
  }
  
  shoot() {
    if (!this.isOccupied) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastShootTime < this.weapon.fireRate * 1000) {
      return; // Can't shoot yet
    }
    
    this.lastShootTime = currentTime;
    
    // Calculate spawn position at the end of the gun
    const spawnPos = new THREE.Vector3();
    this.gunBarrel.getWorldPosition(spawnPos);
    
    // Get forward direction of the vehicle
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    
    // Create the projectile
    this.game.spawnProjectile(spawnPos, forward, 'player', this.weapon);
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    // Visual effect for being hit
    const originalColor = this.bodyMesh.material.color.clone();
    this.bodyMesh.material.color.set(0xffffff);
    
    setTimeout(() => {
      this.bodyMesh.material.color.copy(originalColor);
    }, 100);
    
    if (this.health <= 0) {
      this.destroy();
    }
  }
  
  destroy() {
    // Explode the vehicle
    const explosionGeometry = new THREE.SphereGeometry(5, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.7
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.object.position);
    this.game.scene.add(explosion);
    
    // Add explosion light
    const light = new THREE.PointLight(0xff6600, 2, 15);
    light.position.copy(this.object.position);
    this.game.scene.add(light);
    
    // Eject occupant if any
    if (this.isOccupied && this.occupant) {
      this.occupant.exitVehicle();
      
      // Damage the player when vehicle explodes
      this.occupant.takeDamage(20);
    }
    
    // Remove vehicle from game
    const index = this.game.vehicles.indexOf(this);
    if (index !== -1) {
      this.game.vehicles.splice(index, 1);
      this.game.scene.remove(this.object);
    }
    
    // Fade out and remove explosion effect
    setTimeout(() => {
      const fadeAnimation = setInterval(() => {
        explosionMaterial.opacity -= 0.05;
        light.intensity -= 0.1;
        
        if (explosionMaterial.opacity <= 0) {
          clearInterval(fadeAnimation);
          this.game.scene.remove(explosion);
          this.game.scene.remove(light);
        }
      }, 50);
    }, 500);
  }
}
