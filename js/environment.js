class Environment {
  constructor(game) {
    this.game = game;
    
    // Define material properties for objects
    this.materials = {
      building: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 }),
      tree: new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.9 }),
      rock: new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x994444, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }),
      water: new THREE.MeshStandardMaterial({ color: 0x3333AA, roughness: 0.2, transparent: true, opacity: 0.8 })
    };
  }
  
  createObjects() {
    // Create all environment objects based on game map size
    const mapSize = this.game.mapSize;
    const density = this.game.isMobile ? 0.5 : 1; // Lower density on mobile
    
    // Create buildings
    const numBuildings = Math.floor(mapSize / 50 * density);
    for (let i = 0; i < numBuildings; i++) {
      this.createBuilding();
    }
    
    // Create rock formations
    const numRocks = Math.floor(mapSize / 30 * density);
    for (let i = 0; i < numRocks; i++) {
      this.createRockFormation();
    }
    
    // Create trees
    const numTrees = Math.floor(mapSize / 20 * density);
    for (let i = 0; i < numTrees; i++) {
      this.createTree();
    }
    
    // Add water features
    const numWater = Math.floor(mapSize / 100);
    for (let i = 0; i < numWater; i++) {
      this.createWaterFeature();
    }
    
    // Add a military base in the center
    this.createMilitaryBase();
  }
  
  createBuilding() {
    // Random size and position
    const mapHalfSize = this.game.mapSize / 2 - 10; // 10 units buffer from edge
    const width = 5 + Math.random() * 10;
    const depth = 5 + Math.random() * 10;
    const height = 5 + Math.random() * 15;
    
    // Create building group
    const building = new THREE.Group();
    
    // Main structure
    const structure = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.materials.building
    );
    structure.position.y = height / 2;
    structure.castShadow = true;
    structure.receiveShadow = true;
    building.add(structure);
    
    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1, 0.5, depth + 1),
      this.materials.roof
    );
    roof.position.y = height + 0.25;
    roof.castShadow = true;
    roof.receiveShadow = true;
    building.add(roof);
    
    // Add some windows
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x88CCFF, emissive: 0x112233, transparent: true, opacity: 0.7
    });
    
    // Number of windows based on building size
    const windowsX = Math.floor(width / 2);
    const windowsY = Math.floor(height / 3);
    const windowsZ = Math.floor(depth / 2);
    
    // Function to add windows to a side
    const addWindows = (dimension, count, offset, rotation) => {
      for (let i = 0; i < count; i++) {
        if (Math.random() > 0.3) { // 70% chance to add a window
          const window = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.2),
            windowMaterial
          );
          
          switch(dimension) {
            case 'x':
              window.position.set(
                offset,
                2 + i * 3,
                (Math.random() - 0.5) * (depth - 1)
              );
              break;
            case 'z':
              window.position.set(
                (Math.random() - 0.5) * (width - 1),
                2 + i * 3,
                offset
              );
              break;
          }
          
          window.rotation.y = rotation;
          building.add(window);
        }
      }
    };
    
    // Add windows to each side
    addWindows('x', windowsY, width / 2 + 0.01, Math.PI / 2);
    addWindows('x', windowsY, -width / 2 - 0.01, -Math.PI / 2);
    addWindows('z', windowsY, depth / 2 + 0.01, 0);
    addWindows('z', windowsY, -depth / 2 - 0.01, Math.PI);
    
    // Random position on the map
    const xPos = (Math.random() * 2 - 1) * mapHalfSize;
    const zPos = (Math.random() * 2 - 1) * mapHalfSize;
    building.position.set(xPos, 0, zPos);
    
    // Create a precise collision box that matches the building dimensions
    // (slightly smaller than the visible building to prevent edge cases)
    const collisionBox = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.95, height, depth * 0.95),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collisionBox.position.y = height / 2;
    building.add(collisionBox);
    
    // Set up collision with appropriate sizing
    building.userData = { 
      type: 'obstacle', 
      solid: true,
      collider: collisionBox
    };
    
    // Add to scene and game's environment objects array
    this.game.scene.add(building);
    this.game.environmentObjects.push(building);
    
    return building;
  }
  
  createTree() {
    // Tree group
    const tree = new THREE.Group();
    
    // Random tree properties
    const mapHalfSize = this.game.mapSize / 2 - 5;
    const height = 4 + Math.random() * 8;
    const trunkRadius = 0.3 + Math.random() * 0.4;
    
    // Create trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, height * 0.4, 8),
      this.materials.wood
    );
    trunk.position.y = height * 0.2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Create foliage (random between cone and sphere shapes)
    const foliageType = Math.random() > 0.5 ? 'cone' : 'sphere';
    let foliage;
    
    if (foliageType === 'cone') {
      // Pine tree style
      const foliageRadius = 2 + Math.random() * 2;
      foliage = new THREE.Mesh(
        new THREE.ConeGeometry(foliageRadius, height * 0.8, 8),
        this.materials.tree
      );
      foliage.position.y = height * 0.6;
    } else {
      // Deciduous tree style
      const foliageRadius = 2 + Math.random() * 3;
      foliage = new THREE.Mesh(
        new THREE.SphereGeometry(foliageRadius, 8, 8),
        this.materials.tree
      );
      foliage.position.y = height * 0.6;
    }
    
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);
    
    // Random position on the map
    const xPos = (Math.random() * 2 - 1) * mapHalfSize;
    const zPos = (Math.random() * 2 - 1) * mapHalfSize;
    tree.position.set(xPos, 0, zPos);
    
    // Create a more precise collision box that matches the trunk
    const collisionBox = new THREE.Mesh(
      new THREE.BoxGeometry(trunkRadius * 2, height * 0.4, trunkRadius * 2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collisionBox.position.y = height * 0.2;
    tree.add(collisionBox);
    
    // Set up collision with appropriate sizing
    tree.userData = { 
      type: 'obstacle', 
      solid: true,
      collider: collisionBox // Store reference to the collision shape
    };
    
    // Add to scene and game's environment objects array
    this.game.scene.add(tree);
    this.game.environmentObjects.push(tree);
    
    return tree;
  }
  
  createRockFormation() {
    // Rock group
    const rockFormation = new THREE.Group();
    
    // Random properties
    const mapHalfSize = this.game.mapSize / 2 - 5;
    const size = 2 + Math.random() * 6;
    const rockCount = 3 + Math.floor(Math.random() * 5);
    
    // Create multiple rocks in a formation
    for (let i = 0; i < rockCount; i++) {
      const rockSize = size * (0.5 + Math.random() * 0.5);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rockSize, 1),
        this.materials.rock
      );
      
      // Random position within formation
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 0.8;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.5,
        Math.sin(angle) * distance
      );
      
      // Random rotation
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      rock.castShadow = true;
      rock.receiveShadow = true;
      rockFormation.add(rock);
    }
    
    // Random position on the map
    const xPos = (Math.random() * 2 - 1) * mapHalfSize;
    const zPos = (Math.random() * 2 - 1) * mapHalfSize;
    rockFormation.position.set(xPos, 0, zPos);
    
    // Create a simplified collision mesh for the rock formation
    const formationRadius = size * 0.8; // Slightly smaller than the visual size
    const collisionMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(formationRadius, formationRadius, size, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collisionMesh.position.y = size / 2;
    rockFormation.add(collisionMesh);
    
    // Set up collision with better sizing
    rockFormation.userData = { 
      type: 'obstacle', 
      solid: true,
      collider: collisionMesh
    };
    
    // Add to scene and game's environment objects array
    this.game.scene.add(rockFormation);
    this.game.environmentObjects.push(rockFormation);
    
    return rockFormation;
  }
  
  createWaterFeature() {
    // Water feature (pond or small lake)
    const mapHalfSize = this.game.mapSize / 2 - 20; // Keep water away from edges
    const size = 10 + Math.random() * 20;
    
    // Create water surface
    const waterGeometry = new THREE.CircleGeometry(size, 32);
    const water = new THREE.Mesh(waterGeometry, this.materials.water);
    
    // Rotate to be horizontal
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.1; // Slightly above ground to prevent z-fighting
    water.receiveShadow = true;
    
    // Random position on the map
    const xPos = (Math.random() * 2 - 1) * mapHalfSize;
    const zPos = (Math.random() * 2 - 1) * mapHalfSize;
    water.position.set(xPos, 0.1, zPos);
    
    // Set up collision (water is passable but may slow down entities)
    water.userData = { 
      type: 'water', 
      solid: false 
    };
    
    // Add to scene and game's environment objects array
    this.game.scene.add(water);
    this.game.environmentObjects.push(water);
    
    return water;
  }
  
  createMilitaryBase() {
    // Create a military base in the center of the map
    const baseGroup = new THREE.Group();
    const mapCenter = this.game.mapSize * 0.05; // Small offset from center
    
    // Main building
    const mainBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(20, 7, 15),
      this.materials.building
    );
    mainBuilding.position.set(0, 3.5, 0);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    baseGroup.add(mainBuilding);
    
    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1, 17),
      this.materials.roof
    );
    roof.position.set(0, 7.5, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    baseGroup.add(roof);
    
    // Watch towers
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + (Math.PI / 4);
      const distance = 25;
      
      const tower = new THREE.Group();
      
      // Tower base
      const towerBase = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2.5, 12, 8),
        this.materials.building
      );
      towerBase.position.y = 6;
      tower.add(towerBase);
      
      // Tower top
      const towerTop = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 2, 3, 8),
        this.materials.roof
      );
      towerTop.position.y = 13.5;
      tower.add(towerTop);
      
      // Position tower
      tower.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      tower.castShadow = true;
      tower.receiveShadow = true;
      baseGroup.add(tower);
    }
    
    // Perimeter wall
    const wallSegments = 16;
    const wallRadius = 30;
    
    for (let i = 0; i < wallSegments; i++) {
      const angle1 = (i / wallSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / wallSegments) * Math.PI * 2;
      
      const x1 = Math.cos(angle1) * wallRadius;
      const z1 = Math.sin(angle1) * wallRadius;
      const x2 = Math.cos(angle2) * wallRadius;
      const z2 = Math.sin(angle2) * wallRadius;
      
      // Calculate wall dimensions
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
      const wallAngle = Math.atan2(z2 - z1, x2 - x1);
      
      // Create wall segment
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(length, 4, 1),
        this.materials.building
      );
      
      // Position and rotate wall
      wall.position.set((x1 + x2) / 2, 2, (z1 + z2) / 2);
      wall.rotation.y = wallAngle;
      
      wall.castShadow = true;
      wall.receiveShadow = true;
      baseGroup.add(wall);
    }
    
    // Position the entire base
    baseGroup.position.set(mapCenter, 0, mapCenter);
    
    // Set up collision
    baseGroup.userData = { 
      type: 'obstacle', 
      solid: true 
    };
    
    // Add to scene and environment objects
    this.game.scene.add(baseGroup);
    this.game.environmentObjects.push(baseGroup);
    
    return baseGroup;
  }
}
