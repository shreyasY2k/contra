import { Weapon } from './weapon.js';

export class WeaponPickup {
    constructor(scene, type, position) {
        this.scene = scene;
        this.weaponType = type;
        this.position = position;
        
        // Set properties based on weapon type
        switch (type) {
            case 'rifle':
                this.damage = 20;
                this.fireRate = 0.2;
                this.range = 75;
                this.ammo = 30;
                this.color = 0xff9900;
                this.bulletColor = 0xff9900;
                this.scale = 0.7;
                this.lifespan = 30; // seconds until disappearing
                break;
            case 'rocket':
                this.damage = 50;
                this.fireRate = 1.0;
                this.range = 100;
                this.ammo = 5;
                this.color = 0xff0000;
                this.bulletColor = 0xff0000;
                this.scale = 0.9;
                this.lifespan = 45; // seconds
                break;
            case 'laser':
                this.damage = 30;
                this.fireRate = 0.1;
                this.range = 100;
                this.ammo = 50;
                this.color = 0x00ffff;
                this.bulletColor = 0x00ffff;
                this.scale = 0.8;
                this.lifespan = 40; // seconds
                break;
            case 'shotgun':
                this.damage = 25;
                this.fireRate = 0.8;
                this.range = 30;
                this.ammo = 15;
                this.color = 0xffcc00;
                this.bulletColor = 0xffcc00; 
                this.scale = 0.75;
                this.lifespan = 35; // seconds
                break;
            default:
                this.damage = 20;
                this.fireRate = 0.2;
                this.range = 75;
                this.ammo = 30;
                this.color = 0xff9900;
                this.bulletColor = 0xff9900;
                this.scale = 0.7;
                this.lifespan = 30;
        }
        
        // Create pickup model
        this.createPickupModel();
        
        // Time tracking
        this.creationTime = Date.now();
        this.blinking = false;
        this.blinkStartTime = 0;
    }
    
    createPickupModel() {
        // Create a distinctive model for the weapon pickup
        const group = new THREE.Group();
        
        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.05;
        
        // Weapon model (simplified)
        let weaponGeometry;
        switch (this.weaponType) {
            case 'rifle':
                weaponGeometry = new THREE.BoxGeometry(0.15, 0.15, 1.2);
                break;
            case 'rocket':
                weaponGeometry = new THREE.CylinderGeometry(0.1, 0.2, 1.0, 8);
                break;
            case 'laser':
                weaponGeometry = new THREE.BoxGeometry(0.2, 0.15, 1.0);
                break;
            case 'shotgun':
                weaponGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.8);
                break;
            default:
                weaponGeometry = new THREE.BoxGeometry(0.15, 0.15, 1.0);
        }
        
        const weaponMaterial = new THREE.MeshLambertMaterial({ 
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.3
        });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0, 0.5, 0);
        
        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.5;
        
        // Add to group
        group.add(base, weapon, glow);
        group.position.copy(this.position);
        
        // Store references
        this.mesh = group;
        this.glow = glow;
        this.weaponMesh = weapon;
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        // Make the weapon float and rotate
        const time = Date.now() * 0.001;
        this.mesh.position.y = this.position.y + Math.sin(time * 2) * 0.1 + 0.5;
        this.weaponMesh.rotation.y = time * 1.5;
        
        // Check for pickup timeout
        const elapsedTime = (Date.now() - this.creationTime) / 1000;
        
        // Start blinking when 80% of lifespan has passed
        if (elapsedTime > this.lifespan * 0.8 && !this.blinking) {
            this.blinking = true;
            this.blinkStartTime = Date.now();
        }
        
        // Handle blinking effect
        if (this.blinking) {
            const blinkElapsed = (Date.now() - this.blinkStartTime) / 1000;
            const blinkRate = Math.max(0.1, 0.5 - (blinkElapsed * 0.02)); // Blink faster as time goes on
            
            this.mesh.visible = Math.sin(time / blinkRate) > 0;
        }
        
        // Return true as long as pickup should exist
        return elapsedTime < this.lifespan;
    }
    
    checkPlayerCollision(player) {
        if (!player || !this.mesh.visible) return false;
        
        const distance = player.mesh.position.distanceTo(this.mesh.position);
        return distance < 1.5;
    }
    
    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}
