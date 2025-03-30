class Environment {
  constructor(game) {
    this.game = game;
    this.buildings = [];
    this.trees = [];
    this.rocks = [];
  }
  
  createObjects() {
    // Create random buildings, trees and rocks in the world
    this.createBuildings(10);
    this.createTrees(40);
    this.createRocks(25);
  }
  
  createBuildings(count) {
    for (let i = 0; i < count; i++) {
      // Random building size
      const width = 5 + Math.random() * 10;
      const height = 10 + Math.random() * 15;
      const depth = 5 + Math.random() * 10;
      
      // Create building mesh
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(0.3 + Math.random() * 0.1, 0.3 + Math.random() * 0.1, 0.3 + Math.random() * 0.1),
        roughness: 0.7
      });
      const building = new THREE.Mesh(geometry, material);
      
      // Position randomly in the world, but not too close to the center (player spawn)
      let x, z;
      do {
        x = (Math.random() - 0.5) * (this.game.mapSize - 20);
        z = (Math.random() - 0.5) * (this.game.mapSize - 20);
      } while (Math.sqrt(x * x + z * z) < 30); // Keep buildings at least 30 units away from center
      
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      
      // Add to scene and track in game
      this.game.scene.add(building);
      this.buildings.push(building);
      this.game.environmentObjects.push(building);
      
      // Add windows to buildings
      this.addWindowsToBuilding(building, width, height, depth);
    }
  }
  
  addWindowsToBuilding(building, width, height, depth) {
    // Add windows on each side of the building
    const windowSize = 1;
    const windowSpacing = 2;
    const windowColor = 0xaaccff;
    
    // Calculate number of windows that can fit on each dimension
    const windowsPerWidth = Math.floor(width / windowSpacing) - 1;
    const windowsPerHeight = Math.floor(height / windowSpacing) - 1;
    const windowsPerDepth = Math.floor(depth / windowSpacing) - 1;
    
    // Window geometry and material
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: windowColor,
      emissive: windowColor,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });
    
    // Front and back windows
    for (let y = 0; y < windowsPerHeight; y++) {
      for (let x = 0; x < windowsPerWidth; x++) {
        const windowX = -width / 2 + windowSpacing + x * windowSpacing;
        const windowY = -height / 2 + windowSpacing + y * windowSpacing;
        
        // Front window
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(windowX, windowY, depth / 2 + 0.05);
        building.add(frontWindow);
        
        // Back window
        const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        backWindow.position.set(windowX, windowY, -depth / 2 - 0.05);
        backWindow.rotation.y = Math.PI;
        building.add(backWindow);
      }
    }
    
    // Left and right windows
    for (let y = 0; y < windowsPerHeight; y++) {
      for (let z = 0; z < windowsPerDepth; z++) {
        const windowZ = -depth / 2 + windowSpacing + z * windowSpacing;
        const windowY = -height / 2 + windowSpacing + y * windowSpacing;
        
        // Left window
        const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(-width / 2 - 0.05, windowY, windowZ);
        leftWindow.rotation.y = Math.PI / 2;
        building.add(leftWindow);
        
        // Right window
        const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(width / 2 + 0.05, windowY, windowZ);
        rightWindow.rotation.y = -Math.PI / 2;
        building.add(rightWindow);
      }
    }
  }
  
  createTrees(count) {
    for (let i = 0; i < count; i++) {
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      // Tree leaves
      const leavesGeometry = new THREE.ConeGeometry(3, 6, 8);
      const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 }); // Forest green
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 4;
      leaves.castShadow = true;
      
      // Create a tree group
      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);
      
      // Position randomly in the world
      let x, z;
      do {
        x = (Math.random() - 0.5) * (this.game.mapSize - 10);
        z = (Math.random() - 0.5) * (this.game.mapSize - 10);
      } while (Math.sqrt(x * x + z * z) < 15); // Keep trees at least 15 units away from center
      
      tree.position.set(x, 1.5, z);
      
      // Add to scene and track in game
      this.game.scene.add(tree);
      this.trees.push(tree);
      this.game.environmentObjects.push(tree);
    }
  }
  
  createRocks(count) {
    for (let i = 0; i < count; i++) {
      // Create rock geometry based on a deformed sphere
      const rockGeometry = new THREE.SphereGeometry(1 + Math.random() * 2, 7, 7);
      
      // Deform the geometry to make it look more like a rock
      const vertices = rockGeometry.attributes.position.array;
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] += (Math.random() - 0.5) * 0.3;
        vertices[j + 1] += (Math.random() - 0.5) * 0.3;
        vertices[j + 2] += (Math.random() - 0.5) * 0.3;
      }
      
      // Update the geometry
      rockGeometry.computeVertexNormals();
      
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2),
        roughness: 0.9
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      // Position randomly in the world
      let x, z;
      do {
        x = (Math.random() - 0.5) * (this.game.mapSize - 10);
        z = (Math.random() - 0.5) * (this.game.mapSize - 10);
      } while (Math.sqrt(x * x + z * z) < 10); // Keep rocks at least 10 units away from center
      
      rock.position.set(x, rock.geometry.parameters.radius / 2, z);
      
      // Add to scene and track in game
      this.game.scene.add(rock);
      this.rocks.push(rock);
      this.game.environmentObjects.push(rock);
    }
  }
}
