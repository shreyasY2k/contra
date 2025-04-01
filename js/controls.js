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

    this.isMoving = false;

    // Mouse aim properties
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.mouseTarget = new THREE.Vector3();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.isAimingWithMouse = false;

    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Set up appropriate controls
    if (!this.isMobile) {
      this.setupKeyboardControls();
      this.setupMouseControls();
    } else {
      this.setupTouchControls();
    }

    // Start input processing
    setInterval(() => this.processInputs(), 1000 / 60);
  }

  setupKeyboardControls() {
    // Add key down event listener
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
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
    });

    // Add key up event listener
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
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
    });
  }

  setupMouseControls() {
    // Handle mouse movement for aiming
    window.addEventListener('mousemove', (e) => {
      // Convert mouse coordinates to normalized device coordinates (-1 to +1)
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Flag to indicate we're now using mouse aiming
      this.isAimingWithMouse = true;
      
      // Update player's aim direction
      this.updateMouseTarget();
    });

    // Mouse controls for shooting
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        // Update aim one more time on click to ensure accuracy
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.updateMouseTarget();
        
        this.keys.shoot = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { // Left mouse button
        this.keys.shoot = false;
      }
    });

    // Prevent context menu
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  updateMouseTarget() {
    if (!this.player) return;

    // Update the raycaster with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    
    // Check if we're aiming at an enemy first
    const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);
    
    // Flag for whether we've found an enemy to aim at
    let foundTarget = false;
    
    // Process intersections to see if we hit an enemy
    for (let i = 0; i < intersects.length; i++) {
      const object = intersects[i].object;
      
      // Traverse up the parent chain to find the root object
      let parent = object;
      while (parent.parent && parent.parent !== this.game.scene) {
        parent = parent.parent;
      }
      
      // Check if this object belongs to an enemy
      const enemyIndex = this.game.enemies.findIndex(enemy => enemy.object === parent);
      
      if (enemyIndex >= 0) {
        // We found an enemy, use its position as target
        const enemyPos = this.game.enemies[enemyIndex].object.position.clone();
        
        // Adjust height to aim at enemy center
        enemyPos.y += 1;
        
        // Create a new mouse position that would point directly to this enemy
        const enemyScreenPos = enemyPos.clone().project(this.game.camera);
        this.mouse.x = enemyScreenPos.x;
        this.mouse.y = enemyScreenPos.y;
        
        foundTarget = true;
        break;
      }
    }
    
    // Now set the mouse target - whether in vehicle or not
    this.player.setMouseTarget(this.mouse, this.game.camera);
  }

  setupTouchControls() {
    // Show mobile controls
    document.getElementById('mobile-controls').classList.remove('hidden');

    // Get joystick elements
    const joystickBase = document.getElementById('joystick-base');
    const joystickThumb = document.getElementById('joystick-thumb');

    if (!joystickBase || !joystickThumb) {
      console.error('Joystick elements not found!');
      return;
    }

    const joystickContainer = document.getElementById('joystick-area') || document.getElementById('joystick-container');
    if (!joystickContainer) {
      console.error('Joystick container not found!');
      return;
    }

    let joystickActive = false;
    let joystickTouchId = null;
    let joystickOrigin = { x: 0, y: 0 };
    const joystickMaxRadius = 40;

    // Initialize joystick origin position
    const joystickRect = joystickBase.getBoundingClientRect();
    joystickOrigin = {
      x: joystickRect.left + joystickRect.width / 2,
      y: joystickRect.top + joystickRect.height / 2
    };

    // Function to update joystick position and movement vector
    const updateJoystickPosition = (touchX, touchY) => {
      let deltaX = touchX - joystickOrigin.x;
      let deltaY = touchY - joystickOrigin.y;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > joystickMaxRadius) {
        deltaX = deltaX / distance * joystickMaxRadius;
        deltaY = deltaY / distance * joystickMaxRadius;
      }

      joystickThumb.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // COMPLETELY REVERSED: Joystick values are now completely reversed
      // This inverts both X and Y axes from what's shown visually
      this.movementVector.x = -deltaX / joystickMaxRadius; // REVERSED: negative X
      this.movementVector.z = -deltaY / joystickMaxRadius; // REVERSED: negative Y

      this.isMoving = distance > 0.1 * joystickMaxRadius;
    };

    // Function to check if an element is part of the joystick
    const isJoystickElement = (element) => {
      return element === joystickBase || element === joystickThumb ||
        element === joystickContainer || joystickContainer.contains(element);
    };

    // Set up joystick touch handlers
    joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!joystickActive) {
        joystickActive = true;
        const touch = e.targetTouches[0];
        joystickTouchId = touch.identifier;

        // Re-calculate joystick origin on each touch start to handle repositioning
        const rect = joystickBase.getBoundingClientRect();
        joystickOrigin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };

        updateJoystickPosition(touch.clientX, touch.clientY);
      }
    });

    // Handle touchmove for joystick
    document.addEventListener('touchmove', (e) => {
      // Find joystick touch
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (joystickActive && touch.identifier === joystickTouchId) {
          e.preventDefault();
          updateJoystickPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });

    // Handle touch end for joystick
    document.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
          joystickActive = false;
          joystickTouchId = null;
          joystickThumb.style.transform = 'translate(0px, 0px)';

          // Reset movement vector
          this.movementVector = { x: 0, z: 0 };
          this.isMoving = false;
          break;
        }
      }
    });

    // Setup touch-based aiming (separate from joystick)
    let aimTouchId = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    // Touch sensitivity for rotation
    const touchSensitivity = 0.005;

    // Handle touchstart for aiming
    document.addEventListener('touchstart', (e) => {
      if (aimTouchId !== null) return;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const target = touch.target;

        // Skip if touch is on joystick or action buttons
        if (isJoystickElement(target) || target.closest('#action-buttons')) {
          continue;
        }

        // This touch is for aiming
        aimTouchId = touch.identifier;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;

        // Convert touch to normalized coordinates for raycasting
        const x = (touch.clientX / window.innerWidth) * 2 - 1;
        const y = -(touch.clientY / window.innerHeight) * 2 + 1;

        // Update mouse coordinates for raycasting
        this.mouse.x = x;
        this.mouse.y = y;
        this.isAimingWithMouse = true;

        // Update aim target
        this.updateMouseTarget();

        break;
      }
    });

    // Handle touchmove for aiming
    document.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === aimTouchId) {
          e.preventDefault();

          // For minimal movement, don't update aim
          const deltaX = touch.clientX - lastTouchX;
          const deltaY = touch.clientY - lastTouchY;
          const movementThreshold = 3; // Pixels

          if (Math.abs(deltaX) > movementThreshold || Math.abs(deltaY) > movementThreshold) {
            // Update last position
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;

            // Convert touch to normalized coordinates
            const x = (touch.clientX / window.innerWidth) * 2 - 1;
            const y = -(touch.clientY / window.innerHeight) * 2 + 1;

            // Update mouse position for raycasting
            this.mouse.x = x;
            this.mouse.y = y;

            // Update aim target
            this.updateMouseTarget();
          }

          break;
        }
      }
    }, { passive: false });

    // Handle touchend for aiming
    document.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === aimTouchId) {
          aimTouchId = null;
          break;
        }
      }
    });

    // Setup action buttons
    this.setupActionButtons();
  }

  setupActionButtons() {
    // Prevent action buttons from triggering aiming
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(button => {
      button.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });
    });

    // Jump button
    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.jump = true;
      });
      jumpBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        this.keys.jump = false;
      });
    }

    // Shoot button
    const shootBtn = document.getElementById('shoot-btn');
    if (shootBtn) {
      shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.shoot = true;
      });
      shootBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        this.keys.shoot = false;
      });
    }

    // Switch weapon button
    const switchWeaponBtn = document.getElementById('switch-weapon-btn');
    if (switchWeaponBtn) {
      switchWeaponBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.player.cycleWeapon();
      });
    }

    // Action button
    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.player.toggleVehicle();
      });
    }

    // Camera toggle button
    const cameraToggleBtn = document.getElementById('camera-toggle-btn');
    if (cameraToggleBtn) {
      cameraToggleBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.game.changeCameraMode();
      });
    }

    // Add sprint button functionality
    const sprintBtn = document.getElementById('switch-weapon-btn');  // Reuse weapon button as dual-function
    if (sprintBtn) {
      // Long press for sprint
      let sprintPressTimer;
      
      sprintBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // On quick tap, switch weapon
        sprintPressTimer = setTimeout(() => {
          // Start sprinting on long press
          this.keys.sprint = true;
          // Visual feedback
          sprintBtn.textContent = 'SPRINT';
          sprintBtn.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        }, 300); // Long press threshold
      });
      
      sprintBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        clearTimeout(sprintPressTimer);
        
        if (this.keys.sprint) {
          // Was sprinting, stop sprint
          this.keys.sprint = false;
          // Reset button appearance
          sprintBtn.textContent = 'WPN';
          sprintBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        } else {
          // Quick tap, cycle weapon
          this.player.cycleWeapon();
        }
      });
    }
  }

  processInputs() {
    if (!this.game.isGameActive || !this.player) return;

    // Pass the key states to the player for vehicle control
    this.player.keys = this.keys;

    // IMPORTANT: Reset velocity at the start of each frame
    // This ensures the player stops when no keys are pressed
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;

    // Process keyboard movement
    if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
      let direction = '';

      if (this.keys.up) direction = 'forward';
      else if (this.keys.down) direction = 'backward';
      else if (this.keys.left) direction = 'left';
      else if (this.keys.right) direction = 'right';

      // Pass the sprint state to the move method
      this.player.move(direction, this.keys.sprint);
    }
    // Process joystick movement with sprint support 
    else if (this.isMoving && (this.movementVector.x !== 0 || this.movementVector.z !== 0)) {
      // Pass the sprint state to the moveWithJoystick method
      this.player.moveWithJoystick(this.movementVector.x, this.movementVector.z, this.keys.sprint);
    }
    else {
      // No movement input, play idle animation
      if (this.player.playAnimation) {
        this.player.playAnimation('idle');
      }
    }

    // Handle jump
    if (this.keys.jump) {
      this.player.jump();
    }

    // Handle combat action
    if (this.keys.shoot) {
      // Use the renamed method
      this.player.fireWeapon();
    }
  }
}