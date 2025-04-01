class Weapon {
  constructor(type, damage, fireRate) {
    this.type = type;
    this.damage = damage;
    this.fireRate = fireRate; // In seconds
    this.projectileSpeed = 40;
    this.projectileLifetime = 2; // In seconds
  }
}

class Projectile {
  constructor(game, position, direction, source, weapon) {
    this.game = game;
    this.position = position.clone();
    this.direction = direction.clone();
    this.source = source; // 'player' or 'enemy'
    this.speed = weapon.projectileSpeed;
    this.damage = weapon.damage;
    this.lifetime = weapon.projectileLifetime; // In seconds
    this.elapsedTime = 0;
    this.isDead = false;
    
    // Scale the speed based on device
    if (game.isMobile) {
      this.speed *= 0.8; // Slightly slower on mobile
    }
    
    // Create projectile model
    this.createBulletModel();
    
    // Set initial position
    this.object.position.copy(this.position);
    
    // Get initial quaternion from direction
    this.object.lookAt(this.position.clone().add(this.direction));
    
    // Set up collider
    this.collider = new THREE.Box3().setFromObject(this.object);
  }
  
  createBulletModel() {
    // Different projectile models based on source
    if (this.source === 'player') {
      // Player projectile - blue bullet
      const bulletGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
      const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x0044ff,
        metalness: 0.7,
        roughness: 0.2
      });
      
      // Rotate the geometry to align with z-axis
      bulletGeometry.rotateX(Math.PI / 2);
      
      this.object = new THREE.Mesh(bulletGeometry, bulletMaterial);
      this.object.castShadow = true;
      
      // Add a point light for effect
      const light = new THREE.PointLight(0x00aaff, 1, 5);
      light.position.set(0, 0, 0);
      this.object.add(light);
    } else {
      // Enemy projectile - red bullet
      const bulletGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
      const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xaa0000,
        metalness: 0.7,
        roughness: 0.2
      });
      
      // Rotate the geometry to align with z-axis
      bulletGeometry.rotateX(Math.PI / 2);
      
      this.object = new THREE.Mesh(bulletGeometry, bulletMaterial);
      this.object.castShadow = true;
      
      // Add a point light for effect
      const light = new THREE.PointLight(0xff0000, 1, 5);
      light.position.set(0, 0, 0);
      this.object.add(light);
    }
    
    // Add projectile-specific userData for collision detection
    this.object.userData.type = 'projectile';
    this.object.userData.source = this.source;
  }
  
  update(deltaTime) {
    // Update elapsed time
    this.elapsedTime += deltaTime;
    
    // Check if lifetime has expired
    if (this.elapsedTime >= this.lifetime) {
      this.destroy();
      return true; // Signal to remove the projectile
    }
    
    // Calculate precise movement for this frame
    const moveDistance = this.speed * deltaTime;
    
    // Keep projectile moving in a perfect straight line along initial direction
    // This is crucial for accurate targeting
    const movement = this.direction.clone().multiplyScalar(moveDistance);
    this.object.position.add(movement);
    
    // Ensure projectile orientation always matches its travel direction
    this.object.lookAt(this.object.position.clone().add(this.direction));
    
    // Update collider with precise position
    this.collider.setFromObject(this.object);
    
    // Check if out of bounds
    const maxBounds = this.game.mapSize / 2;
    if (
      Math.abs(this.object.position.x) > maxBounds ||
      Math.abs(this.object.position.z) > maxBounds ||
      this.object.position.y < 0
    ) {
      this.destroy();
      return true; // Signal to remove the projectile
    }
    
    return this.isDead; // Return status
  }
  
  checkCollision(object) {
    // Update the collider before checking collision
    this.collider.setFromObject(this.object);
    
    const objectBox = new THREE.Box3().setFromObject(object);
    return this.collider.intersectsBox(objectBox);
  }
  
  destroy() {
    this.isDead = true;
    // Effect could be added here (explosion, etc.)
  }
}
