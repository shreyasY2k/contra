export class Weapon {
    constructor(type, damage, fireRate, range, ammo, bulletColor) {
        this.type = type;
        this.damage = damage;
        this.fireRate = fireRate; // in seconds
        this.range = range;
        this.maxAmmo = ammo;
        this.currentAmmo = ammo;
        this.bulletColor = bulletColor || 0xffff00;
        
        // Define weapon properties based on type
        switch (type) {
            case 'pistol':
                this.bulletSpeed = 0.8;
                this.bulletSize = 0.1;
                this.bulletColor = 0xffff00;
                this.sound = 'pistol-shot.mp3';
                this.spread = 0.02; // accuracy - lower is more accurate
                this.bulletCount = 1; // bullets per shot
                break;
            case 'rifle':
                this.bulletSpeed = 1.2;
                this.bulletSize = 0.08;
                this.bulletColor = 0xff9900;
                this.sound = 'rifle-shot.mp3';
                this.spread = 0.05;
                this.bulletCount = 1;
                break;
            case 'rocket':
                this.bulletSpeed = 0.6;
                this.bulletSize = 0.2;
                this.bulletColor = 0xff0000;
                this.sound = 'rocket-launch.mp3';
                this.spread = 0.01;
                this.bulletCount = 1;
                this.explosive = true;
                break;
            case 'shotgun':
                this.bulletSpeed = 0.7;
                this.bulletSize = 0.06;
                this.bulletColor = 0xffcc00;
                this.sound = 'shotgun-blast.mp3';
                this.spread = 0.2;
                this.bulletCount = 8;
                break;
            case 'laser':
                this.bulletSpeed = 1.5;
                this.bulletSize = 0.07;
                this.bulletColor = 0x00ffff;
                this.sound = 'laser-fire.mp3';
                this.spread = 0;
                this.bulletCount = 1;
                break;
            default:
                this.bulletSpeed = 0.8;
                this.bulletSize = 0.1;
                this.bulletColor = 0xffff00;
                this.sound = 'pistol-shot.mp3';
                this.spread = 0.02;
                this.bulletCount = 1;
        }
    }
    
    reload() {
        this.currentAmmo = this.maxAmmo;
    }
    
    hasAmmo() {
        return this.currentAmmo > 0 || this.currentAmmo === Infinity;
    }
    
    useAmmo() {
        if (this.currentAmmo === Infinity) {
            return true;
        }
        
        if (this.currentAmmo > 0) {
            this.currentAmmo--;
            return true;
        }
        
        return false;
    }
    
    createBullet(scene, position, direction) {
        // For multi-bullet weapons like shotgun, this will be called multiple times
        // Add spread to make the shot less accurate
        const spreadDirection = new THREE.Vector3().copy(direction);
        
        // Add randomness based on spread factor
        if (this.spread > 0) {
            spreadDirection.x += (Math.random() - 0.5) * this.spread;
            spreadDirection.y += (Math.random() - 0.5) * this.spread;
            spreadDirection.z += (Math.random() - 0.5) * this.spread;
            spreadDirection.normalize();
        }
        
        // Create bullet geometry
        let bulletGeometry;
        if (this.type === 'rocket') {
            bulletGeometry = new THREE.CylinderGeometry(this.bulletSize, this.bulletSize * 1.5, this.bulletSize * 4, 8);
            // Rotate to point in the direction of travel
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spreadDirection);
            bulletGeometry.applyQuaternion(quaternion);
        } else if (this.type === 'laser') {
            bulletGeometry = new THREE.BoxGeometry(this.bulletSize, this.bulletSize, this.bulletSize * 5);
        } else {
            bulletGeometry = new THREE.SphereGeometry(this.bulletSize);
        }
        
        // Create material with glow effect
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: this.bulletColor,
            emissive: this.bulletColor,
            emissiveIntensity: 0.5
        });
        
        // Create the bullet mesh
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.copy(position);
        
        // Add particle effects based on weapon type
        let particles = null;
        
        if (this.type === 'rocket') {
            // Add rocket trail
            particles = this.createRocketTrail(bullet);
            scene.add(particles);
        } else if (this.type === 'laser') {
            // Add laser glow
            const glowGeometry = new THREE.SphereGeometry(this.bulletSize * 2);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: this.bulletColor,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            bullet.add(glow);
        }
        
        // Orient bullet correctly
        if (this.type === 'laser' || this.type === 'rocket') {
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spreadDirection);
            bullet.quaternion.copy(quaternion);
        }
        
        // Add to scene
        scene.add(bullet);
        
        // Return bullet object
        return {
            mesh: bullet,
            direction: spreadDirection,
            speed: this.bulletSpeed,
            damage: this.damage,
            range: this.range,
            isFromPlayer: true,
            distanceTraveled: 0,
            particles: particles,
            isExplosive: this.explosive || false,
            update() {
                bullet.position.add(this.direction.clone().multiplyScalar(this.speed));
                this.distanceTraveled += this.speed;
                
                // Update particle effects if they exist
                if (this.particles) {
                    // Position the particle system behind the bullet
                    const offset = this.direction.clone().multiplyScalar(-0.5);
                    this.particles.position.copy(bullet.position).add(offset);
                }
            },
            checkCollision(otherMesh) {
                return bullet.position.distanceTo(otherMesh.position) < 1;
            },
            explode(scene) {
                if (!this.isExplosive) return;
                
                // Create explosion effect
                if (window.game) {
                    window.game.createExplosion(bullet.position.clone(), 1.5);
                }
                
                // Add damage to nearby enemies in radius
                const explosionRadius = 5;
                const explosionDamage = this.damage * 0.7;
                
                if (window.game && window.game.enemies) {
                    for (const enemy of window.game.enemies) {
                        const distance = bullet.position.distanceTo(enemy.mesh.position);
                        if (distance < explosionRadius) {
                            // Scale damage by distance
                            const damageScale = 1 - (distance / explosionRadius);
                            enemy.takeDamage(explosionDamage * damageScale);
                        }
                    }
                }
            }
        };
    }
    
    createRocketTrail(bullet) {
        // Create a simple particle trail for rockets
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.1 + 0.05;
            const particleGeometry = new THREE.SphereGeometry(size);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff5500 : 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            // Randomly position particles behind the bullet
            particle.position.set(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                -Math.random() * 0.5
            );
            
            particles.add(particle);
        }
        
        return particles;
    }
    
    // Get a display name for UI
    getDisplayName() {
        return this.type.charAt(0).toUpperCase() + this.type.slice(1);
    }
}
