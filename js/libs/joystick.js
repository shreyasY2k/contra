/**
 * Simple virtual joystick implementation for mobile controls with 360-degree movement
 */
class Joystick {
  constructor(options) {
    this.container = options.container || document.body;
    this.baseElement = options.baseElement;
    this.thumbElement = options.thumbElement;
    this.maxRadius = options.maxRadius || 40;
    
    this.active = false;
    this.vector = { x: 0, y: 0 };
    this.position = { x: 0, y: 0 };
    this.origin = { x: 0, y: 0 };
    this.angle = 0; // Angle in radians
    this.magnitude = 0; // Distance from center (0-1)
    this.touchId = null; // Store the touch ID that's controlling this joystick
    
    this.init();
  }
  
  init() {
    // Touch events
    this.baseElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
    document.addEventListener('touchcancel', this.onTouchEnd.bind(this));
    
    // Mouse events (for testing on desktop)
    this.baseElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    console.log('Joystick initialized');
  }
  
  onTouchStart(event) {
    // Prevent default to avoid scrolling
    event.preventDefault();
    
    if (this.active) return; // Already tracking a touch
    
    this.active = true;
    const touch = event.touches[0];
    this.touchId = touch.identifier; // Store the touch ID
    
    const rect = this.baseElement.getBoundingClientRect();
    
    this.origin.x = rect.left + rect.width / 2;
    this.origin.y = rect.top + rect.height / 2;
    
    this.position.x = touch.clientX;
    this.position.y = touch.clientY;
    
    this.updateJoystickPosition();
    
    if (typeof this.onStart === 'function') {
      this.onStart(this.vector.x, this.vector.y, this.angle, this.magnitude);
    }
    
    console.log('Joystick touch start', this.vector);
  }
  
  onTouchMove(event) {
    if (!this.active) return;
    
    // Prevent default to avoid scrolling while using the joystick
    event.preventDefault();
    
    // Find our specific touch by ID
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      if (touch.identifier === this.touchId) {
        this.position.x = touch.clientX;
        this.position.y = touch.clientY;
        this.updateJoystickPosition();
        
        if (typeof this.onMove === 'function') {
          this.onMove(this.vector.x, this.vector.y);
        }
        break;
      }
    }
  }
  
  onTouchEnd(event) {
    // Check if our tracked touch has ended
    let touchStillActive = false;
    
    // Check if our touch ID is still in the touches list
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === this.touchId) {
        touchStillActive = true;
        break;
      }
    }
    
    if (!touchStillActive) {
      this.resetJoystick();
    }
  }
  
  onMouseDown(event) {
    // Only for testing on desktop
    this.active = true;
    
    const rect = this.baseElement.getBoundingClientRect();
    
    this.origin.x = rect.left + rect.width / 2;
    this.origin.y = rect.top + rect.height / 2;
    
    this.position.x = event.clientX;
    this.position.y = event.clientY;
    
    this.updateJoystickPosition();
    
    if (typeof this.onStart === 'function') {
      this.onStart(this.vector.x, this.vector.y);
    }
  }
  
  onMouseMove(event) {
    if (!this.active) return;
    
    this.position.x = event.clientX;
    this.position.y = event.clientY;
    
    this.updateJoystickPosition();
    
    if (typeof this.onMove === 'function') {
      this.onMove(this.vector.x, this.vector.y);
    }
  }
  
  onMouseUp() {
    this.resetJoystick();
  }
  
  updateJoystickPosition() {
    let deltaX = this.position.x - this.origin.x;
    let deltaY = this.position.y - this.origin.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Calculate angle and magnitude for 360-degree control
    this.angle = Math.atan2(deltaY, deltaX);
    this.magnitude = Math.min(1, distance / this.maxRadius);
    
    if (distance > this.maxRadius) {
      deltaX = deltaX / distance * this.maxRadius;
      deltaY = deltaY / distance * this.maxRadius;
    }
    
    // Update thumb position
    this.thumbElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // Calculate normalized vector (-1 to 1 for each axis)
    this.vector.x = deltaX / this.maxRadius;
    this.vector.y = deltaY / this.maxRadius;
  }
  
  resetJoystick() {
    this.active = false;
    this.touchId = null;
    
    // Reset thumb position
    this.thumbElement.style.transform = 'translate(0px, 0px)';
    
    // Reset vector and angle/magnitude
    this.vector.x = 0;
    this.vector.y = 0;
    this.angle = 0;
    this.magnitude = 0;
    
    if (typeof this.onEnd === 'function') {
      this.onEnd();
    }
  }
  
  /**
   * Set callback for when joystick starts being used
   * @param {Function} callback - Function(x, y) where x and y are normalized values (-1 to 1)
   */
  setOnStart(callback) {
    this.onStart = callback;
  }
  
  /**
   * Set callback for when joystick is moved
   * @param {Function} callback - Function(x, y) where x and y are normalized values (-1 to 1)
   */
  setOnMove(callback) {
    this.onMove = callback;
  }
  
  /**
   * Set callback for when joystick is released
   * @param {Function} callback - Function with no parameters
   */
  setOnEnd(callback) {
    this.onEnd = callback;
  }
}

// Create a global joystick object for use in the game
document.addEventListener('DOMContentLoaded', () => {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // Only initialize if on mobile
    const joystickArea = document.getElementById('joystick-area');
    const joystickBase = document.getElementById('joystick-base');
    const joystickThumb = document.getElementById('joystick-thumb');
    
    if (joystickBase && joystickThumb && joystickArea) {
      console.log('Initializing joystick');
      
      window.gameJoystick = new Joystick({
        container: joystickArea,
        baseElement: joystickBase,
        thumbElement: joystickThumb,
        maxRadius: 40
      });
      
      // Set up movement callback
      window.gameJoystick.setOnMove((x, y) => {
        console.log('Joystick moved:', x, y);
        // Get controls instance from game
        const controls = window.game?.controls;
        if (controls) {
          // CORRECTED: Make sure joystick directions match expectations
          // Positive X should move right, positive Y should move forward
          controls.movementVector.x = x;  
          controls.movementVector.z = -y; // Invert Y axis for forward/backward
          controls.isMoving = true; // Explicitly set moving to true
        }
      });
      
      window.gameJoystick.setOnEnd(() => {
        console.log('Joystick released');
        // Reset movement when joystick is released
        const controls = window.game?.controls;
        if (controls) {
          controls.movementVector.x = 0;
          controls.movementVector.z = 0;
          controls.isMoving = false;
        }
      });
    } else {
      console.error('Joystick elements not found in the DOM:');
      console.error('joystickArea:', joystickArea);
      console.error('joystickBase:', joystickBase);
      console.error('joystickThumb:', joystickThumb);
    }
  }
});