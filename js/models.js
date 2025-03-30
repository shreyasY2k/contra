// Model loader and manager for the Contra game

class ModelManager {
  constructor() {
    this.loader = new THREE.GLTFLoader();
    this.models = {};
    this.pendingLoads = 0;
    this.onAllLoadedCallback = null;
  }
  
  load(modelId, modelPath) {
    this.pendingLoads++;
    
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf) => {
          this.models[modelId] = gltf.scene;
          this.pendingLoads--;
          
          if (this.pendingLoads === 0 && this.onAllLoadedCallback) {
            this.onAllLoadedCallback();
          }
          
          resolve(gltf.scene);
        },
        (xhr) => {
          console.log(`${modelId}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
          console.error(`Error loading model ${modelId}:`, error);
          this.pendingLoads--;
          reject(error);
        }
      );
    });
  }
  
  get(modelId) {
    if (!this.models[modelId]) {
      console.warn(`Model ${modelId} not found, using placeholder`);
      return this.createPlaceholder();
    }
    
    // Clone the model to allow for multiple instances
    return this.models[modelId].clone();
  }
  
  createPlaceholder() {
    // Create a simple cube as placeholder
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta for visibility
    return new THREE.Mesh(geometry, material);
  }
  
  onAllLoaded(callback) {
    this.onAllLoadedCallback = callback;
    
    // If everything is already loaded, call the callback immediately
    if (this.pendingLoads === 0 && callback) {
      callback();
    }
  }
}

// Function to create simple models procedurally when no GLTF model is available
function createSimpleModel(type) {
  switch (type) {
    case 'player':
      return createPlayerModel();
    case 'soldier':
      return createSoldierModel();
    case 'tank':
      return createTankModel();
    case 'helicopter':
      return createHelicopterModel();
    case 'jeep':
      return createJeepModel();
    default:
      return createPlaceholderModel();
  }
}

function createPlayerModel() {
  const player = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.y = 1;
  bodyMesh.castShadow = true;
  player.add(bodyMesh);
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  headMesh.position.y = 2.5;
  headMesh.castShadow = true;
  player.add(headMesh);
  
  return player;
}

function createSoldierModel() {
  const soldier = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.y = 1;
  bodyMesh.castShadow = true;
  soldier.add(bodyMesh);
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  headMesh.position.y = 2.5;
  headMesh.castShadow = true;
  soldier.add(headMesh);
  
  return soldier;
}

function createTankModel() {
  const tank = new THREE.Group();
  
  // Tank body
  const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 3);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x556b2f });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.y = 0.75;
  bodyMesh.castShadow = true;
  tank.add(bodyMesh);
  
  // Tank turret
  const turretGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1, 8);
  const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x3b3b3b });
  const turretMesh = new THREE.Mesh(turretGeometry, turretMaterial);
  turretMesh.position.y = 1.75;
  turretMesh.castShadow = true;
  tank.add(turretMesh);
  
  // Tank barrel
  const barrelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 3, 8);
  const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
  barrelMesh.position.z = 1.5;
  barrelMesh.rotation.x = Math.PI / 2;
  barrelMesh.castShadow = true;
  turretMesh.add(barrelMesh);
  
  return tank;
}

function createHelicopterModel() {
  const helicopter = new THREE.Group();
  
  // Helicopter body
  const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2d572c });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.castShadow = true;
  helicopter.add(bodyMesh);
  
  // Main rotor
  const rotorGeometry = new THREE.BoxGeometry(8, 0.1, 0.5);
  const rotorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const rotorMesh = new THREE.Mesh(rotorGeometry, rotorMaterial);
  rotorMesh.position.y = 1;
  rotorMesh.castShadow = true;
  helicopter.add(rotorMesh);
  
  return helicopter;
}

function createJeepModel() {
  const jeep = new THREE.Group();
  
  // Jeep body
  const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2.5);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x446633 });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.y = 1;
  bodyMesh.castShadow = true;
  jeep.add(bodyMesh);
  
  return jeep;
}

function createPlaceholderModel() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta
  return new THREE.Mesh(geometry, material);
}
