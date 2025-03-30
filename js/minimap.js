class Minimap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
    this.size = 150; // Size of the minimap in pixels
    this.mapSize = game.mapSize; // Size of the game map in world units
    
    // Set canvas size
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    
    // Colors for different entities on the minimap
    this.colors = {
      player: '#00ff00', // Green
      enemy: '#ff0000', // Red
      vehicle: '#0088ff', // Blue
      building: '#888888', // Gray
      tree: '#006600', // Dark green
      rock: '#996633', // Brown
      border: '#ffffff' // White
    };
  }
  
  update() {
    // Clear the canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.size, this.size);
    
    // Draw border
    this.ctx.strokeStyle = this.colors.border;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.size, this.size);
    
    // Calculate scale factor
    const scale = this.size / this.mapSize;
    
    // Draw environment objects (buildings, trees, rocks)
    this.drawEnvironment(scale);
    
    // Draw vehicles
    this.drawVehicles(scale);
    
    // Draw enemies
    this.drawEnemies(scale);
    
    // Draw player
    this.drawPlayer(scale);
  }
  
  drawEnvironment(scale) {
    // Draw buildings
    if (this.game.environmentObjects) {
      this.game.environmentObjects.forEach(obj => {
        // Determine object type by geometry
        let color = this.colors.building;
        let size = 4;
        
        if (obj instanceof THREE.Group) {
          // Assume it's a tree
          color = this.colors.tree;
          size = 2;
        } else if (obj.geometry instanceof THREE.SphereGeometry) {
          // Assume it's a rock
          color = this.colors.rock;
          size = 3;
        }
        
        const x = this.worldToMapX(obj.position.x, scale);
        const y = this.worldToMapZ(obj.position.z, scale);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
      });
    }
  }
  
  drawVehicles(scale) {
    this.game.vehicles.forEach(vehicle => {
      const x = this.worldToMapX(vehicle.object.position.x, scale);
      const y = this.worldToMapZ(vehicle.object.position.z, scale);
      
      this.ctx.fillStyle = this.colors.vehicle;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw direction indicator
      const direction = vehicle.direction.clone().normalize();
      const indicatorLength = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(
        x + direction.x * indicatorLength,
        y + direction.z * indicatorLength
      );
      this.ctx.strokeStyle = this.colors.vehicle;
      this.ctx.stroke();
    });
  }
  
  drawEnemies(scale) {
    this.game.enemies.forEach(enemy => {
      const x = this.worldToMapX(enemy.object.position.x, scale);
      const y = this.worldToMapZ(enemy.object.position.z, scale);
      
      // Different shapes for different enemy types
      switch (enemy.type) {
        case 'soldier':
          // Small triangle for soldiers
          this.ctx.fillStyle = this.colors.enemy;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - 2);
          this.ctx.lineTo(x - 2, y + 2);
          this.ctx.lineTo(x + 2, y + 2);
          this.ctx.closePath();
          this.ctx.fill();
          break;
        
        case 'tank':
          // Square for tanks
          this.ctx.fillStyle = this.colors.enemy;
          this.ctx.fillRect(x - 3, y - 3, 6, 6);
          break;
        
        case 'jeep': // Changed from helicopter
          // Diamond for jeeps
          this.ctx.fillStyle = this.colors.enemy;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - 3);
          this.ctx.lineTo(x + 3, y);
          this.ctx.lineTo(x, y + 3);
          this.ctx.lineTo(x - 3, y);
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }
    });
  }
  
  drawPlayer(scale) {
    const x = this.worldToMapX(this.game.player.object.position.x, scale);
    const y = this.worldToMapZ(this.game.player.object.position.z, scale);
    
    // Draw player as a dot with direction indicator
    this.ctx.fillStyle = this.colors.player;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw direction indicator
    const direction = this.game.player.direction.clone().normalize();
    const indicatorLength = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(
      x + direction.x * indicatorLength,
      y + direction.z * indicatorLength
    );
    this.ctx.strokeStyle = this.colors.player;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw player's field of view (a cone in the direction they're facing)
    const fovAngle = Math.PI / 3; // 60 degrees field of view
    const fovDistance = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    
    // Calculate the angle based on the direction vector
    const angle = Math.atan2(direction.x, direction.z);
    
    this.ctx.arc(
      x, y,
      fovDistance,
      angle - fovAngle / 2,
      angle + fovAngle / 2
    );
    this.ctx.closePath();
    
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    this.ctx.fill();
  }
  
  worldToMapX(worldX, scale) {
    // Convert from world coordinates to minimap coordinates
    return this.size / 2 + worldX * scale;
  }
  
  worldToMapZ(worldZ, scale) {
    // Convert from world coordinates to minimap coordinates
    // Note: Z in world coordinates becomes Y on the 2D minimap
    return this.size / 2 - worldZ * scale;
  }
}
