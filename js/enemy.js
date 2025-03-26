export class Enemy {
    constructor(scene, type, position, player) {
        this.scene = scene;
        this.type = type;
        this.player = player;
        
        // Enemy stats
        switch (type) {
            case 'soldier':
                this.health = 30;
                this.speed = 0.05;
                this.damage = 10;
                this.attackRange = 10;
                this.attackRate = 2; // Seconds between attacks
                this.color = 0xff0000;
                this.model = 'enemy_soldier.glb';
                this.scale = 0.5;
                break;
            case 'tank':
                this.health = 150;
                this.speed = 0.03;
                this.damage = 30;
                this.attackRange = 15;
                this.attackRate = 3;
                this.color = 0x663300;
                this.model = 'enemy_tank.glb';
                this.scale = 0.8;
                break;
            case 'helicopter':
                this.health = 100;
                this.speed = 0.08;
                this.damage = 20;
                this.attackRange = 20;
                this.attackRate = 1.5;
                this.color = 0x666666;
                this.height = 5;
                this.model = 'enemy_helicopter.glb';
                this.scale = 0.7;
                break;
            default:
                this.health = 30;
                this.speed = 0.05;
                this.damage = 10;
                this.attackRange = 10;
                this.attackRate = 2;
                this.color = 0xff0000;
                this.model = 'enemy_soldier.glb';
                this.scale = 0.5;
        }
        
        // Create enemy mesh
        this.createEnemy(position);
        
        // Attack timing
        this.lastAttackTime = 0;
        
        // Animation properties
        this.mixer = null;
        this.animations = {
            idle: null,
            walk: null,
            attack: null,
            death: null
        };
        this.currentAction = null;
    }
    
    createEnemy(position) {
        // Create a temporary simple mesh while loading the proper model
        let geometry;
        
        switch (this.type) {
            case 'soldier':
                geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
                break;
            case 'tank':
                geometry = new THREE.BoxGeometry(2, 1, 3);
                break;
            case 'helicopter':
                geometry = new THREE.BoxGeometry(2, 1, 3);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
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
            this.mesh.position.set(position.x, 0.5, position.z);
        }
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Create a group to hold the enemy and its model
        this.enemyGroup = new THREE.Group();
        this.scene.add(this.enemyGroup);
        this.enemyGroup.position.copy(this.mesh.position);
        
        // Try to load detailed model
        this.loadDetailedModel();
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
                    
                    // Position the model properly
                    if (this.type === 'soldier') {
                        this.detailedModel.position.y = -0.5;
                    } else if (this.type === 'helicopter') {
                        this.detailedModel.position.y = 0;
                    }
                    
                    this.enemyGroup.add(this.detailedModel);
                    
                    // Gradually make the basic mesh invisible
                    this.fadeOutBasicMesh();
                    
                    // Setup animations if available
                    if (gltf.animations && gltf.animations.length) {
                        this.mixer = new THREE.AnimationMixer(this.detailedModel);
                        
                        gltf.animations.forEach(clip => {
                            const name = clip.name.toLowerCase();
                            if (name.includes('idle')) {
                                this.animations.idle = this.mixer.clipAction(clip);
                            } else if (name.includes('walk') || name.includes('run')) {
                                this.animations.walk = this.mixer.clipAction(clip);
                            } else if (name.includes('attack') || name.includes('shoot')) {
                                this.animations.attack = this.mixer.clipAction(clip);
                            } else if (name.includes('death') || name.includes('die')) {
                                this.animations.death = this.mixer.clipAction(clip);
                            }
                        });
                        
                        // Start with walk animation
                        if (this.animations.walk) {
                            this.animations.walk.play();
                            this.currentAction = this.animations.walk;
                        }
                    }
                },
                (xhr) => {
                    // Progress logging
                    console.log(`Enemy model ${this.type} ${(xhr.loaded / xhr.total) * 100}% loaded`);
                },
                (error) => {
                    console.error(`Error loading enemy model ${this.type}:`, error);
                    // Create a more detailed basic model as fallback
                    this.createDetailedBasicModel();
                }
            );
        } catch (error) {
            console.error("Error loading enemy model:", error);
            this.createDetailedBasicModel();
        }
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
        // Create a more visually appealing basic model based on enemy type
        let enemyModel = new THREE.Group();
        
        if (this.type === 'soldier') {
            // Create a humanoid figure
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshLambertMaterial({ color: 0x8B0000 })
            );
            head.position.y = 0.7;
            
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.6, 0.2),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            body.position.y = 0.3;
            
            const arms = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 0.1, 0.1),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            arms.position.y = 0.4;
            
            const legs = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.5, 0.2),
                new THREE.MeshLambertMaterial({ color: 0x800000 })
            );
            legs.position.y = -0.1;
            
            enemyModel.add(head, body, arms, legs);
        } else if (this.type === 'tank') {
            // Create a tank shape
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.8, 3),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            
            const turret = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.7, 0.5, 8),
                new THREE.MeshLambertMaterial({ color: 0x556B2F })
            );
            turret.position.y = 0.6;
            
            const cannon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            cannon.rotation.z = Math.PI / 2;
            cannon.position.y = 0.6;
            cannon.position.z = 1;
            
            const tracks = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 0.4, 3),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            tracks.position.y = -0.2;
            
            enemyModel.add(body, turret, cannon, tracks);
        } else if (this.type === 'helicopter') {
            // Create a helicopter shape
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.8, 2.5, 8, 1, false, 0, Math.PI * 2),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            body.rotation.z = Math.PI / 2;
            
            const topRotor = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.05, 0.2),
                new THREE.MeshLambertMaterial({ color: 0xCCCCCC })
            );
            topRotor.position.y = 0.8;
            
            const tailRotor = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.05, 0.1),
                new THREE.MeshLambertMaterial({ color: 0xCCCCCC })
            );
            tailRotor.position.z = -1.5;
            tailRotor.position.y = 0.4;
            tailRotor.rotation.x = Math.PI / 2;
            
            const tail = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 1),
                new THREE.MeshLambertMaterial({ color: this.color })
            );
            tail.position.z = -1;
            
            const cockpit = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshLambertMaterial({ color: 0x87CEFA, transparent: true, opacity: 0.7 })
            );
            cockpit.position.z = 0.5;
            cockpit.position.y = 0.25;
            cockpit.rotation.x = -Math.PI / 2;
            
            enemyModel.add(body, topRotor, tailRotor, tail, cockpit);
            
            // Add animation for rotors
            this.topRotor = topRotor;
            this.tailRotor = tailRotor;
        }
        
        this.detailedModel = enemyModel;
        this.enemyGroup.add(enemyModel);
        
        // Fade out the basic mesh
        this.fadeOutBasicMesh();
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
    
    update(deltaTime) {
        // Follow player
        this.moveTowardsPlayer();
        
        // Attack if in range
        this.tryAttack();
        
        // Update animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Special animations for basic models
        if (this.detailedModel && this.type === 'helicopter') {
            if (this.topRotor) this.topRotor.rotation.y += 0.5;
            if (this.tailRotor) this.tailRotor.rotation.y += 0.7;
        }
    }
    
    moveTowardsPlayer() {
        let targetPosition;
        
        if (this.player.inVehicle) {
            targetPosition = this.player.currentVehicle.mesh.position;
        } else {
            targetPosition = this.player.mesh.position;
        }
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(targetPosition, this.mesh.position).normalize();
        
        // Don't change Y position for helicopters
        if (this.type === 'helicopter') {
            direction.y = 0;
        }
        
        // Move towards player
        this.mesh.position.add(direction.multiplyScalar(this.speed));
        
        // Update the group position to match the hitbox position
        if (this.enemyGroup) {
            this.enemyGroup.position.copy(this.mesh.position);
            
            // Make the model face the direction of movement
            if (direction.length() > 0) {
                const lookAtPos = new THREE.Vector3().addVectors(
                    this.mesh.position, 
                    new THREE.Vector3(direction.x, 0, direction.z)
                );
                this.enemyGroup.lookAt(lookAtPos);
            }
        }
        
        // Play walk animation if available
        this.playAnimation('walk');
    }
    
    tryAttack() {
        const now = Date.now();
        let distanceToPlayer;
        
        if (this.player.inVehicle) {
            distanceToPlayer = this.mesh.position.distanceTo(this.player.currentVehicle.mesh.position);
        } else {
            distanceToPlayer = this.mesh.position.distanceTo(this.player.mesh.position);
        }
        
        // Check if player is in attack range and enough time has passed since last attack
        if (distanceToPlayer <= this.attackRange && (now - this.lastAttackTime) >= (this.attackRate * 1000)) {
            this.lastAttackTime = now;
            this.attack();
        }
    }
    
    attack() {
        // Play attack animation if available
        this.playAnimation('attack');
        
        // Create visible bullet/projectile
        const bulletGeometry = new THREE.SphereGeometry(0.1);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Set starting position at enemy
        bullet.position.copy(this.mesh.position);
        bullet.position.y += 0.5; // Adjust for height
        
        // Calculate direction to player
        let targetPosition;
        if (this.player.inVehicle) {
            targetPosition = this.player.currentVehicle.mesh.position.clone();
        } else {
            targetPosition = this.player.mesh.position.clone();
        }
        
        const direction = new THREE.Vector3().subVectors(targetPosition, bullet.position).normalize();
        
        // Add to scene
        this.scene.add(bullet);
        
        // Store bullet in the game's bullets array (need to be accessed from the main game)
        if (window.game && window.game.bullets) {
            window.game.bullets.push({
                mesh: bullet,
                direction: direction,
                speed: 0.5,
                damage: this.damage,
                range: this.attackRange * 1.5,
                isFromPlayer: false,
                distanceTraveled: 0,
                update() {
                    bullet.position.add(this.direction.clone().multiplyScalar(this.speed));
                    this.distanceTraveled += this.speed;
                },
                checkCollision(otherMesh) {
                    return bullet.position.distanceTo(otherMesh.position) < 1;
                }
            });
        } else {
            // If can't add to game bullets, handle it here with timeout
            setTimeout(() => {
                this.scene.remove(bullet);
            }, 2000);
            
            // Direct damage to player (simplified)
            if (this.player.inVehicle) {
                this.player.currentVehicle.takeDamage(this.damage);
            } else {
                this.player.takeDamage(this.damage);
            }
        }
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
        
        // Play death animation if health is depleted
        if (this.health <= 0 && this.animations.death) {
            this.playAnimation('death');
        }
    }
}
