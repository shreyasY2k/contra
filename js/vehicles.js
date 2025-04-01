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
    
    // Ensure vehicle stays on ground level
    this.object.position.y = 0;
    
    // Update collider
    this.collider.setFromObject(this.object);

    // Reset velocity (vehicle stops when no input)
    this.velocity.x *= 0.95; // Friction effect
    this.velocity.z *= 0.95;
    
    // Improved gun rotation towards the mouse target or closest enemy
    if (this.isOccupied && this.occupant) {
      if (this.occupant.mouseTarget) {
        // Get gun base position in world space
        const gunBasePos = new THREE.Vector3();
        this.gunBase.getWorldPosition(gunBasePos);
        
        // Calculate direction to mouse target
        const targetDirection = new THREE.Vector3()
          .subVectors(this.occupant.mouseTarget, gunBasePos)
          .normalize();
        
        // Keep gun level with ground (zero out Y component and renormalize)
        targetDirection.y = 0;
        if (targetDirection.length() > 0.001) {
          targetDirection.normalize();
          
          // Calculate the world rotation needed for the gun to face the target
          // Convert from world space to local space for the turret rotation
          const worldQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), // Forward vector
            targetDirection // Target direction
          );
          
          // Remove the parent's rotation influence to get local rotation
          const parentWorldQuat = new THREE.Quaternion();
          this.object.getWorldQuaternion(parentWorldQuat);
          parentWorldQuat.invert(); // Invert to cancel parent rotation
          
          // Calculate desired local rotation
          const localQuat = new THREE.Quaternion().multiplyQuaternions(parentWorldQuat, worldQuat);
          
          // Extract Euler rotation (Y-axis only for turret)
          const euler = new THREE.Euler().setFromQuaternion(localQuat);
          
          // Apply rotation to gun base (turret)
          this.gunBase.rotation.y = euler.y;
        }
      } else {
        // If no mouse target, look for nearest enemy
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
          // Same rotation logic but targeting the closest enemy
          const gunBasePos = new THREE.Vector3();
          this.gunBase.getWorldPosition(gunBasePos);
          
          const targetDirection = new THREE.Vector3()
            .subVectors(closestEnemy.object.position, gunBasePos)
            .normalize();
          
          // Keep level with ground
          targetDirection.y = 0;
          if (targetDirection.length() > 0.001) {
            targetDirection.normalize();
            
            // Convert to local rotation
            const worldQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              targetDirection
            );
            
            const parentWorldQuat = new THREE.Quaternion();
            this.object.getWorldQuaternion(parentWorldQuat);
            parentWorldQuat.invert();
            
            const localQuat = new THREE.Quaternion().multiplyQuaternions(parentWorldQuat, worldQuat);
            const euler = new THREE.Euler().setFromQuaternion(localQuat);
            
            // Apply rotation
            this.gunBase.rotation.y = euler.y;
          }
        }
      }
      
      // Process shooting for vehicle
      if (this.occupant.keys && this.occupant.keys.shoot) {
        this.shoot();
      }
    }
    
    // Apply exponential friction to simulate better vehicle physics
    const friction = 0.93;
    this.velocity.x *= friction;
    this.velocity.z *= friction;
  }
  
  move(direction) {
    // Get the vehicle's forward direction based on its rotation
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.object.quaternion);
    
    // Set a base speed for the vehicle type
    const vehicleSpeed = this.speed;
    const turnRate = 0.08; // Increased for more responsive turning
    
    // Calculate movement direction
    switch(direction) {
      case 'forward':
        this.velocity.x = forward.x * vehicleSpeed;
        this.velocity.z = forward.z * vehicleSpeed;
        break;
      case 'backward':
        this.velocity.x = -forward.x * vehicleSpeed * 0.7;
        this.velocity.z = -forward.z * vehicleSpeed * 0.7;
        break;
      case 'left':
        // Turn vehicle left - increase turn rate for better responsiveness
        this.object.rotation.y += turnRate;
        
        // Add slight forward momentum while turning for better control
        if (this.velocity.length() < 0.1) {
          this.velocity.x = forward.x * vehicleSpeed * 0.2;
          this.velocity.z = forward.z * vehicleSpeed * 0.2;
        }
        break;
      case 'right':
        // Turn vehicle right - increase turn rate for better responsiveness
        this.object.rotation.y -= turnRate;
        
        // Add slight forward momentum while turning for better control
        if (this.velocity.length() < 0.1) {
          this.velocity.x = forward.x * vehicleSpeed * 0.2;
          this.velocity.z = forward.z * vehicleSpeed * 0.2;
        }
        break;
    }
    
    // Update direction based on current rotation
    this.direction = forward.clone();
  }
  
  moveWithJoystick(x, z) {
    // Direct control using joystick input
    // z is forward/backward, x is left/right turning
    
    // Forward/backward movement
    if (Math.abs(z) > 0.1) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
      this.velocity.x = forward.x * z * this.speed;
      this.velocity.z = forward.z * z * this.speed;
    }
    
    // Left/right turning (not strafing)
    if (Math.abs(x) > 0.1) {
      // Turn rate is proportional to joystick movement but more responsive
      this.object.rotation.y += x * 0.08;
      
      // Add slight forward momentum for better control while turning with joystick
      if (this.velocity.length() < 0.1) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
        this.velocity.x = forward.x * this.speed * 0.2;
        this.velocity.z = forward.z * this.speed * 0.2;
      }
    }
    
    // Update direction based on current rotation
    const newForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    this.direction.copy(newForward);
  }
  
  shoot() {
    if (!this.isOccupied) return;
    
    const currentTime = Date.now();
    if (!this.lastShootTime || currentTime - this.lastShootTime < this.weapon.fireRate * 1000) {
      this.lastShootTime = currentTime;
      return; // Can't shoot yet
    }
    
    this.lastShootTime = currentTime;
    
    // Calculate spawn position at the end of the gun barrel in world space
    const spawnPos = new THREE.Vector3();
    this.gunBarrel.getWorldPosition(spawnPos);
    
    // Calculate the world forward direction of the gun barrel
    const barrelDirection = new THREE.Vector3(0, 0, 1);
    barrelDirection.applyQuaternion(this.gunBarrel.getWorldQuaternion(new THREE.Quaternion()));
    
    // Ensure the direction is properly normalized and level with ground
    barrelDirection.y = 0;
    barrelDirection.normalize();
    
    // Use this direction for shooting
    const forward = barrelDirection;
    
    // Create the projectile with the exact turret direction
    this.game.spawnProjectile(spawnPos, forward, 'player', this.weapon);
    
    // Add visual feedback (muzzle flash)
    this.createMuzzleFlash(spawnPos, forward);
  }
  
  createMuzzleFlash(position, direction) {
    // Create a quick muzzle flash effect
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9900,
      transparent: true,
      opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    
    // Add point light
    const light = new THREE.PointLight(0xff9900, 5, 3);
    light.position.copy(position);
    
    this.game.scene.add(flash);
    this.game.scene.add(light);
    
    // Fade out and remove after a short time
    let opacity = 0.8;
    const fadeInterval = setInterval(() => {
      opacity -= 0.1;
      flashMaterial.opacity = opacity;
      light.intensity = opacity * 5;
      
      if (opacity <= 0) {
        clearInterval(fadeInterval);
        this.game.scene.remove(flash);
        this.game.scene.remove(light);
      }
    }, 30);
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

  checkCollision(object) {
    // Get the exact bounds of both objects for precise collision
    const vehicleBox = this.collider;
    const objectBox = new THREE.Box3().setFromObject(object);
    
    // Return true only if the actual bounds intersect
    return vehicleBox.intersectsBox(objectBox);
  }

  handleObstacleCollision(obstacle) {
    // Get precise obstacle bounding box
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    
    // Get the vehicle's current bounding box
    const vehicleBox = this.collider.clone();
    
    // Calculate centers for determining collision direction
    const vehicleCenter = new THREE.Vector3();
    vehicleBox.getCenter(vehicleCenter);
    
    const obstacleCenter = new THREE.Vector3();
    obstacleBox.getCenter(obstacleCenter);
    
    // Vector pointing from obstacle to vehicle
    const direction = new THREE.Vector3().subVectors(vehicleCenter, obstacleCenter);
    
    // Calculate overlap in each direction
    const xOverlap = Math.min(
      vehicleBox.max.x - obstacleBox.min.x,
      obstacleBox.max.x - vehicleBox.min.x
    );
    
    const zOverlap = Math.min(
      vehicleBox.max.z - obstacleBox.min.z,
      obstacleBox.max.z - vehicleBox.min.z
    );
    
    // Apply the smaller correction to minimize movement disruption
    if (xOverlap < zOverlap) {
      // X-axis collision
      const xDir = Math.sign(direction.x);
      this.object.position.x += xDir * xOverlap + (xDir * 0.1); // Small extra padding
      this.velocity.x = 0;
    } else {
      // Z-axis collision
      const zDir = Math.sign(direction.z);
      this.object.position.z += zDir * zOverlap + (zDir * 0.1); // Small extra padding
      this.velocity.z = 0;
    }
    
    // Update collider after position change
    this.collider.setFromObject(this.object);
  }
}
