class Controls {
    constructor(game) {
      this.game = game;
      this.player = game.player;
      this.keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false,
        jump: false,
        sprint: false,
        action: false,
        switchWeapon: false
      };
      
      // For analog/360 degree movement
      this.movementVector = {
        x: 0, // -1 to 1 for left/right
        z: 0  // -1 to 1 for back/forward
      };
      
      // Controls movement speed without changing direction
      this.movementMagnitude = 0; 
      this.isMoving = false;
      
      // Enhance mouse control variables
      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.mouseTarget = new THREE.Vector3();
      this.mouseDown = false; // Track if mouse button is held down
      this.mouseGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      
      // Mouse control state
      this.isAiming = false;
      this.lastRotationY = 0;
      this.targetRotationY = 0;
      this.rotationDamping = 0.2; // Damping factor for rotation (lower = smoother)
      
      // Movement direction derived from mouse position
      this.mouseDirection = new THREE.Vector3(0, 0, 1);
      
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Set up keyboard controls for desktop
      if (!this.isMobile) {
        this.setupKeyboardControls();
        this.setupMouseControls();
      } else {
        this.setupTouchControls();
      }

      // Add flag to control whether mouse affects camera
      this.mouseControlsCamera = false; // Setting to false so mouse doesn't control camera
    }
    
    setupKeyboardControls() {
      // Add key down event listener
      window.addEventListener('keydown', (e) => {
        switch(e.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.keys.up = true;
            this.isMoving = true;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.keys.down = true;
            this.isMoving = true;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.keys.left = true;
            this.isMoving = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.keys.right = true;
            this.isMoving = true;
            break;
          case 'Space':
            this.keys.jump = true;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.sprint = true;
            break;
          case 'ControlLeft':
          case 'ControlRight':
          case 'Mouse0': // Left mouse button
            this.keys.shoot = true;
            break;
          case 'KeyE':
          case 'KeyF':
            this.keys.action = true;
            break;
          case 'KeyQ':
          case 'Tab':
            this.keys.switchWeapon = true;
            break;
          case 'KeyC':
            this.game.changeCameraMode();
            break;
        }
        
        this.updateMovementMagnitude();
      });
      
      // Add key up event listener
      window.addEventListener('keyup', (e) => {
        switch(e.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.keys.up = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.keys.down = false;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.keys.left = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.keys.right = false;
            break;
          case 'Space':
            this.keys.jump = false;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.sprint = false;
            break;
          case 'ControlLeft':
          case 'ControlRight':
          case 'Mouse0': // Left mouse button
            this.keys.shoot = false;
            break;
          case 'KeyE':
          case 'KeyF':
            if (this.keys.action) {
              this.player.toggleVehicle();
              this.keys.action = false;
            }
            break;
          case 'KeyQ':
          case 'Tab':
            if (this.keys.switchWeapon) {
              this.player.cycleWeapon();
              this.keys.switchWeapon = false;
            }
            break;
        }
        
        this.isMoving = this.keys.up || this.keys.down || this.keys.left || this.keys.right;
        this.updateMovementMagnitude();
      });
      
      // Add mouse control for shooting
      window.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
          this.keys.shoot = true;
          this.mouseDown = true; // Track if mouse is held down for continuous shooting
        } else if (e.button === 2) { // Right mouse button
          this.isAiming = true;
        }
      });
      
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // Left mouse button
          this.keys.shoot = false;
          this.mouseDown = false;
        } else if (e.button === 2) { // Right mouse button
          this.isAiming = false;
        }
      });
      
      // Add interval for processing inputs
      setInterval(() => this.processInputs(), 1000 / 60); // 60fps input processing
    }
    
    setupMouseControls() {
      // Store the center of the screen for reference
      this.screenCenter = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };

      // Handle mouse position for aiming
      window.addEventListener('mousemove', (e) => {
        // Calculate normalized mouse position (-1 to +1)
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        // Update the mouse target for consistent aiming and shooting
        this.updateMouseTarget();
      });
      
      // Update screen center reference on window resize
      window.addEventListener('resize', () => {
        this.screenCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        };
      });
      
      // Prevent context menu
      window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
    
    updateMouseTarget() {
      if (!this.player || this.player.isInVehicle) return;
      
      // Update the raycaster with the camera and mouse position
      this.raycaster.setFromCamera(this.mouse, this.game.camera);
      
      // Calculate the intersection with the ground plane
      const intersection = new THREE.Vector3();
      const didIntersect = this.raycaster.ray.intersectPlane(this.mouseGroundPlane, intersection);
      
      if (didIntersect) {
        // Store the mouse target for reference (useful for projectiles)
        this.mouseTarget.copy(intersection);
        
        // Calculate full direction vector on XZ plane 
        const playerPosition = this.player.object.position.clone();
        
        // Direction vector from player to intersection point
        this.mouseDirection.subVectors(intersection, playerPosition);
        this.mouseDirection.y = 0; // Force Y to 0 to keep on XZ plane
        this.mouseDirection.normalize();
        
        // Calculate the angle based on the direction vector
        const angle = Math.atan2(this.mouseDirection.x, this.mouseDirection.z);
        
        // Update player's aim direction
        this.player.aimDirection = this.mouseDirection.clone();
        
        // Update player's rotation to match the aim direction
        this.player.object.rotation.y = angle;
        
        // Also update player's direction vector to match aim direction
        this.player.direction.copy(this.mouseDirection);
      }
    }
    
    updateRotation(deltaTime) {
      if (!this.player || !this.mouseControlsCamera) return;
      
      // Only update player rotation if mouse should control camera
      // Calculate the rotation difference
      let rotationDiff = this.targetRotationY - this.lastRotationY;
      
      // Normalize the difference to [-π, π]
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Apply damping for smoothness
      const smoothedRotation = this.lastRotationY + rotationDiff * this.rotationDamping;
      
      // Update player rotation
      this.player.object.rotation.y = smoothedRotation;
      
      // Store the current rotation for next frame
      this.lastRotationY = smoothedRotation;
    }
  
    updateMovementMagnitude() {
      // If any movement key is pressed, use full magnitude
      if (this.isMoving) {
        this.movementMagnitude = 1;
      } else {
        this.movementMagnitude = 0;
      }
    }
    
    setMovementTowardsTarget() {
      if (!this.player || this.player.isInVehicle) return;
      
      // Calculate direction from player to target on XZ plane only
      const playerPos = this.player.object.position.clone();
      const targetPos = this.mouseTarget.clone();
      
      // Force the y-component to be the same to ensure we only move on XZ plane
      targetPos.y = playerPos.y;
      
      const direction = new THREE.Vector3()
        .subVectors(targetPos, playerPos)
        .normalize();
      
      // Set movement vector 
      this.movementVector.x = direction.x;
      this.movementVector.z = direction.z;
      
      // Force movement for a short duration
      this.isMoving = true;
      this.movementMagnitude = 1;
      
      // Auto-stop after 500ms
      if (this.moveTimeout) {
        clearTimeout(this.moveTimeout);
      }
      
      this.moveTimeout = setTimeout(() => {
        this.isMoving = false;
        this.movementMagnitude = 0;
      }, 500);
    }
    
    setupTouchControls() {
      // Show mobile controls
      document.getElementById('mobile-controls').classList.remove('hidden');
      
      // Set up the joystick
      const joystickBase = document.getElementById('joystick-base');
      const joystickThumb = document.getElementById('joystick-thumb');
      let joystickActive = false;
      let joystickOrigin = { x: 0, y: 0 };
      let joystickPosition = { x: 0, y: 0 };
      const joystickMaxRadius = 40;
      
      // Set up touch event handlers for joystick
      joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        const touch = e.touches[0];
        const rect = joystickBase.getBoundingClientRect();
        joystickOrigin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        
        updateJoystickPosition(touch.clientX, touch.clientY);
      });
      
      document.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        const touch = Array.from(e.touches).find(t => {
          const rect = joystickBase.getBoundingClientRect();
          return (
            t.clientX >= rect.left - 50 &&
            t.clientX <= rect.right + 50 &&
            t.clientY >= rect.top - 50 &&
            t.clientY <= rect.bottom + 50
          );
        });
        
        if (touch) {
          updateJoystickPosition(touch.clientX, touch.clientY);
        }
      });
      
      document.addEventListener('touchend', (e) => {
        // Check if all touches related to joystick are gone
        const rect = joystickBase.getBoundingClientRect();
        let joystickTouchActive = false;
        
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (
            touch.clientX >= rect.left - 50 &&
            touch.clientX <= rect.right + 50 &&
            touch.clientY >= rect.top - 50 &&
            touch.clientY <= rect.bottom + 50
          ) {
            joystickTouchActive = true;
            break;
          }
        }
        
        if (!joystickTouchActive) {
          joystickActive = false;
          joystickThumb.style.transform = 'translate(0px, 0px)';
          
          // Reset movement vector when joystick is released
          this.movementVector = { x: 0, z: 0 };
        }
      });
      
      const updateJoystickPosition = (touchX, touchY) => {
        let deltaX = touchX - joystickOrigin.x;
        let deltaY = touchY - joystickOrigin.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > joystickMaxRadius) {
          deltaX = deltaX / distance * joystickMaxRadius;
          deltaY = deltaY / distance * joystickMaxRadius;
        }
        
        joystickThumb.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Update movement vector for 360-degree control
        this.movementVector.x = deltaX / joystickMaxRadius;
        this.movementVector.z = -deltaY / joystickMaxRadius; // Invert Y for proper forward/backward
      };
      
      // Set up action buttons
      const jumpBtn = document.getElementById('jump-btn');
      const shootBtn = document.getElementById('shoot-btn');
      const switchWeaponBtn = document.getElementById('switch-weapon-btn');
      const actionBtn = document.getElementById('action-btn');
      const cameraToggleBtn = document.getElementById('camera-toggle-btn');
      
      // Jump button
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.jump = true;
      });
      jumpBtn.addEventListener('touchend', () => {
        this.keys.jump = false;
      });
      
      // Shoot button
      shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.shoot = true;
      });
      shootBtn.addEventListener('touchend', () => {
        this.keys.shoot = false;
      });
      
      // Switch weapon button
      switchWeaponBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.cycleWeapon();
      });
      
      // Action button (enter/exit vehicle)
      actionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.toggleVehicle();
      });
      
      // Camera toggle button
      cameraToggleBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.game.changeCameraMode();
      });
      
      // Long press for sprint
      let sprintTimeout;
      joystickBase.addEventListener('touchstart', () => {
        sprintTimeout = setTimeout(() => {
          this.keys.sprint = true;
        }, 300);
      });
      
      joystickBase.addEventListener('touchend', () => {
        clearTimeout(sprintTimeout);
        this.keys.sprint = false;
      });
      
      // Add interval for processing inputs
      setInterval(() => this.processInputs(), 1000 / 60); // 60fps input processing
    }
    
    processInputs() {
      if (!this.game.isGameActive) return;
      
      // Only update player rotation based on mouse if that feature is enabled
      if (this.mouseControlsCamera) {
        this.updateRotation(16/1000); // Assuming 60fps
      }
  
      // Process movement inputs
      if (this.isMoving) {
        // Calculate movement based on WASD inputs relative to mouse direction
        let moveZ = 0;
        let moveX = 0;
        
        if (this.keys.up) moveZ += 1;
        if (this.keys.down) moveZ -= 1;
        // Use correct directional controls (left is left, right is right)
        if (this.keys.left) moveX -= 1; 
        if (this.keys.right) moveX += 1;
        
        // Normalize for diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
          const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
          moveX /= magnitude;
          moveZ /= magnitude;
        }
        
        // Get forward and right vectors based on player's aim direction
        const forward = this.player.aimDirection.clone();
        const right = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0), // World up vector
          forward
        ).normalize();
        
        // Calculate final movement vector in world space
        // Using right and forward based on aim direction
        const worldMoveX = (right.x * moveX + forward.x * moveZ);
        const worldMoveZ = (right.z * moveX + forward.z * moveZ);
        
        // Apply the movement without updating rotation (it's already set by mouse)
        this.player.move(worldMoveX, worldMoveZ, false);
      } else if (this.movementVector.x !== 0 || this.movementVector.z !== 0) {
        // Handle joystick movement
        this.player.move(this.movementVector.x, this.movementVector.z, false);
      } else {
        this.player.move(0, 0, false);
      }
      
      // Apply sprint
      this.player.sprint(this.keys.sprint);
      
      // Jump if jump key is pressed
      if (this.keys.jump) {
        this.player.jump();
      }
      
      // Shoot if shoot key is pressed
      if (this.mouseDown || this.keys.shoot) {
        if (this.player.isInVehicle && this.player.currentVehicle) {
          this.player.currentVehicle.shoot();
        } else {
          this.player.shoot();
        }
      }
    }
  }