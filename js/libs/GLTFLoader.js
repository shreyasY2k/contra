/**
 * This is a simplified version of the THREE.GLTFLoader
 * The actual implementation would be from Three.js
 * We're creating this as a placeholder to avoid errors since we're not including the full Three.js package
 */

THREE.GLTFLoader = class GLTFLoader {
  constructor(manager) {
    this.manager = manager || THREE.DefaultLoadingManager;
  }

  load(url, onLoad, onProgress, onError) {
    console.log(`Loading GLTF model from ${url}`);
    
    // In a real implementation, this would load the model
    // For our purposes, we'll just create a placeholder box model
    
    setTimeout(() => {
      const scene = new THREE.Scene();
      
      // Create a placeholder box
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      
      // Call the success callback with our mock scene
      if (onLoad) onLoad({ scene });
      
    }, 500); // Simulate loading time
  }

  setPath(path) {
    this.path = path;
    return this;
  }

  setResourcePath(path) {
    this.resourcePath = path;
    return this;
  }

  setCrossOrigin(crossOrigin) {
    this.crossOrigin = crossOrigin;
    return this;
  }
};
