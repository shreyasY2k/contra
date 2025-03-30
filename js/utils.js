// Utility functions for the Contra game

// Check if two objects are colliding using their bounding boxes
function checkBoxCollision(obj1, obj2) {
  const box1 = new THREE.Box3().setFromObject(obj1);
  const box2 = new THREE.Box3().setFromObject(obj2);
  
  return box1.intersectsBox(box2);
}

// Calculate distance between two 3D points
function distanceBetween(point1, point2) {
  return point1.distanceTo(point2);
}

// Get a random position within map boundaries
function getRandomPosition(mapSize) {
  const halfMapSize = mapSize / 2;
  return new THREE.Vector3(
    (Math.random() - 0.5) * mapSize,
    0,
    (Math.random() - 0.5) * mapSize
  );
}

// Get a random position away from a specific point
function getRandomPositionAwayFrom(point, minDistance, mapSize) {
  let position;
  do {
    position = getRandomPosition(mapSize);
  } while (distanceBetween(position, point) < minDistance);
  
  return position;
}

// Linear interpolation function
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

// Check if a point is in shadow (for future implementation)
function isInShadow(point, objects, lightPosition) {
  // Direction from point to light
  const direction = new THREE.Vector3()
    .subVectors(lightPosition, point)
    .normalize();
  
  // Cast a ray from the point towards the light
  const raycaster = new THREE.Raycaster(point, direction);
  const distance = point.distanceTo(lightPosition);
  
  // Check for intersections
  const intersections = raycaster.intersectObjects(objects, true);
  
  // If there are intersections before reaching the light, the point is in shadow
  return intersections.length > 0 && intersections[0].distance < distance;
}

// Ease-in-out function for smooth animations
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Calculate the angle between two vectors in radians
function angleBetweenVectors(v1, v2) {
  return Math.acos(v1.dot(v2) / (v1.length() * v2.length()));
}

// Shake effect for camera (used when explosions happen nearby)
function shakeCamera(camera, intensity, duration) {
  const originalPosition = camera.position.clone();
  let elapsed = 0;
  
  function updateShake() {
    elapsed += 0.016; // Approximately 60fps
    
    if (elapsed < duration) {
      const percentComplete = elapsed / duration;
      const damping = 1 - percentComplete; // Gradually reduce intensity
      
      // Apply random offset to camera position
      camera.position.set(
        originalPosition.x + (Math.random() - 0.5) * intensity * damping,
        originalPosition.y + (Math.random() - 0.5) * intensity * damping,
        originalPosition.z + (Math.random() - 0.5) * intensity * damping
      );
      
      requestAnimationFrame(updateShake);
    } else {
      // Reset to original position when complete
      camera.position.copy(originalPosition);
    }
  }
  
  updateShake();
}

// Find the closest entity of a specific type
function findClosest(position, entities) {
  let closest = null;
  let closestDistance = Infinity;
  
  entities.forEach(entity => {
    const distance = distanceBetween(position, entity.object.position);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = entity;
    }
  });
  
  return { entity: closest, distance: closestDistance };
}

// Check if an entity is within view cone
function isInViewCone(viewer, target, fovAngle, maxDistance) {
  const direction = viewer.getDirection();
  const toTarget = new THREE.Vector3()
    .subVectors(target.position, viewer.object.position)
    .normalize();
  
  const angle = angleBetweenVectors(direction, toTarget);
  const distance = distanceBetween(viewer.object.position, target.position);
  
  return angle <= fovAngle / 2 && distance <= maxDistance;
}
