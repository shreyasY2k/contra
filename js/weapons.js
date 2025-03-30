class Weapon {
  constructor(type, damage, fireRate) {
    this.type = type; // pistol, semiAuto, fullAuto, grenadeLauncher
    this.damage = damage;
    this.fireRate = fireRate; // Time in seconds between shots
    this.projectileSpeed = 40;
    this.range = 100; // Maximum range
    
    // Configure weapon-specific properties
    switch(type) {
      case 'pistol':
        this.projectileSize = 0.2;
        this.projectileColor = 0xffff00; // Yellow
        this.isExplosive = false;
        break;
      case 'semiAuto':
        this.projectileSize = 0.3;
        this.projectileColor = 0xff6600; // Orange
        this.isExplosive = false;
        break;
      case 'fullAuto':
        this.projectileSize = 0.15;
        this.projectileColor = 0xff0000; // Red
        this.isExplosive = false;
        this.projectileSpeed = 60;
        break;
      case 'grenadeLauncher':
        this.projectileSize = 0.5;
        this.projectileColor = 0x00ff00; // Green
        this.isExplosive = true;
        this.explosionRadius = 5;
        this.projectileSpeed = 25;
        break;
    }
  }
}

class Projectile {
  constructor(game, position, direction, source, weapon) {
    this.game = game;
    this.source = source; // 'player' or 'enemy'
    this.direction = direction.clone().normalize();
    this.speed = weapon.projectileSpeed;
    this.damage = weapon.damage;
    this.range = weapon.range;
    this.isExplosive = weapon.isExplosive;
    this.distanceTraveled = 0;
    this.isDestroyed = false;
    this.lifeTime = 5; // Destroy after 5 seconds if no collision
    this.lifetimeRemaining = this.lifeTime;
    
    // Create projectile object based on weapon type
    if (this.isExplosive) {
      this.object = this.createGrenadeModel(weapon.projectileSize, weapon.projectileColor);
    } else {
      this.object = this.createBulletModel(weapon.projectileSize, weapon.projectileColor);
    }
    
    // Set position and rotation
    this.object.position.copy(position);
    const targetPosition = new THREE.Vector3().copy(position).add(
      new THREE.Vector3().copy(direction).multiplyScalar(10)
    );
    this.object.lookAt(targetPosition);
    
    // Set up explosion properties if needed
    if (this.isExplosive) {
      this.explosionRadius = weapon.explosionRadius;
    }
    
    // Add object to the scene
    // (Already done in Game.spawnProjectile)
    
    // Set up collider
    this.collider = new THREE.Sphere(this.object.position.clone(), weapon.projectileSize);
  }
  
  createBulletModel(size, color) {
    const geometry = new THREE.CylinderGeometry(size / 4, size / 4, size * 2, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color, 
      emissiveIntensity: 0.5 
    });
    
    const bullet = new THREE.Mesh(geometry, material);
    bullet.rotation.x = Math.PI / 2; // Align the cylinder with the z-axis
    
    // Add a point light for a glow effect
    const light = new THREE.PointLight(color, 1, 3);
    light.position.set(0, 0, 0);
    bullet.add(light);
    
    return bullet;
  }
  
  createGrenadeModel(size, color) {
    const grenade = new THREE.Group();
    
    // Main grenade body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(size, 8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color, 
      emissiveIntensity: 0.3 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    grenade.add(body);
    
    // Add fuse on top
    const fuseGeometry = new THREE.CylinderGeometry(size/6, size/6, size/2, 8);
    const fuseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
    fuse.position.y = size * 0.6;
    grenade.add(fuse);
    
    // Blinking light to indicate it's active
    const light = new THREE.PointLight(0xff0000, 1, 3);
    light.position.set(0, size * 0.5, 0);
    
    // Make the light blink
    this.blinkInterval = setInterval(() => {
      if (!this.isDestroyed) {
        light.visible = !light.visible;
      } else {
        clearInterval(this.blinkInterval);
      }
    }, 200);
    
    grenade.add(light);
    
    return grenade;
  }
  
  update(deltaTime) {
    if (this.isDestroyed) return true;
    
    // Reduce lifetime
    this.lifetimeRemaining -= deltaTime;
    if (this.lifetimeRemaining <= 0) {
      if (this.isExplosive) {
        this.explode();
      }
      return true; // Indicate the projectile should be removed
    }
    
    // Move projectile in 3D space according to direction (which may include Y component)
    const moveDistance = this.speed * deltaTime;
    this.object.position.add(
      new THREE.Vector3().copy(this.direction).multiplyScalar(moveDistance)
    );
    
    // Update collider position
    this.collider.center.copy(this.object.position);
    
    // Track distance traveled
    this.distanceTraveled += moveDistance;
    
    // Check if projectile has reached its max range
    if (this.distanceTraveled >= this.range) {
      if (this.isExplosive) {
        this.explode();
      }
      return true; // Indicate the projectile should be removed
    }
    
    // Add gravity to grenades
    if (this.isExplosive) {
      const gravity = 9.8 * deltaTime * 2; // Simple gravity simulation
      this.direction.y -= gravity;
    }
    
    return false; // Projectile remains active
  }
  
  explode() {
    // Create explosion effect
    const explosionGeometry = new THREE.SphereGeometry(this.explosionRadius, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.7
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.object.position);
    this.game.scene.add(explosion);
    
    // Add explosive light
    const light = new THREE.PointLight(0xff6600, 2, this.explosionRadius * 3);
    light.position.copy(this.object.position);
    this.game.scene.add(light);
    
    // Deal damage to entities in explosion radius
    const position = this.object.position.clone();
    const radius = this.explosionRadius;
    
    // Check enemies in explosion radius
    this.game.enemies.forEach(enemy => {
      const distance = enemy.object.position.distanceTo(position);
      if (distance <= radius) {
        // Calculate damage based on distance (more damage when closer)
        const damageFactor = 1 - (distance / radius);
        const explosionDamage = this.damage * damageFactor;
        enemy.takeDamage(explosionDamage);
      }
    });
    
    // Check if player is in explosion radius
    const playerDistance = this.game.player.object.position.distanceTo(position);
    if (playerDistance <= radius && this.source === 'enemy') {
      const damageFactor = 1 - (playerDistance / radius);
      const explosionDamage = this.damage * damageFactor;
      this.game.player.takeDamage(explosionDamage);
    }
    
    // Fade out and remove explosion effect
    setTimeout(() => {
      // Create a fading animation for the explosion
      const fadeAnimation = setInterval(() => {
        explosionMaterial.opacity -= 0.05;
        light.intensity -= 0.1;
        
        if (explosionMaterial.opacity <= 0) {
          clearInterval(fadeAnimation);
          this.game.scene.remove(explosion);
          this.game.scene.remove(light);
        }
      }, 50);
    }, 100);
    
    this.destroy();
  }
  
  destroy() {
    this.isDestroyed = true;
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
    }
    // The actual object removal is handled in the game update loop
  }
  
  checkCollision(object) {
    if (this.isDestroyed) return false;
    
    const objectBox = new THREE.Box3().setFromObject(object);
    const objectSphere = new THREE.Sphere();
    objectBox.getBoundingSphere(objectSphere);
    
    return this.collider.intersectsSphere(objectSphere);
  }
}
