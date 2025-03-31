class Player {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Group();
    this.speed = 10;
    this.sprintMultiplier = 1.7;
    this.isSprinting = false;
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

    // Store target for shooting
    this.mouseTarget = target.clone();
    this.isAimingWithMouse = true;

    // Don't rotate player if in vehicle
    if (!this.isInVehicle) {
      // Calculate direction to target in the XZ plane
      const direction = new THREE.Vector3()
        .subVectors(target, this.object.position)
        .normalize();

      // Ensure the y component is zero to keep rotation on the horizontal plane
      direction.y = 0;

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

        // Update direction vectors
        this.direction = new THREE.Vector3(Math.sin(newRotation), 0, Math.cos(newRotation));
        this.aimDirection = this.direction.clone();
      }
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

  shoot() {
    const currentTime = Date.now();
    if (currentTime - this.lastShootTime < this.currentWeapon.fireRate * 1000) {
      return; // Can't shoot yet
    }

    this.lastShootTime = currentTime;

    // Calculate spawn position at the end of the gun
    const spawnPos = new THREE.Vector3();
    this.gunMesh.getWorldPosition(spawnPos);

    // Use the player's aim direction for shooting direction
    // This ensures bullets go toward the exact point the player is aiming at
    const forward = this.aimDirection.clone();

    // Create the projectile with the correct direction
    this.game.spawnProjectile(spawnPos, forward, 'player', this.currentWeapon);
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

      // Hide player mesh when in vehicle
      this.object.visible = false;
    }
  }

  exitVehicle() {
    if (this.isInVehicle && this.currentVehicle) {
      this.isInVehicle = false;
      this.currentVehicle.isOccupied = false;
      this.currentVehicle.occupant = null;

      // Position player next to vehicle
      const vehiclePos = this.currentVehicle.object.position.clone();
      this.object.position.set(
        vehiclePos.x + 2,
        0,
        vehiclePos.z + 2
      );

      this.currentVehicle = null;

      // Show player mesh again
      this.object.visible = true;
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
    // Game over logic would go here
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
}
