export class Vehicle {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        
        // Vehicle stats
        switch (type) {
            case 'jeep':
                this.health = 100;
                this.speed = 0.15;
                this.color = 0x228B22;
                this.model = 'jeep.glb';
                this.scale = 0.5;
                break;
            case 'tank':
                this.health = 300;
                this.speed = 0.08;
                this.color = 0x556B2F;
                this.model = 'tank.glb';
                this.scale = 0.7;
                break;
            case 'helicopter':
                this.health = 200;
                this.speed = 0.2;
                this.color = 0x708090;
                this.height = 5;
                this.model = 'helicopter.glb';
                this.scale = 0.6;
                break;
            default:
                this.health = 100;
                this.speed = 0.1;
                this.color = 0x228B22;
                this.model = 'jeep.glb';
                this.scale = 0.5;
        }
        
        // Occupation status
        this.isOccupied = false;
        
        // Create vehicle mesh
        this.createVehicle(position);
        
        // Movement
        this.rotation = 0;
        
        // Animation properties
        this.mixer = null;
        this.animations = {};
        this.movingParts = {
            rotor: null,
            tracks: [],
            wheels: []
        };
    }
    
    createVehicle(position) {
        // Create a temporary simple mesh while loading the proper model
        let geometry;
        
        switch (this.type) {
            case 'jeep':
                geometry = new THREE.BoxGeometry(1.5, 1, 3);
                break;
            case 'tank':
                geometry = new THREE.BoxGeometry(2.5, 1.5, 4);
                break;
            case 'helicopter':
                geometry = new THREE.BoxGeometry(2.5, 1.5, 5);
                break;
            default:
                geometry = new THREE.BoxGeometry(1.5, 1, 3);
        }
        
        const material = new THREE.MeshLambertMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position
        if (this.type === 'helicopter') {
            this.mesh.position.set(position.x, this.height, position.z);
        } else {
            this.mesh.position.set(position.x, 0.75, position.z);
        }
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Create a group to hold the vehicle and its model
        this.vehicleGroup = new THREE.Group();
        this.scene.add(this.vehicleGroup);
        this.vehicleGroup.position.copy(this.mesh.position);
        
        // Add weapon mount to the basic mesh
        this.createWeaponMount();
        
        // Try to load detailed model
        this.loadDetailedModel();
    }
    
    createWeaponMount() {
        const weaponGeometry = new THREE.BoxGeometry(0.3, 0.3, 1);
        const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        
        // Position weapon based on vehicle type
        if (this.type === 'jeep') {
            this.weapon.position.set(0, 0.6, 0);
        } else if (this.type === 'tank') {
            this.weapon.position.set(0, 1.2, 0);
        } else if (this.type === 'helicopter') {
            this.weapon.position.set(0, 0, -1);
        }
        
        this.mesh.add(this.weapon);
    }
    
    loadDetailedModel() {
        try {
            const loader = new THREE.GLTFLoader();
            
            // Try to load the model
            loader.load(
                `./models/${this.model}`,
                (gltf) => {
                    this.detailedModel = gltf.scene;
                    this.detailedModel.scale.set(this.scale, this.scale, this.scale);
                    
                    // Position adjustments based on vehicle type
                    if (this.type === 'helicopter') {
                        this.detailedModel.position.y = 0;
                    } else {
                        this.detailedModel.position.y = -0.75;
                    }
                    
                    this.vehicleGroup.add(this.detailedModel);
                    
                    // Find important parts for animations
                    this.findMovingParts(this.detailedModel);
                    
                    // Gradually make the basic mesh invisible
                    this.fadeOutBasicMesh();
                    
                    // Setup animations if available
                    if (gltf.animations && gltf.animations.length) {
                        this.mixer = new THREE.AnimationMixer(this.detailedModel);
                        
                        gltf.animations.forEach(clip => {
                            const name = clip.name.toLowerCase();
                            this.animations[name] = this.mixer.clipAction(clip);
                            
                            // Auto-play some animations
                            if (name.includes('idle') || name.includes('rotor') || name.includes('spin')) {
                                this.animations[name].play();
                            }
                        });
                    }
                },
                (xhr) => {
                    // Progress logging
                    console.log(`Vehicle model ${this.type} ${(xhr.loaded / xhr.total) * 100}% loaded`);
                },
                (error) => {
                    console.error(`Error loading vehicle model ${this.type}:`, error);
                    // Create a more detailed basic model as fallback
                    this.createDetailedBasicModel();
                }
            );
        } catch (error) {
            console.error("Error loading vehicle model:", error);
            this.createDetailedBasicModel();
        }
    }
    
    findMovingParts(model) {
        model.traverse((child) => {
            const name = child.name.toLowerCase();
            
            if (name.includes('rotor') || name.includes('propeller')) {
                this.movingParts.rotor = child;
            } else if (name.includes('track')) {
                this.movingParts.tracks.push(child);
            } else if (name.includes('wheel')) {
                this.movingParts.wheels.push(child);
            }
        });
    }
    
    fadeOutBasicMesh() {
        // Create a fade out animation for the basic mesh
        const fadeOut = () => {
            if (this.mesh.material.opacity > 0) {
                this.mesh.material.opacity -= 0.05;
                setTimeout(fadeOut, 50);
            } else {
                this.mesh.visible = false;
            }
        };
        
        fadeOut();
    }
    
    createDetailedBasicModel() {
        // Create a more visually appealing basic model based on vehicle type
        let vehicleModel = new THREE.Group();
        
        if (this.type === 'jeep') {
            // Create a jeep shape
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.6, 3),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            body.position.y = 0.3;
            
            // Add distinctive jeep details
            const hood = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.2, 0.8),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            hood.position.set(0, 0.3, 1.4);
            
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(1.3, 0.5, 1.5),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            top.position.y = 0.8;
            top.position.z = -0.5;
            
            // Create headlights
            const headlightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const headlightMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffcc,
                emissive: 0xffffcc,
                emissiveIntensity: 0.5
            });
            
            const headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlightLeft.position.set(-0.5, 0.3, 1.6);
            
            const headlightRight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlightRight.position.set(0.5, 0.3, 1.6);
            
            // Create wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
            
            const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelFL.position.set(-0.8, 0, 1);
            wheelFL.rotation.z = Math.PI / 2;
            
            const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelFR.position.set(0.8, 0, 1);
            wheelFR.rotation.z = Math.PI / 2;
            
            const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelBL.position.set(-0.8, 0, -1);
            wheelBL.rotation.z = Math.PI / 2;
            
            const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelBR.position.set(0.8, 0, -1);
            wheelBR.rotation.z = Math.PI / 2;
            
            this.movingParts.wheels = [wheelFL, wheelFR, wheelBL, wheelBR];
            
            vehicleModel.add(body, hood, top, headlightLeft, headlightRight, wheelFL, wheelFR, wheelBL, wheelBR);
        } else if (this.type === 'tank') {
            // Create a tank shape
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 0.8, 4),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            
            const turret = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.8, 0.8, 8),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            turret.position.y = 0.8;
            
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.2, 3, 8),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.8, 1.5);
            
            const tracks = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.6, 4.5),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            tracks.position.y = -0.1;
            
            // Tank treads details
            const createTread = (x, z) => {
                const tread = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.2, 0.5),
                    new THREE.MeshLambertMaterial({ color: 0x222222 })
                );
                tread.position.set(x, -0.3, z);
                return tread;
            };
            
            // Add several treads on each side
            for (let i = -1.8; i <= 1.8; i += 0.4) {
                const leftTread = createTread(-1.5, i);
                const rightTread = createTread(1.5, i);
                vehicleModel.add(leftTread, rightTread);
            }
            
            vehicleModel.add(body, turret, barrel, tracks);
        } else if (this.type === 'helicopter') {
            // Create a helicopter shape
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 1, 4, 8),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            body.rotation.z = Math.PI / 2;
            
            // Enhanced cockpit
            const cockpit = new THREE.Mesh(
                new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshLambertMaterial({ 
                    color: 0x87CEFA, 
                    transparent: true, 
                    opacity: 0.7,
                    emissive: 0x3366ff,
                    emissiveIntensity: 0.2
                })
            );
            cockpit.position.set(0, 0.5, 1.5);
            cockpit.rotation.x = -Math.PI / 2;
            
            // Add running lights
            const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            
            // Red blinking light on top
            const redLight = new THREE.Mesh(
                lightGeometry,
                new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    emissive: 0xff0000,
                    emissiveIntensity: 0.5
                })
            );
            redLight.position.set(0, 1.8, -0.5);
            
            // Green navigation light on right
            const greenLight = new THREE.Mesh(
                lightGeometry,
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00, 
                    emissive: 0x00ff00,
                    emissiveIntensity: 0.5
                })
            );
            greenLight.position.set(1.0, 0, -0.5);
            
            // tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.5, 3, 8),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            tail.position.set(0, 0, -2);
            
            // Enhanced rotors with transparency
            const mainRotor = new THREE.Group();
            
            const blade1 = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.1, 0.5),
                new THREE.MeshLambertMaterial({ 
                    color: 0xAAAAAA,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            const blade2 = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.1, 0.5),
                new THREE.MeshLambertMaterial({ 
                    color: 0xAAAAAA,
                    transparent: true,
                    opacity: 0.8
                })
            );
            blade2.rotation.y = Math.PI / 2;
            
            mainRotor.add(blade1, blade2);
            mainRotor.position.set(0, 1.5, 0);
            
            // Tail rotor with transparency
            const tailRotor = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 0.2),
                new THREE.MeshLambertMaterial({ 
                    color: 0xAAAAAA,
                    transparent: true,
                    opacity: 0.8
                })
            );
            tailRotor.position.set(0.5, 0, -3.5);
            tailRotor.rotation.z = Math.PI / 2;
            
            this.movingParts.rotor = mainRotor;
            this.tailRotor = tailRotor;
            
            // Weapon mounts
            const leftWeaponMount = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 1),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            leftWeaponMount.position.set(-1.2, -0.5, 0.5);
            
            const rightWeaponMount = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 1),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            rightWeaponMount.position.set(1.2, -0.5, 0.5);
            
            vehicleModel.add(body, cockpit, tail, mainRotor, tailRotor, 
                             redLight, greenLight, leftWeaponMount, rightWeaponMount);
                             
            // Add blinking light animation
            this.lights = {
                red: redLight,
                green: greenLight,
                blinkRate: 0.5,
                lastBlink: 0
            };
        }
        
        this.detailedModel = vehicleModel;
        this.vehicleGroup.add(vehicleModel);
        
        // Fade out the basic mesh
        this.fadeOutBasicMesh();
    }
    
    move(direction) {
        const delta = this.speed;
        let directionVector = new THREE.Vector3();
        
        switch (direction) {
            case 'forward':
                this.mesh.position.z -= delta;
                this.rotation = Math.PI;
                directionVector.set(0, 0, -1);
                break;
            case 'backward':
                this.mesh.position.z += delta;
                this.rotation = 0;
                directionVector.set(0, 0, 1);
                break;
            case 'left':
                this.mesh.position.x -= delta;
                this.rotation = Math.PI * 1.5;
                directionVector.set(-1, 0, 0);
                break;
            case 'right':
                this.mesh.position.x += delta;
                this.rotation = Math.PI * 0.5;
                directionVector.set(1, 0, 0);
                break;
        }
        
        // Update the hitbox rotation
        this.mesh.rotation.y = this.rotation;
        
        // Update the vehicle group position and rotation
        this.vehicleGroup.position.copy(this.mesh.position);
        this.vehicleGroup.rotation.y = this.rotation;
        
        // Animate moving parts
        this.animateMovingParts(directionVector.length() > 0);
    }
    
    moveWithJoystick(x, y) {
        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
            const angle = Math.atan2(x, y);
            this.mesh.rotation.y = angle;
            this.rotation = angle;
            
            // Special handling for helicopter
            if (this.type === 'helicopter') {
                // Allow vertical movement
                if (Math.abs(y) > 0.7) {
                    this.mesh.position.y = Math.max(5, this.mesh.position.y + y * 0.05);
                }
            }
            
            this.mesh.position.x += x * this.speed;
            this.mesh.position.z -= y * this.speed;
            
            // Update the vehicle group position and rotation
            this.vehicleGroup.position.copy(this.mesh.position);
            this.vehicleGroup.rotation.y = angle;
            
            // Animate moving parts
            this.animateMovingParts(true);
        } else {
            // Slow down animations when not moving
            this.animateMovingParts(false);
        }
    }
    
    animateMovingParts(isMoving) {
        if (this.type === 'helicopter') {
            // Helicopter rotor always spins
            if (this.movingParts.rotor) {
                this.movingParts.rotor.rotation.y += isMoving ? 0.5 : 0.3;
            }
            if (this.tailRotor) {
                this.tailRotor.rotation.x += isMoving ? 0.7 : 0.5;
            }
        } else if (isMoving) {
            // Tank treads and jeep wheels only move when the vehicle is moving
            if (this.type === 'tank') {
                // Animate tank treads
                this.movingParts.tracks.forEach(track => {
                    if (track.material && track.material.map) {
                        track.material.map.offset.y += 0.03;
                    }
                });
            } else if (this.type === 'jeep') {
                // Rotate wheels
                this.movingParts.wheels.forEach(wheel => {
                    wheel.rotation.x += 0.1;
                });
            }
        }
    }
    
    setOccupied(status) {
        this.isOccupied = status;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Visual feedback for damage
        this.mesh.material.color.setHex(0xFFFFFF);
        
        if (this.detailedModel) {
            this.detailedModel.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(0xff0000);
                    
                    setTimeout(() => {
                        if (child.material) {
                            child.material.emissive = new THREE.Color(0x000000);
                        }
                    }, 200);
                }
            });
        }
        
        setTimeout(() => {
            if (this.mesh.material) {
                this.mesh.material.color.setHex(this.color);
            }
        }, 100);
        
        // Show smoke effect when damaged
        if (this.health < 150 && !this.smokeEffect) {
            this.createSmokeEffect();
        }
    }
    
    createSmokeEffect() {
        // Create a smoke particle system
        const smokeGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            vertices.push(0, 0, 0); // All particles start at vehicle position
        }
        
        smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const smokeMaterial = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
        this.vehicleGroup.add(this.smokeParticles);
        
        this.smokeEffect = {
            particles: this.smokeParticles,
            velocities: Array(particleCount).fill().map(() => ({
                x: (Math.random() - 0.5) * 0.05,
                y: Math.random() * 0.1 + 0.05,
                z: (Math.random() - 0.5) * 0.05
            })),
            lifetimes: Array(particleCount).fill().map(() => Math.random() * 2 + 1)
        };
    }
    
    updateSmokeEffect(deltaTime) {
        if (!this.smokeEffect) return;
        
        const positions = this.smokeEffect.particles.geometry.attributes.position.array;
        
        for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
            // Update particle positions
            positions[i] += this.smokeEffect.velocities[j].x;
            positions[i+1] += this.smokeEffect.velocities[j].y;
            positions[i+2] += this.smokeEffect.velocities[j].z;
            
            // Decrease lifetime
            this.smokeEffect.lifetimes[j] -= deltaTime;
            
            // Reset particles that have expired
            if (this.smokeEffect.lifetimes[j] <= 0) {
                positions[i] = 0;
                positions[i+1] = 0;
                positions[i+2] = 0;
                this.smokeEffect.lifetimes[j] = Math.random() * 2 + 1;
            }
        }
        
        this.smokeEffect.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    getWeaponPosition() {
        if (this.type === 'helicopter') {
            // Return position from one of the weapon mounts
            const weaponOffsets = [
                new THREE.Vector3(-1.2, -0.5, 0.5), // Left mount
                new THREE.Vector3(1.2, -0.5, 0.5)   // Right mount
            ];
            
            // Alternate between left and right
            const offset = weaponOffsets[Math.floor(Date.now() / 250) % 2];
            
            // Apply vehicle rotation and position
            const worldPosition = new THREE.Vector3();
            offset.applyQuaternion(this.vehicleGroup.quaternion);
            worldPosition.addVectors(this.mesh.position, offset);
            
            return worldPosition;
        } else {
            // Use default weapon position for other vehicles
            const weaponWorldPosition = new THREE.Vector3();
            this.weapon.getWorldPosition(weaponWorldPosition);
            return weaponWorldPosition;
        }
    }
    
    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.mesh.quaternion);
        
        return direction;
    }
    
    update(deltaTime) {
        // Update animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update smoke effect if vehicle is damaged
        if (this.smokeEffect) {
            this.updateSmokeEffect(deltaTime);
        }
        
        // Default vehicle animations
        if (this.type === 'helicopter' && this.movingParts.rotor) {
            // Always spin rotors for helicopters
            this.animateMovingParts(true);
        }
        
        // Autonomous movement for unoccupied vehicles
        if (!this.isOccupied) {
            if (this.type === 'helicopter') {
                // Make helicopter hover and move slightly
                this.mesh.position.x += Math.sin(Date.now() * 0.001) * 0.03;
                this.mesh.position.y += Math.sin(Date.now() * 0.002) * 0.01;
                this.vehicleGroup.position.copy(this.mesh.position);
            } else {
                // Make ground vehicles patrol randomly
                if (Math.random() < 0.005) {
                    const directions = ['forward', 'backward', 'left', 'right'];
                    this.move(directions[Math.floor(Math.random() * directions.length)]);
                }
            }
        }
        
        // Update helicopter lights
        if (this.type === 'helicopter' && this.lights) {
            this.lights.lastBlink += deltaTime;
            
            if (this.lights.lastBlink > this.lights.blinkRate) {
                this.lights.lastBlink = 0;
                this.lights.red.visible = !this.lights.red.visible;
            }
        }
    }
}
