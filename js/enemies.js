class Enemy {
  constructor(game, type = 'soldier') {
    this.game = game;
    this.object = new THREE.Group();
    this.type = type;
    this.health = 100;
    this.speed = 5;
    this.detectionRange = 50;
    this.attackRange = 20;
    this.damage = 10;
    this.lastAttackTime = 0;
    this.attackCooldown = 1; // 1 second between attacks
    this.isAggressive = true;
    
    // Setup different properties based on enemy type
    this.setupEnemyType();
    
    // Make tanks and other vehicles more challenging
    if (type === 'tank') {
      this.health = 250; // Increased from 200
      this.speed = 4;    // Increased from 3
      this.damage = 35;  // Increased from 30
      this.detectionRange = 60; // Increased from 50
    } else if (type === 'jeep') {
      this.health = 120; // Increased from 100
      this.speed = 9;    // Increased from 8
      this.detectionRange = 55; // Increased from implied 50
    }
    
    // Create the enemy model
    this.createEnemyModel();
    
    // Set up collider
    this.collider = new THREE.Box3().setFromObject(this.object);
  }
  
  setupEnemyType() {
    switch(this.type) {
      case 'soldier':
        this.health = 50;
        this.speed = 5;
        this.damage = 10;
        break;
      case 'tank':
        this.health = 200;
        this.speed = 3;
        this.damage = 30;
        break;
      case 'jeep':
        this.health = 100;
        this.speed = 8;
        this.damage = 15;
        break;
    }
  }
  
  createEnemyModel() {
    switch(this.type) {
      case 'soldier':
        this.createSoldierModel();
        break;
      case 'tank':
        this.createTankModel();
        break;
      case 'jeep':
        this.createJeepModel();
        break;
    }
  }
  
  createSoldierModel() {
    // Create soldier model (simplified humanoid)
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 1;
    this.bodyMesh.castShadow = true;
    
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.y = 2.5;
    this.headMesh.castShadow = true;
    
    // Add to enemy object
    this.object.add(this.bodyMesh);
    this.object.add(this.headMesh);
  }
  
  createTankModel() {
    // Create tank model (simplified)
    const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x556b2f });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.75;
    this.bodyMesh.castShadow = true;
    
    const turretGeometry = new THREE.BoxGeometry(2, 1, 3);
    const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x556b2f });
    this.turretMesh = new THREE.Mesh(turretGeometry, turretMaterial);
    this.turretMesh.position.set(0, 2, 0);
    this.turretMesh.castShadow = true;
    
    const barrelGeometry = new THREE.BoxGeometry(0.5, 0.5, 4);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
    this.barrelMesh.position.set(0, 2, 3);
    this.barrelMesh.castShadow = true;
    
    // Add to enemy object
    this.object.add(this.bodyMesh);
    this.object.add(this.turretMesh);
    this.object.add(this.barrelMesh);
  }
  
  createJeepModel() {
    // Create jeep model (simplified)
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.5;
    this.bodyMesh.castShadow = true;
    
    const topGeometry = new THREE.BoxGeometry(1.8, 1, 2);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.topMesh = new THREE.Mesh(topGeometry, topMaterial);
    this.topMesh.position.set(0, 1.5, -0.5);
    this.topMesh.castShadow = true;
    
    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    this.wheels = [];
    const wheelPositions = [
      { x: -1.2, y: 0.5, z: 1.5 },
      { x: 1.2, y: 0.5, z: 1.5 },
      { x: -1.2, y: 0.5, z: -1.5 },
      { x: 1.2, y: 0.5, z: -1.5 }
    ];
    
    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.castShadow = true;
      this.wheels.push(wheel);
      this.object.add(wheel);
    });
    
    // Add to enemy object
    this.object.add(this.bodyMesh);
    this.object.add(this.topMesh);
  }
  
  update(deltaTime) {
    // Update collider
    this.collider.setFromObject(this.object);
    
    // Basic AI: If player is within detection range, move towards them
    if (this.game.player && !this.game.player.isInvulnerable) {
      const playerPos = this.game.player.object.position;
      const enemyPos = this.object.position;
      const distanceToPlayer = enemyPos.distanceTo(playerPos);
      
      if (distanceToPlayer <= this.detectionRange && this.isAggressive) {
        // Check if there's a clear line of sight to the player
        const direction = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();
        const ray = new THREE.Raycaster(enemyPos, direction, 0, distanceToPlayer);
        
        // Check for obstructions in the line of sight
        const obstructions = ray.intersectObjects(
          this.game.environmentObjects.filter(obj => obj.userData && obj.userData.solid),
          true
        );
        
        const hasLineOfSight = obstructions.length === 0;
        
        if (hasLineOfSight) {
          // Move towards player if not in attack range
          if (distanceToPlayer > this.attackRange) {
            // Calculate direction to player
            
            // Check for obstacles ahead
            const predictedPos = enemyPos.clone().add(
              direction.clone().multiplyScalar(this.speed * deltaTime * 2)
            );
            let obstacleAhead = false;
            
            // Check if the predicted position would collide with an obstacle
            this.game.environmentObjects.forEach(obj => {
              if (obj.userData && obj.userData.solid) {
                const objBox = new THREE.Box3().setFromObject(obj);
                const enemyBox = this.collider.clone();
                
                // Move enemy box to predicted position
                enemyBox.min.add(new THREE.Vector3().subVectors(predictedPos, enemyPos));
                enemyBox.max.add(new THREE.Vector3().subVectors(predictedPos, enemyPos));
                
                if (enemyBox.intersectsBox(objBox)) {
                  obstacleAhead = true;
                }
              }
            });
            
            if (!obstacleAhead) {
              // Move towards player if no obstacles
              this.object.position.x += direction.x * this.speed * deltaTime;
              this.object.position.z += direction.z * this.speed * deltaTime;
              
              // Rotate to face the player
              this.object.lookAt(new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z));
            } else {
              // Try to navigate around obstacle by adjusting direction
              const sideStep = new THREE.Vector3(-direction.z, 0, direction.x);
              
              // Try moving to the side
              this.object.position.x += sideStep.x * this.speed * 0.7 * deltaTime;
              this.object.position.z += sideStep.z * this.speed * 0.7 * deltaTime;
            }
          } else {
            // Attack player if in range and cooldown is over
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown * 1000) {
              this.attack();
              this.lastAttackTime = currentTime;
            }
            
            // Rotate to face the player
            this.object.lookAt(new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z));
          }
        } else {
          // If can't see player but is close, try to navigate around obstacles
          const randomDirection = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
          ).normalize();
          
          this.object.position.x += randomDirection.x * this.speed * 0.3 * deltaTime;
          this.object.position.z += randomDirection.z * this.speed * 0.3 * deltaTime;
        }
      }
    }
  }
  
  attack() {
    // Different attack based on enemy type
    switch(this.type) {
      case 'soldier':
        // Simple projectile for soldier
        this.shootAtPlayer();
        break;
      case 'tank':
        // Stronger projectile for tank
        this.shootAtPlayer(35); // Higher damage
        // Add a second shot for tanks (with slight delay) to make them more dangerous
        setTimeout(() => {
          if (!this.isDead && this.game.isGameActive) {
            this.shootAtPlayer(20);
          }
        }, 300);
        break;
      case 'jeep':
        // Fast projectiles for jeep with burst fire
        this.shootAtPlayer(15);
        setTimeout(() => {
          if (!this.isDead && this.game.isGameActive) {
            this.shootAtPlayer(10);
          }
        }, 200);
        break;
    }
  }
  
  shootAtPlayer(customDamage) {
    const damage = customDamage || this.damage;
    
    // Calculate direction to player
    const playerPos = this.game.player.object.position;
    const enemyPos = this.object.position;
    
    // Direction vector from enemy to player
    const direction = new THREE.Vector3()
      .subVectors(playerPos, enemyPos)
      .normalize();
    
    // Get weapon position based on enemy type
    let weaponPos;
    if (this.type === 'tank') {
      weaponPos = new THREE.Vector3().copy(this.barrelMesh.position);
      weaponPos.applyMatrix4(this.object.matrixWorld);
    } else if (this.type === 'jeep') {
      weaponPos = new THREE.Vector3().copy(this.topMesh.position);
      weaponPos.y += 0.5;
      weaponPos.applyMatrix4(this.object.matrixWorld);
    } else {
      // For soldier
      weaponPos = new THREE.Vector3().copy(this.object.position);
      weaponPos.y += 1.5; // Shoot from approximately hand height
    }
    
    // Create weapon to match the damage for the projectile
    const weapon = new Weapon('enemy', damage, 1);
    
    // Spawn the projectile
    this.game.spawnProjectile(weaponPos, direction, 'enemy', weapon);
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    // Check if enemy is dead
    if (this.health <= 0) {
      this.die();
    }
  }
  
  die() {
    // Remove enemy from game
    this.game.removeEnemy(this);
  }
}
