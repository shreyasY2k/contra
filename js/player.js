class Player {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Group();
    this.speed = 10;
    this.sprintMultiplier = 1.7;
    this.isSprinting = false;
    this.sprintStamina = 100; // Add missing sprint stamina property
    this.maxSprintStamina = 100; // Maximum sprint stamina
    this.staminaRegenRate = 10; // Stamina regeneration rate per second
    this.staminaUseRate = 20; // Stamina consumption rate per second
    this.jumpForce = 15;
    this.gravity = 30;
    this.health = 100;
    this.maxHealth = 100;
    this.isJumping = false;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.direction = new THREE.Vector3(0, 0, 1);
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.invulnerabilityTime = 1; // 1 second invulnerability after taking damage
    this.isInVehicle = false;
    this.currentVehicle = null;
    this.canEnterVehicle = null;

    this.weapons = {
      pistol: new Weapon('pistol', 10, 0.5),
      semiAuto: new Weapon('semiAuto', 15, 0.25),
      fullAuto: new Weapon('fullAuto', 8, 0.1),
      grenadeLauncher: new Weapon('grenadeLauncher', 40, 1)
    };

    this.currentWeapon = this.weapons.pistol;
    this.lastShootTime = 0;

    // Add aim direction variable (separate from movement direction)
    this.aimDirection = new THREE.Vector3(0, 0, 1);

    this.createPlayerModel();
    this.updateHealthBar();
    this.updateWeaponInfo();
    this.name = 'Player';
  }

  createPlayerModel() {
    // Create a simple player model
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = 1; // Place bottom of player at ground level

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 2.5;
    headMesh.castShadow = true;

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000cc });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.2, 0);
    leftArm.castShadow = true;

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.2, 0);
    rightArm.castShadow = true;

    // Gun
    const gunGeometry = new THREE.BoxGeometry(0.2, 0.2, 1);
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gunMesh = new THREE.Mesh(gunGeometry, gunMaterial);
    gunMesh.position.set(0.8, 1.2, 0.6);
    gunMesh.castShadow = true;

    // Add all parts to player object
    this.object.add(bodyMesh);
    this.object.add(headMesh);
    this.object.add(leftArm);
    this.object.add(rightArm);
    this.object.add(gunMesh);

    // Add to player properties
    this.bodyMesh = bodyMesh;
    this.headMesh = headMesh;
    this.gunMesh = gunMesh;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    // Set up collider (simple bounding box)
    this.collider = new THREE.Box3().setFromObject(this.object);

    // Set initial position
    this.object.position.set(0, 0, 0);
  }

  // Update this method in your Player class
  update(deltaTime) {
    if (this.isInVehicle) {
      // If in vehicle, update player position to follow vehicle
      if (this.currentVehicle) {
        this.object.position.copy(this.currentVehicle.object.position);
        this.object.position.y += 1; // Sit slightly above vehicle
        this.direction.copy(this.currentVehicle.direction);
      }
      return;
    }

    // Apply gravity
    if (!this.isOnGround()) {
      this.velocity.y -= this.gravity * deltaTime;
    } else if (this.velocity.y < 0) {
      this.velocity.y = 0;
      this.isJumping = false;

      // Position player exactly at ground level
      this.object.position.y = 0; // Assuming ground is at y=0
    }

    // Update position based on velocity - use deltaTime for frame-rate independence
    this.object.position.x += this.velocity.x * deltaTime;
    this.object.position.y += this.velocity.y * deltaTime;
    this.object.position.z += this.velocity.z * deltaTime;

    // Make sure player stays within map boundaries
    const halfMapSize = this.game.mapSize / 2 - 5; // 5 units buffer from edge
    this.object.position.x = Math.max(-halfMapSize, Math.min(halfMapSize, this.object.position.x));
    this.object.position.z = Math.max(-halfMapSize, Math.min(halfMapSize, this.object.position.z));

    // Keep player above ground
    if (this.object.position.y < 0) {
      this.object.position.y = 0;
      this.velocity.y = 0;
      this.isJumping = false;
    }

    // IMPORTANT: Reset horizontal velocity each frame to prevent continuous movement
    // This allows the movement controls to have full control
    // The actual movement velocity is set each frame by the Controls.processInputs method
    // Do NOT reset velocity.y as that would break jumping
    this.velocity.x *= 0.9; // Apply friction instead of immediate stop
    this.velocity.z *= 0.9; // This creates a slight sliding effect that feels natural

    // Update the collider
    this.collider.setFromObject(this.object);

    // Deactivate invulnerability after time expires
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        // Reset material opacity
        this.bodyMesh.material.opacity = 1;
        this.headMesh.material.opacity = 1;
      }
    }

    // Handle sprint stamina regeneration/consumption
    if (this.isSprinting && this.sprintStamina > 0) {
      // Consume stamina while sprinting
      this.sprintStamina = Math.max(0, this.sprintStamina - this.staminaUseRate * deltaTime);
      
      // If stamina is depleted, stop sprinting
      if (this.sprintStamina <= 0) {
        this.isSprinting = false;
      }
    } else if (!this.isSprinting && this.sprintStamina < this.maxSprintStamina) {
      // Regenerate stamina when not sprinting
      this.sprintStamina = Math.min(this.maxSprintStamina, this.sprintStamina + this.staminaRegenRate * deltaTime);
    }
    
    // Update stamina bar on screen
    this.updateStaminaBar();
  }

  // Updated move method for the Player class
  move(direction, sprint = false) {
    if (this.isInVehicle) {
      if (this.currentVehicle) {
        this.currentVehicle.move(direction);
      }
      return;
    }

    // Apply sprint if available
    const isSprinting = sprint && this.sprintStamina > 0;
    this.isSprinting = isSprinting;

    const moveSpeed = this.speed * (isSprinting ? this.sprintMultiplier : 1.0);

    // Play appropriate animation
    if (this.playAnimation) {
      this.playAnimation(isSprinting ? 'sprint' : 'run');
    }

    // Apply movement based on direction
    switch (direction) {
      case 'forward':
        // Move in the direction the player is facing
        this.velocity.x = Math.sin(this.object.rotation.y) * moveSpeed;
        this.velocity.z = Math.cos(this.object.rotation.y) * moveSpeed;
        break;
      case 'backward':
        // Move opposite to the direction the player is facing
        this.velocity.x = -Math.sin(this.object.rotation.y) * moveSpeed * 0.7; // Slower backward movement
        this.velocity.z = -Math.cos(this.object.rotation.y) * moveSpeed * 0.7;
        break;
      case 'left':
        // Strafe left (perpendicular to facing direction)
        this.velocity.x = Math.sin(this.object.rotation.y - Math.PI / 2) * moveSpeed * 0.8;
        this.velocity.z = Math.cos(this.object.rotation.y - Math.PI / 2) * moveSpeed * 0.8;
        break;
      case 'right':
        // Strafe right (perpendicular to facing direction)
        this.velocity.x = Math.sin(this.object.rotation.y + Math.PI / 2) * moveSpeed * 0.8;
        this.velocity.z = Math.cos(this.object.rotation.y + Math.PI / 2) * moveSpeed * 0.8;
        break;
      default:
        // No movement
        this.velocity.x = 0;
        this.velocity.z = 0;
    }
  }

  moveWithJoystick(x, y, sprint = false) {
    if (this.isInVehicle) {
      if (this.currentVehicle) {
        this.currentVehicle.moveWithJoystick(x, y);
      }
      return;
    }

    // Apply sprint if available
    const isSprinting = sprint && this.sprintStamina > 0;
    this.isSprinting = isSprinting;

    const moveSpeed = this.speed * (isSprinting ? this.sprintMultiplier : 1.0);

    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
      // Play appropriate animation
      if (this.playAnimation) {
        this.playAnimation(isSprinting ? 'sprint' : 'run');
      }

      // Determine if joystick should control rotation
      if (!this.isAimingWithMouse) {
        // Calculate rotation angle (note: x and y are already reversed in updateJoystickPosition)
        // So we don't reverse them again here
        const angle = Math.atan2(x, y);
        this.object.rotation.y = angle;

        // Update direction vectors
        this.direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
        this.aimDirection = this.direction.clone();
      }

      // Calculate movement velocity based on joystick input
      const joystickMagnitude = Math.min(1, Math.sqrt(x * x + y * y));
      const currentAngle = this.object.rotation.y;

      // Calculate velocity (x,y values are already reversed, so use them directly)
      this.velocity.x = Math.sin(currentAngle) * y * moveSpeed + Math.sin(currentAngle + Math.PI / 2) * x * moveSpeed;
      this.velocity.z = Math.cos(currentAngle) * y * moveSpeed + Math.cos(currentAngle + Math.PI / 2) * x * moveSpeed;
    } else {
      // No movement, play idle animation
      this.velocity.x = 0;
      this.velocity.z = 0;

      if (this.playAnimation) {
        this.playAnimation('idle');
      }
    }
  }

  // Method to set mouse target for aiming
  setMouseTarget(mousePosition, camera) {
    // Convert mouse position to 3D space
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
  
    // Create a plane at player's height for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    const target = new THREE.Vector3();
  
    raycaster.ray.intersectPlane(groundPlane, target);
  
    // Store target for targeting
    this.mouseTarget = target.clone();
    this.isAimingWithMouse = true;
  
    // Don't rotate player if in vehicle - vehicle will handle its own turret rotation
    if (!this.isInVehicle) {
      // Calculate direction to target in the XZ plane
      const direction = new THREE.Vector3()
        .subVectors(target, this.object.position)
        .normalize();
  
      // Ensure the y component is zero to keep rotation on the horizontal plane
      direction.y = 0;
  
      // Store this direction vector for precise targeting
      this.aimDirection = direction.clone();
  
      if (direction.length() > 0.01) {
        // Calculate target angle
        const targetAngle = Math.atan2(direction.x, direction.z);
  
        // Apply smoothing to avoid twitchy rotation
        const smoothingFactor = 0.15; // Adjust for desired responsiveness
        let currentAngle = this.object.rotation.y;
  
        // Calculate angle difference (handling wraparound at ±π)
        let angleDiff = targetAngle - currentAngle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
        // Apply smoothed rotation
        const newRotation = currentAngle + angleDiff * smoothingFactor;
        this.object.rotation.y = newRotation;
  
        // Update direction vector for movement
        this.direction = new THREE.Vector3(Math.sin(newRotation), 0, Math.cos(newRotation));
      }
    } else if (this.currentVehicle) {
      // Just share the target with the vehicle for turret aiming
      this.currentVehicle.targetPosition = target.clone();
    }
  
    return target;
  }

  jump() {
    if (!this.isJumping && this.isOnGround()) {
      this.velocity.y = this.jumpForce;
      this.isJumping = true;
    }
  }

  sprint(isSprinting) {
    this.isSprinting = isSprinting;
  }

  // Update shoot method to pass keys to vehicle
  shoot() {
    if (this.isInVehicle && this.currentVehicle) {
      // Store shoot state for vehicle to use
      this.keys = this.keys || {};
      this.keys.shoot = true;
      
      // Vehicle will handle the shooting in its update method
      return;
    }
    
    const currentTime = Date.now();
    if (currentTime - this.lastShootTime < this.currentWeapon.fireRate * 1000) {
      return; // Can't shoot yet
    }

    this.lastShootTime = currentTime;

    // Calculate spawn position at the end of the gun
    const spawnPos = new THREE.Vector3();
    this.gunMesh.getWorldPosition(spawnPos);

    let forward;
    
    // If player has mouse target, shoot directly at that point
    if (this.mouseTarget) {
      // Calculate direction from gun to target
      forward = new THREE.Vector3()
        .subVectors(this.mouseTarget, spawnPos)
        .normalize();
    } else {
      // Fallback to current aim direction
      forward = this.aimDirection.clone();
    }

    // Create the projectile with the correct direction
    this.game.spawnProjectile(spawnPos, forward, 'player', this.currentWeapon);
  }

  fireWeapon() {
    // For compatibility with the renamed method - just call shoot
    this.shoot();
  }

  cycleWeapon() {
    const weaponTypes = ['pistol', 'semiAuto', 'fullAuto', 'grenadeLauncher'];
    const currentIndex = weaponTypes.indexOf(this.currentWeapon.type);
    const nextIndex = (currentIndex + 1) % weaponTypes.length;
    this.currentWeapon = this.weapons[weaponTypes[nextIndex]];
    this.updateWeaponInfo();
  }

  enterVehicle(vehicle) {
    if (vehicle && !vehicle.isOccupied) {
      this.isInVehicle = true;
      this.currentVehicle = vehicle;
      vehicle.isOccupied = true;
      vehicle.occupant = this;

      // Instead of hiding player mesh, move it to the vehicle's position
      this.object.position.copy(vehicle.object.position);
      this.object.position.y += 1; // Sitting height
      
      // Make player transparent but still visible
      this.bodyMesh.material.transparent = true;
      this.bodyMesh.material.opacity = 0.3;
      this.headMesh.material.transparent = true;
      this.headMesh.material.opacity = 0.3;
      
      // Notify player they've entered a vehicle
      this.showMessage("Press E to exit vehicle");
    }
  }

  exitVehicle() {
    if (this.isInVehicle && this.currentVehicle) {
      this.isInVehicle = false;
      this.currentVehicle.isOccupied = false;
      this.currentVehicle.occupant = null;

      // Position player next to vehicle with safe distance
      const vehiclePos = this.currentVehicle.object.position.clone();
      const exitOffset = new THREE.Vector3(2, 0, 2); // Default offset
      
      // Use vehicle's direction to determine a better exit position
      if (this.currentVehicle.direction) {
        // Calculate a position to the side of the vehicle
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.currentVehicle.object.quaternion);
        exitOffset.copy(right.multiplyScalar(3)); // Exit 3 units to the right
      }
      
      this.object.position.set(
        vehiclePos.x + exitOffset.x,
        0,
        vehiclePos.z + exitOffset.z
      );

      this.currentVehicle = null;

      // Restore player visibility
      this.bodyMesh.material.transparent = false;
      this.bodyMesh.material.opacity = 1;
      this.headMesh.material.transparent = false;
      this.headMesh.material.opacity = 1;
    }
  }

  toggleVehicle() {
    if (this.isInVehicle) {
      this.exitVehicle();
    } else if (this.canEnterVehicle) {
      this.enterVehicle(this.canEnterVehicle);
    }
  }

  takeDamage(amount) {
    if (this.isInvulnerable) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }

    // Update health bar
    this.updateHealthBar();

    // Make player briefly invulnerable
    this.isInvulnerable = true;
    this.invulnerabilityTimer = this.invulnerabilityTime;

    // Visual effect for being hit
    this.bodyMesh.material.opacity = 0.5;
    this.headMesh.material.opacity = 0.5;
  }

  die() {
    console.log('Player died');
    // Trigger game over
    this.game.gameOver();
  }

  isOnGround() {
    // Simple ground check - assuming ground is at y=0
    return this.object.position.y <= 0.1;
  }

  getDirection() {
    return this.direction;
  }

  updateHealthBar() {
    const healthPercentage = this.health / this.maxHealth * 100;
    document.getElementById('health-bar-fill').style.width = `${healthPercentage}%`;

    // Change color based on health percentage
    let color = '#00ff00'; // Green
    if (healthPercentage < 30) {
      color = '#ff0000'; // Red when low health
    } else if (healthPercentage < 60) {
      color = '#ffff00'; // Yellow for medium health
    }
    document.getElementById('health-bar-fill').style.backgroundColor = color;
  }

  updateWeaponInfo() {
    // Update weapon text in the HUD
    const weaponNames = {
      pistol: 'Pistol',
      semiAuto: 'Semi Auto',
      fullAuto: 'Full Auto',
      grenadeLauncher: 'Grenades'
    };
    document.getElementById('current-weapon').textContent = weaponNames[this.currentWeapon.type];
  }

  checkCollision(object) {
    // Simple collision detection with bounding boxes
    const objectBox = new THREE.Box3().setFromObject(object);
    return this.collider.intersectsBox(objectBox);
  }

  // Add a method to update the stamina bar
  updateStaminaBar() {
    const staminaBar = document.getElementById('stamina-bar');
    if (staminaBar) {
      const staminaPercentage = (this.sprintStamina / this.maxSprintStamina) * 100;
      staminaBar.style.width = `${staminaPercentage}%`;
      
      // Change color based on stamina level
      if (staminaPercentage < 20) {
        staminaBar.style.backgroundColor = 'rgba(255, 0, 0, 0.6)'; // Red when low
      } else if (staminaPercentage < 50) {
        staminaBar.style.backgroundColor = 'rgba(255, 165, 0, 0.6)'; // Orange for medium
      } else {
        staminaBar.style.backgroundColor = 'rgba(255, 255, 0, 0.6)'; // Yellow for high
      }
    }
  }

  // Add a method to show temporary messages to the player
  showMessage(text, duration = 3000) {
    // Check if a message element already exists
    let messageElement = document.getElementById('player-message');
    
    // If not, create a new one
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'player-message';
      document.body.appendChild(messageElement);
    }
    
    // Update the message
    messageElement.textContent = text;
    messageElement.style.opacity = '1';
    
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // Set a timeout to fade out the message
    this.messageTimeout = setTimeout(() => {
      messageElement.style.opacity = '0';
    }, duration);
  }

  checkWorldCollision(object) {
    // Get the actual bounds of the object for precise collision detection
    const objectBox = new THREE.Box3().setFromObject(object);
    
    // Get the current player collider
    const playerBox = this.collider.clone();
    
    // Create a predicted box based on velocity
    const predictedBox = playerBox.clone();
    const velocityVector = new THREE.Vector3(
      this.velocity.x * 0.1,
      0,
      this.velocity.z * 0.1
    );
    
    // Translate the predicted box
    predictedBox.min.add(velocityVector);
    predictedBox.max.add(velocityVector);
    
    // Check for intersection with the obstacle's exact bounds
    return predictedBox.intersectsBox(objectBox);
  }

  handleObstacleCollision(obstacle) {
    // Get obstacle bounding box - using the actual mesh bounds
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    
    // Get the player's current bounding box
    const playerBox = this.collider.clone();
    
    // Get penetration depth in each axis
    const xOverlap = Math.min(
      playerBox.max.x - obstacleBox.min.x,
      obstacleBox.max.x - playerBox.min.x
    );
    
    const zOverlap = Math.min(
      playerBox.max.z - obstacleBox.min.z,
      playerBox.max.z - obstacleBox.min.z
    );
    
    // Determine direction of collision - this is crucial for accurate resolution
    const playerCenter = new THREE.Vector3();
    playerBox.getCenter(playerCenter);
    
    const obstacleCenter = new THREE.Vector3();
    obstacleBox.getCenter(obstacleCenter);
    
    const direction = new THREE.Vector3().subVectors(playerCenter, obstacleCenter);
    
    // Determine which axis to resolve based on overlap and player movement
    // Use the smaller overlap for minimal displacement
    if (xOverlap < zOverlap) {
      // X-axis collision
      const xDir = Math.sign(direction.x); // +1 if player is to the right, -1 if to the left
      this.object.position.x += xDir * xOverlap + (xDir * 0.1); // Small buffer to prevent sticking
      this.velocity.x = 0;
    } else {
      // Z-axis collision
      const zDir = Math.sign(direction.z); // +1 if player is in front, -1 if behind
      this.object.position.z += zDir * zOverlap + (zDir * 0.1); // Small buffer to prevent sticking
      this.velocity.z = 0;
    }
    
    // Update collider after repositioning
    this.collider.setFromObject(this.object);
  }

  // Add method to set player color
  setColor(colorString) {
    // Convert color string to THREE.js color
    let color;
    
    if (colorString.startsWith('#')) {
      // Hex color
      color = new THREE.Color(colorString);
    } else {
      // Named color
      switch(colorString.toLowerCase()) {
        case 'red': color = new THREE.Color(0xff0000); break;
        case 'green': color = new THREE.Color(0x00ff00); break;
        case 'blue': color = new THREE.Color(0x0000ff); break;
        case 'yellow': color = new THREE.Color(0xffff00); break;
        case 'orange': color = new THREE.Color(0xff8800); break;
        case 'purple': color = new THREE.Color(0x8800ff); break;
        case 'pink': color = new THREE.Color(0xff0088); break;
        default: color = new THREE.Color(0x0000ff); // Default blue
      }
    }
    
    // Apply color to player meshes
    if (this.bodyMesh) {
      this.bodyMesh.material.color = color;
    }
    
    // Also update arm color (slightly darker version of body color)
    if (this.leftArm && this.rightArm) {
      const armColor = color.clone().multiplyScalar(0.8);
      this.leftArm.material.color = armColor;
      this.rightArm.material.color = armColor;
    }
  }
}
