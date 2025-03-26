import { Weapon } from './weapon.js';

export class Player {
    constructor(scene, camera, onLoadCallback) {
        this.scene = scene;
        this.camera = camera;
        this.onLoadCallback = onLoadCallback;
        
        // Player stats
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 0.15;
        this.jumpHeight = 1.5;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.gravity = -0.05;
        
        // Movement
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = 0;
        this.direction = new THREE.Vector3();
        
        // Mouse target for shooting direction
        this.mouseTarget = new THREE.Vector3();
        this.isAimingWithMouse = false;
        
        // Sprint functionality
        this.isSprinting = false;
        this.sprintMultiplier = 1.8;
        this.sprintStamina = 100;
        this.maxStamina = 100;
        this.staminaRegenRate = 15; // Per second
        this.staminaUseRate = 25;   // Per second
        
        // Current vehicle
        this.currentVehicle = null;
        this.inVehicle = false;
        
        // Weapons
        this.weapons = [
            new Weapon('pistol', 10, 0.5, 50, Infinity, 0xffff00), // Default pistol with infinite ammo
            null, // Slot for rifle
            null, // Slot for rocket launcher
            null  // Slot for special weapon
        ];
        this.currentWeaponIndex = 0;
        this.currentWeapon = this.weapons[0];
        this.lastShootTime = 0;
        
        // Animation states
        this.animations = {
            idle: null,
            run: null,
            sprint: null,
            shoot: null,
            jump: null,
            death: null
        };
        this.currentAction = null;
        this.mixer = null;
        
        console.log("Creating player...");
        
        // Create player model with GLTF loader
        this.loadPlayerModel();
    }
    
    loadPlayerModel() {
        try {
            // Create a temporary simple mesh while loading the proper model
            const tempGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
            const tempMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff, transparent: true, opacity: 0 });
            this.mesh = new THREE.Mesh(tempGeometry, tempMaterial);
            this.mesh.position.set(0, 0.5, 0);
            this.mesh.castShadow = true;
            this.scene.add(this.mesh);
            
            // Update position reference
            this.position = this.mesh.position;
            
            // Create an object to hold the player model and hitbox
            this.playerGroup = new THREE.Group();
            this.scene.add(this.playerGroup);
            this.playerGroup.add(this.mesh);
            
            // Load detailed character model
            const loader = new THREE.GLTFLoader();
            
            // Try to load the GLTF model
            loader.load(
                './models/soldier.glb', // Path to your model
                (gltf) => {
                    console.log("Player model loaded successfully");
                    
                    this.model = gltf.scene;
                    this.model.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
                    this.model.position.y = -0.5; // Adjust position to ground level
                    this.playerGroup.add(this.model);
                    
                    // Setup animations if available
                    if (gltf.animations && gltf.animations.length) {
                        this.mixer = new THREE.AnimationMixer(this.model);
                        
                        // Map animations
                        gltf.animations.forEach(clip => {
                            const name = clip.name.toLowerCase();
                            if (name.includes('idle')) {
                                this.animations.idle = this.mixer.clipAction(clip);
                            } else if (name.includes('run') || name.includes('walk')) {
                                this.animations.run = this.mixer.clipAction(clip);
                            } else if (name.includes('shoot') || name.includes('attack')) {
                                this.animations.shoot = this.mixer.clipAction(clip);
                            } else if (name.includes('jump')) {
                                this.animations.jump = this.mixer.clipAction(clip);
                            } else if (name.includes('death') || name.includes('die')) {
                                this.animations.death = this.mixer.clipAction(clip);
                            } else if (name.includes('sprint')) {
                                this.animations.sprint = this.mixer.clipAction(clip);
                            }
                        });
                        
                        // Start with idle animation
                        if (this.animations.idle) {
                            this.animations.idle.play();
                            this.currentAction = this.animations.idle;
                        }
                    }
                    
                    // Signal that player is loaded
                    if (typeof this.onLoadCallback === 'function') {
                        this.onLoadCallback();
                    }
                },
                (xhr) => {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                (error) => {
                    console.error("Error loading player model:", error);
                    // Fallback to basic model
                    this.createBasicPlayerModel();
                    // Still call callback to avoid blocking the loading process
                    if (typeof this.onLoadCallback === 'function') {
                        this.onLoadCallback();
                    }
                }
            );
        } catch (error) {
            console.error("Error creating player:", error);
            // Fallback to basic model
            this.createBasicPlayerModel();
            // Still call callback to avoid blocking the loading process
            if (typeof this.onLoadCallback === 'function') {
                this.onLoadCallback();
            }
        }
    }
    
    createBasicPlayerModel() {
        // Create a more advanced basic model as fallback
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.7;
        
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        
        const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0000AA });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.25, 0.3, 0);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.25, 0.3, 0);
        
        const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.12, -0.15, 0);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.12, -0.15, 0);
        
        // Create gun
        const gunGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
        const gunMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const gun = new THREE.Mesh(gunGeometry, gunMaterial);
        gun.position.set(0.25, 0.3, 0.15);
        
        // Create the model group
        this.model = new THREE.Group();
        this.model.add(head, body, leftArm, rightArm, leftLeg, rightLeg, gun);
        this.playerGroup.add(this.model);
        
        console.log("Basic player model created as fallback");
    }
    
    setMouseTarget(mousePosition, camera) {
        // Convert mouse position to 3D space
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mousePosition, camera);
        
        // Create a plane at player's height for intersection
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
        const target = new THREE.Vector3();
        
        raycaster.ray.intersectPlane(groundPlane, target);
        
        // Store target and calculate direction
        this.mouseTarget.copy(target);
        this.isAimingWithMouse = true;
        
        if (!this.inVehicle) {
            // Calculate angle to target in the XZ plane
            const direction = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
            this.rotation = Math.atan2(direction.x, direction.z);
            
            // Update player model rotation to face the target
            if (this.playerGroup) {
                this.playerGroup.rotation.y = this.rotation;
            }
        }
        
        return target;
    }
    
    move(direction, sprint = false) {
        // Apply sprint if we have stamina
        this.isSprinting = sprint && this.sprintStamina > 0 && !this.inVehicle;
        
        const delta = this.speed * (this.isSprinting ? this.sprintMultiplier : 1.0);
        
        if (this.inVehicle) {
            // Vehicle movement is handled by the vehicle class
            this.currentVehicle.move(direction);
            return;
        }
        
        // Play appropriate animation
        this.playAnimation(this.isSprinting ? 'sprint' : 'run');
        
        let directionVector = new THREE.Vector3();
        
        switch (direction) {
            case 'forward':
                this.mesh.position.z -= delta;
                if (!this.isAimingWithMouse) {
                    this.rotation = Math.PI;
                }
                directionVector.set(0, 0, -1);
                break;
            case 'backward':
                this.mesh.position.z += delta;
                if (!this.isAimingWithMouse) {
                    this.rotation = 0;
                }
                directionVector.set(0, 0, 1);
                break;
            case 'left':
                this.mesh.position.x -= delta;
                if (!this.isAimingWithMouse) {
                    this.rotation = Math.PI * 1.5;
                }
                directionVector.set(-1, 0, 0);
                break;
            case 'right':
                this.mesh.position.x += delta;
                if (!this.isAimingWithMouse) {
                    this.rotation = Math.PI * 0.5;
                }
                directionVector.set(1, 0, 0);
                break;
        }
        
        // Update the whole player group position
        if (this.playerGroup) {
            this.playerGroup.position.copy(this.mesh.position);
            if (!this.isAimingWithMouse) {
                this.playerGroup.rotation.y = this.rotation;
            }
        }
    }
    
    moveWithJoystick(x, y, sprint = false) {
        // Apply sprint for mobile if we have the stamina
        this.isSprinting = sprint && this.sprintStamina > 0 && !this.inVehicle;
        
        if (this.inVehicle) {
            this.currentVehicle.moveWithJoystick(x, y);
            return;
        }
        
        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
            // Play appropriate animation
            this.playAnimation(this.isSprinting ? 'sprint' : 'run');
            
            const angle = Math.atan2(x, y);
            
            // Only change rotation if not aiming with another joystick
            if (!this.isAimingWithMouse) {
                this.rotation = angle;
            }
            
            const speed = this.speed * (this.isSprinting ? this.sprintMultiplier : 1.0);
            this.mesh.position.x += x * speed;
            this.mesh.position.z -= y * speed;
            
            // Update the player group
            if (this.playerGroup) {
                this.playerGroup.position.copy(this.mesh.position);
                if (!this.isAimingWithMouse) {
                    this.playerGroup.rotation.y = this.rotation;
                }
            }
        } else {
            // Play idle animation if not moving
            this.playAnimation('idle');
        }
    }
    
    playAnimation(name) {
        if (!this.mixer || !this.animations[name]) return;
        
        const newAction = this.animations[name];
        
        if (this.currentAction === newAction) return;
        
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        
        newAction.reset().fadeIn(0.2).play();
        this.currentAction = newAction;
    }
    
    updateStamina(deltaTime) {
        if (this.isSprinting) {
            // Decrease stamina while sprinting
            this.sprintStamina = Math.max(0, this.sprintStamina - this.staminaUseRate * deltaTime);
        } else {
            // Regenerate stamina when not sprinting
            this.sprintStamina = Math.min(this.maxStamina, this.sprintStamina + this.staminaRegenRate * deltaTime);
        }
        
        // Update UI if stamina bar exists
        const staminaBar = document.getElementById('stamina-progress');
        if (staminaBar) {
            staminaBar.style.width = `${(this.sprintStamina / this.maxStamina) * 100}%`;
        }
    }
    
    jump() {
        if (!this.isJumping && !this.inVehicle) {
            this.isJumping = true;
            this.jumpVelocity = 0.35; // Increased jump force
            this.playAnimation('jump');
        }
    }
    
    shoot(bullets, scene, targetPosition = null) {
        const now = Date.now();
        
        if (now - this.lastShootTime >= this.currentWeapon.fireRate * 1000) {
            // Don't shoot if no weapon or out of ammo
            if (!this.currentWeapon || (this.currentWeapon.currentAmmo <= 0 && this.currentWeapon.currentAmmo !== Infinity)) {
                // Could play empty gun sound here
                return;
            }
            
            // Use ammo (infinite ammo is handled in the Weapon class)
            if (!this.currentWeapon.useAmmo()) {
                return;
            }
            
            this.lastShootTime = now;
            
            // Play shooting animation
            this.playAnimation('shoot');
            
            let spawnPoint, direction;
            
            if (this.inVehicle) {
                // Get firing position and direction from vehicle
                spawnPoint = this.currentVehicle.getWeaponPosition();
                direction = this.currentVehicle.getDirection();
            } else {
                // Calculate gun position offset from player center
                const gunOffset = new THREE.Vector3(0.3, 0.5, 0.5);
                gunOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                
                spawnPoint = new THREE.Vector3(
                    this.mesh.position.x + gunOffset.x,
                    this.mesh.position.y + gunOffset.y,
                    this.mesh.position.z + gunOffset.z
                );
                
                // If we have a target position (from mouse click), use that for direction
                if (targetPosition) {
                    direction = new THREE.Vector3()
                        .subVectors(targetPosition, spawnPoint)
                        .normalize();
                } else {
                    // Otherwise use player's facing direction
                    direction = new THREE.Vector3(0, 0, -1)
                        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                }
            }
            
            // Create the bullet using the weapon's properties
            const bullet = this.currentWeapon.createBullet(scene, spawnPoint, direction);
            bullets.push(bullet);
            
            // Update ammo display
            this.updateAmmoDisplay();
        }
    }
    
    updateAmmoDisplay() {
        const ammoElement = document.getElementById('ammo');
        if (ammoElement) {
            const ammoText = this.currentWeapon.currentAmmo === Infinity 
                ? '∞' 
                : this.currentWeapon.currentAmmo;
            ammoElement.textContent = `Ammo: ${ammoText}`;
        }
        
        // Update weapon name display
        const weaponNameElement = document.getElementById('weapon-name');
        if (weaponNameElement) {
            weaponNameElement.textContent = `Weapon: ${this.currentWeapon.type.charAt(0).toUpperCase() + this.currentWeapon.type.slice(1)}`;
        }
    }
    
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && this.weapons[index]) {
            this.currentWeaponIndex = index;
            this.currentWeapon = this.weapons[index];
            this.updateAmmoDisplay();
        }
    }
    
    cycleWeapon() {
        let nextIndex = this.currentWeaponIndex;
        // Find next available weapon
        do {
            nextIndex = (nextIndex + 1) % this.weapons.length;
        } while (nextIndex !== this.currentWeaponIndex && !this.weapons[nextIndex]);
        
        if (this.weapons[nextIndex]) {
            this.switchWeapon(nextIndex);
        }
    }
    
    pickupWeapon(weaponPickup) {
        const weaponType = weaponPickup.weaponType;
        const ammo = weaponPickup.ammo;
        
        // Find the right slot based on weapon type
        let slotIndex;
        switch (weaponType) {
            case 'rifle':
                slotIndex = 1;
                break;
            case 'rocket':
                slotIndex = 2;
                break;
            default:
                slotIndex = 3; // Special weapons
        }
        
        // Create or refill the weapon
        if (!this.weapons[slotIndex]) {
            this.weapons[slotIndex] = new Weapon(weaponType, weaponPickup.damage, weaponPickup.fireRate, 
                                               weaponPickup.range, ammo, weaponPickup.bulletColor);
        } else {
            this.weapons[slotIndex].currentAmmo = Math.min(
                this.weapons[slotIndex].maxAmmo,
                this.weapons[slotIndex].currentAmmo + ammo
            );
        }
        
        // Switch to the picked up weapon
        this.switchWeapon(slotIndex);
    }
    
    enterVehicle(vehicle) {
        if (!vehicle.isOccupied) {
            this.currentVehicle = vehicle;
            this.inVehicle = true;
            vehicle.setOccupied(true);
            
            // Hide player mesh while in vehicle
            this.mesh.visible = false;
            
            // Update camera position
            this.camera.position.y += 2;
            
            // Switch weapon based on vehicle
            if (vehicle.type === 'tank') {
                this.currentWeapon = this.weapons[2]; // Rocket
            } else if (vehicle.type === 'helicopter') {
                this.currentWeapon = this.weapons[1]; // Rifle
            }
        }
    }
    
    exitVehicle() {
        if (this.inVehicle) {
            // Position player next to vehicle
            this.mesh.position.set(
                this.currentVehicle.mesh.position.x + 2,
                0.5,
                this.currentVehicle.mesh.position.z
            );
            
            this.mesh.visible = true;
            this.currentVehicle.setOccupied(false);
            this.inVehicle = false;
            this.currentVehicle = null;
            
            // Reset camera position
            this.camera.position.y -= 2;
            
            // Reset weapon
            this.currentWeapon = this.weapons[0]; // Pistol
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
    
    heal(amount) {
        this.health += amount;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }
    
    checkCollision(otherMesh) {
        if (this.inVehicle) return false;
        
        return this.mesh.position.distanceTo(otherMesh.position) < 1;
    }
    
    distanceTo(object) {
        return this.mesh.position.distanceTo(object.mesh.position);
    }
    
    update(deltaTime) {
        // Update stamina
        this.updateStamina(deltaTime);
        
        // Handle jumping with improved physics
        if (this.isJumping) {
            this.mesh.position.y += this.jumpVelocity;
            this.jumpVelocity += this.gravity;
            
            if (this.mesh.position.y <= 0.5) {
                this.mesh.position.y = 0.5;
                this.isJumping = false;
                this.playAnimation('idle');
            }
            
            // Update the player group position
            if (this.playerGroup) {
                this.playerGroup.position.y = this.mesh.position.y;
            }
        }
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update camera position to follow player
        if (this.inVehicle) {
            this.camera.position.x = this.currentVehicle.mesh.position.x;
            this.camera.position.z = this.currentVehicle.mesh.position.z + 8;
            this.camera.lookAt(this.currentVehicle.mesh.position);
        } else {
            this.camera.position.x = this.mesh.position.x;
            this.camera.position.z = this.mesh.position.z + 8;
            this.camera.lookAt(this.mesh.position);
        }
    }
    
    reset() {
        this.health = this.maxHealth;
        this.sprintStamina = this.maxStamina;
        this.mesh.position.set(0, 0.5, 0);
        this.rotation = 0;
        this.mesh.rotation.y = 0;
        this.isJumping = false;
        this.isAimingWithMouse = false;
        
        if (this.inVehicle) {
            this.exitVehicle();
        }
        
        // Reset weapons to just the pistol
        this.weapons = [
            new Weapon('pistol', 10, 0.5, 50, Infinity, 0xffff00),
            null,
            null,
            null
        ];
        this.currentWeaponIndex = 0;
        this.currentWeapon = this.weapons[0];
        this.updateAmmoDisplay();
        
        // Reset any animations
        this.playAnimation('idle');
    }
}
