// This file manages model creation for the game entities
// It generates primitive models when GLTF files aren't available

class ModelFactory {
    constructor(scene) {
        this.scene = scene;
        this.models = {
            player: null,
            soldier: null,
            tank: null,
            helicopter: null,
            jeep: null
        };
        this.initialized = false;
    }
    
    initialize() {
        if (this.initialized) return;
        
        // Create all basic models
        this.createPlayerModel();
        this.createSoldierModel();
        this.createTankModel();
        this.createHelicopterModel();
        this.createJeepModel();
        
        this.initialized = true;
    }
    
    createPlayerModel() {
        const model = new THREE.Group();
        
        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0xFFD700 })
        );
        head.position.y = 0.7;
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.2),
            new THREE.MeshLambertMaterial({ color: 0x0000FF })
        );
        body.position.y = 0.3;
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0000AA });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.25, 0.3, 0);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.25, 0.3, 0);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.12, -0.15, 0);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.12, -0.15, 0);
        
        // Gun
        const gun = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.4),
            new THREE.MeshLambertMaterial({ color: 0x111111 })
        );
        gun.position.set(0.25, 0.3, 0.15);
        
        model.add(head, body, leftArm, rightArm, leftLeg, rightLeg, gun);
        this.models.player = model;
        
        return model;
    }
    
    createSoldierModel(color = 0xff0000) {
        const model = new THREE.Group();
        
        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0x8B0000 })
        );
        head.position.y = 0.7;
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.2),
            new THREE.MeshLambertMaterial({ color })
        );
        body.position.y = 0.3;
        
        // Arms
        const arms = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.1, 0.1),
            new THREE.MeshLambertMaterial({ color })
        );
        arms.position.y = 0.4;
        
        // Legs
        const legs = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.5, 0.2),
            new THREE.MeshLambertMaterial({ color: 0x800000 })
        );
        legs.position.y = -0.1;
        
        // Gun
        const gun = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.3),
            new THREE.MeshLambertMaterial({ color: 0x111111 })
        );
        gun.position.set(0.2, 0.3, 0.15);
        
        model.add(head, body, arms, legs, gun);
        this.models.soldier = model;
        
        return model;
    }
    
    createTankModel(color = 0x556B2F) {
        const model = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.8, 4),
            new THREE.MeshLambertMaterial({ color })
        );
        
        // Turret
        const turret = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 0.8, 8),
            new THREE.MeshLambertMaterial({ color })
        );
        turret.position.y = 0.8;
        
        // Barrel
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 3, 8),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.8, 1.5);
        
        // Tracks
        const tracks = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.6, 4.5),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
        );
        tracks.position.y = -0.1;
        
        model.add(body, turret, barrel, tracks);
        this.models.tank = model;
        
        return model;
    }
    
    createHelicopterModel(color = 0x708090) {
        const model = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 1, 4, 8),
            new THREE.MeshLambertMaterial({ color })
        );
        body.rotation.z = Math.PI / 2;
        
        // Cockpit
        const cockpit = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0x87CEFA, transparent: true, opacity: 0.7 })
        );
        cockpit.position.set(0, 0.5, 1.5);
        cockpit.rotation.x = -Math.PI / 2;
        
        // Tail
        const tail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, 3, 8),
            new THREE.MeshLambertMaterial({ color })
        );
        tail.position.set(0, 0, -2);
        
        // Main Rotor
        const mainRotor = new THREE.Group();
        
        const blade1 = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.1, 0.5),
            new THREE.MeshLambertMaterial({ color: 0xAAAAAA })
        );
        
        const blade2 = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.1, 0.5),
            new THREE.MeshLambertMaterial({ color: 0xAAAAAA })
        );
        blade2.rotation.y = Math.PI / 2;
        
        mainRotor.add(blade1, blade2);
        mainRotor.position.set(0, 1.5, 0);
        
        // Tail Rotor
        const tailRotor = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.2),
            new THREE.MeshLambertMaterial({ color: 0xAAAAAA })
        );
        tailRotor.position.set(0.5, 0, -3.5);
        tailRotor.rotation.z = Math.PI / 2;
        
        model.add(body, cockpit, tail, mainRotor, tailRotor);
        this.models.helicopter = model;
        
        return model;
    }
    
    createJeepModel(color = 0x228B22) {
        const model = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.6, 3),
            new THREE.MeshLambertMaterial({ color })
        );
        body.position.y = 0.3;
        
        // Top
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.5, 1.5),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
        );
        top.position.y = 0.8;
        top.position.z = -0.5;
        
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
        
        model.add(body, top, wheelFL, wheelFR, wheelBL, wheelBR);
        this.models.jeep = model;
        
        return model;
    }
    
    getModel(type, color) {
        if (!this.initialized) {
            this.initialize();
        }
        
        let model;
        switch (type) {
            case 'player':
                model = this.models.player.clone();
                break;
            case 'soldier':
                model = this.models.soldier.clone();
                break;
            case 'tank':
                model = this.models.tank.clone();
                break;
            case 'helicopter':
                model = this.models.helicopter.clone();
                break;
            case 'jeep':
                model = this.models.jeep.clone();
                break;
            default:
                model = new THREE.Group();
        }
        
        return model;
    }
}

export default ModelFactory;
