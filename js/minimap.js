export class Minimap {
    constructor(containerElement) {
        this.container = containerElement;
        this.mapSize = this.container.clientWidth;
        this.scale = 0.1; // Scale of world to minimap (1:10)
        this.worldSize = 100; // Size of the game world
        this.centerOffset = this.mapSize / 2;
        
        // Colors for different entity types
        this.colors = {
            player: '#00ff00',      // Green
            enemy: '#ff0000',       // Red
            vehicle: '#0088ff',     // Blue
            weaponPickup: '#ffff00' // Yellow
        };
        
        // Initialize the minimap
        this.init();
    }
    
    init() {
        // Clear container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        // Create canvas element for rendering the minimap
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.mapSize;
        this.canvas.height = this.mapSize;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.ctx = this.canvas.getContext('2d');
        
        this.container.appendChild(this.canvas);
    }
    
    update(player, enemies, vehicles, weaponPickups) {
        // Clear the minimap
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw the background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw border
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.mapSize, this.mapSize);
        
        // Get player position as center reference
        let playerX = 0, playerZ = 0;
        if (player) {
            playerX = player.inVehicle ? player.currentVehicle.mesh.position.x : player.mesh.position.x;
            playerZ = player.inVehicle ? player.currentVehicle.mesh.position.z : player.mesh.position.z;
        }
        
        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 0.5;
        
        const gridStep = 10; // World units between grid lines
        for (let i = -this.worldSize/2; i <= this.worldSize/2; i += gridStep) {
            // Get minimap coordinates
            const minimapX = this.worldToMinimap(i, playerX, true);
            const minimapZ = this.worldToMinimap(i, playerZ, false);
            
            // Draw vertical line
            this.ctx.beginPath();
            this.ctx.moveTo(minimapX, 0);
            this.ctx.lineTo(minimapX, this.mapSize);
            this.ctx.stroke();
            
            // Draw horizontal line
            this.ctx.beginPath();
            this.ctx.moveTo(0, minimapZ);
            this.ctx.lineTo(this.mapSize, minimapZ);
            this.ctx.stroke();
        }
        
        // Draw entities
        
        // Draw weapon pickups (do first so they appear behind other entities)
        if (weaponPickups) {
            for (const pickup of weaponPickups) {
                const minimapX = this.worldToMinimap(pickup.mesh.position.x, playerX, true);
                const minimapZ = this.worldToMinimap(pickup.mesh.position.z, playerZ, false);
                
                // Draw blinking star for weapon pickups
                this.drawStar(minimapX, minimapZ, 5, this.colors.weaponPickup, true);
            }
        }
        
        // Draw enemies
        if (enemies) {
            for (const enemy of enemies) {
                const minimapX = this.worldToMinimap(enemy.mesh.position.x, playerX, true);
                const minimapZ = this.worldToMinimap(enemy.mesh.position.z, playerZ, false);
                
                // Draw diamond for enemies
                this.drawDiamond(minimapX, minimapZ, 5, this.colors.enemy);
            }
        }
        
        // Draw vehicles
        if (vehicles) {
            for (const vehicle of vehicles) {
                // Skip if player is in this vehicle
                if (player && player.inVehicle && player.currentVehicle === vehicle) continue;
                
                const minimapX = this.worldToMinimap(vehicle.mesh.position.x, playerX, true);
                const minimapZ = this.worldToMinimap(vehicle.mesh.position.z, playerZ, false);
                
                // Draw square for vehicles
                this.drawSquare(minimapX, minimapZ, 6, this.colors.vehicle);
            }
        }
        
        // Draw player last so it's on top
        if (player) {
            // Draw player at center
            this.drawTriangle(this.centerOffset, this.centerOffset, 8, this.colors.player, player.rotation);
        }
    }
    
    worldToMinimap(worldCoord, playerCoord, isX) {
        // Convert a world coordinate to minimap canvas coordinate
        // Relative to player position and scaled by minimap scale
        return this.centerOffset + (worldCoord - playerCoord) * this.scale * (isX ? 1 : 1); // Flip Y if needed
    }
    
    // Drawing methods for different entity types
    
    drawTriangle(x, y, size, color, rotation = 0) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.fillStyle = color;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(-size/2, size/2);
        this.ctx.lineTo(size/2, size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawDiamond(x, y, size, color) {
        this.ctx.fillStyle = color;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size);
        this.ctx.lineTo(x + size, y);
        this.ctx.lineTo(x, y + size);
        this.ctx.lineTo(x - size, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawSquare(x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - size/2, y - size/2, size, size);
    }
    
    drawStar(x, y, size, color, blinking = false) {
        // Optional blinking effect
        if (blinking && Math.floor(Date.now() / 500) % 2 === 0) return;
        
        this.ctx.fillStyle = color;
        
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
            const innerAngle = angle + Math.PI / 5;
            
            // Outer point
            const outerX = x + size * Math.cos(angle);
            const outerY = y + size * Math.sin(angle);
            
            // Inner point
            const innerX = x + (size/2) * Math.cos(innerAngle);
            const innerY = y + (size/2) * Math.sin(innerAngle);
            
            if (i === 0) {
                this.ctx.moveTo(outerX, outerY);
            } else {
                this.ctx.lineTo(outerX, outerY);
            }
            
            this.ctx.lineTo(innerX, innerY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    resize() {
        // Update size if container changes
        this.mapSize = this.container.clientWidth;
        this.centerOffset = this.mapSize / 2;
        
        // Update canvas size
        this.canvas.width = this.mapSize;
        this.canvas.height = this.mapSize;
    }
}
