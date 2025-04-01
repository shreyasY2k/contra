class Portal {
  constructor(game, name, destinationUrl, position, color = 0x00ff00) {
    this.game = game;
    this.name = name;
    this.destinationUrl = destinationUrl;
    this.color = color;
    this.activationDistance = 3;
    
    // Create portal object
    this.object = new THREE.Group();
    
    // Set position
    this.object.position.copy(position);
    
    // Create portal geometry
    this.createPortalGeometry();
    
    // Update collider
    this.updateCollider();
    
    // Add to game's portal list
    if (!game.portals) {
      game.portals = [];
    }
    game.portals.push(this);
  }
  
  createPortalGeometry() {
    // Portal base/platform
    const baseGeometry = new THREE.CylinderGeometry(5, 5.5, 0.5, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = 0.25;
    baseMesh.receiveShadow = true;
    this.object.add(baseMesh);
    
    // Portal ring
    const ringGeometry = new THREE.TorusGeometry(4, 0.5, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.5
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.y = 4;
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.castShadow = true;
    this.object.add(ringMesh);
    
    // Portal effect (center)
    const portalGeometry = new THREE.CircleGeometry(3.5, 32);
    const portalMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const portalMesh = new THREE.Mesh(portalGeometry, portalMaterial);
    portalMesh.position.y = 4;
    portalMesh.rotation.x = Math.PI / 2;
    this.object.add(portalMesh);
    
    // Portal swirl effect
    const swirlGeometry = new THREE.CircleGeometry(3, 32);
    const swirlMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const swirlMesh = new THREE.Mesh(swirlGeometry, swirlMaterial);
    swirlMesh.position.y = 4.05;
    swirlMesh.rotation.x = Math.PI / 2;
    this.object.add(swirlMesh);
    
    // Create portal name label
    this.createPortalLabel();
    
    // Store meshes for animation
    this.ringMesh = ringMesh;
    this.portalMesh = portalMesh;
    this.swirlMesh = swirlMesh;
    
    // Start animation
    this.animate();
  }
  
  createPortalLabel() {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Clear canvas
    context.fillStyle = 'rgba(0,0,0,0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = this.rgbToHex(this.color);
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Draw text
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.fillText(this.name, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create a plane to display the texture
    const labelGeometry = new THREE.PlaneGeometry(5, 1.25);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    
    // Position the label above the portal
    labelMesh.position.y = 8;
    labelMesh.rotation.x = Math.PI / 2;
    
    // Add to portal
    this.object.add(labelMesh);
  }
  
  rgbToHex(color) {
    // Convert THREE.js color to CSS hex
    const r = Math.floor((color >> 16) & 255);
    const g = Math.floor((color >> 8) & 255);
    const b = Math.floor(color & 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  updateCollider() {
    // Create collision zone that's a cylinder matching the portal size
    this.collider = new Cylinder(
      new THREE.Vector3(this.object.position.x, this.object.position.y, this.object.position.z),
      4, // Radius
      8  // Height
    );
  }
  
  animate() {
    // Animate the portal effects
    this.animationInterval = setInterval(() => {
      if (!this.game.isGameActive) return;
      
      // Rotate the ring
      if (this.ringMesh) {
        this.ringMesh.rotation.z += 0.01;
      }
      
      // Rotate the swirl in opposite direction
      if (this.swirlMesh) {
        this.swirlMesh.rotation.z -= 0.02;
      }
      
      // Pulse the portal size
      if (this.portalMesh) {
        const scale = 1 + 0.05 * Math.sin(Date.now() * 0.002);
        this.portalMesh.scale.set(scale, scale, 1);
      }
    }, 16); // ~60fps
  }
  
  checkCollision(position) {
    // Check if player is within activation distance of portal
    const dx = position.x - this.object.position.x;
    const dy = position.y - this.object.position.y;
    const dz = position.z - this.object.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    return distance < this.activationDistance;
  }
  
  enterPortal(player) {
    // Build the URL with player data
    let url = this.destinationUrl;
    
    // Add separator if needed
    if (!url.includes('?')) {
      url += '?';
    } else if (!url.endsWith('&') && !url.endsWith('?')) {
      url += '&';
    }
    
    // Add portal=true to indicate this is a portal entrance
    url += 'portal=true';
    
    // Add player data
    url += `&username=${encodeURIComponent(player.name || 'Player')}`;
    url += `&color=${encodeURIComponent(this.getPlayerColorHex(player))}`;
    url += `&speed=${encodeURIComponent(player.speed)}`;
    url += `&ref=${encodeURIComponent(window.location.href)}`;
    
    // Add position and velocity data
    url += `&speed_x=${encodeURIComponent(player.velocity.x)}`;
    url += `&speed_y=${encodeURIComponent(player.velocity.y)}`;
    url += `&speed_z=${encodeURIComponent(player.velocity.z)}`;
    
    // Add rotation data
    url += `&rotation_y=${encodeURIComponent(player.object.rotation.y)}`;
    
    // Navigate to the destination
    window.location.href = url;
  }
  
  getPlayerColorHex(player) {
    // Get the player's color as a hex string
    if (player.bodyMesh && player.bodyMesh.material) {
      const color = player.bodyMesh.material.color;
      return `#${color.getHexString()}`;
    }
    return 'blue';
  }
  
  dispose() {
    // Clean up resources
    clearInterval(this.animationInterval);
    
    // Remove from scene if needed
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
  }
}
