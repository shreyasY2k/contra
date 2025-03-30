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
    
    this.init();
  }
  
  init() {
    // Touch events
    this.baseElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    // Mouse events (for testing)
    this.baseElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  onTouchStart(event) {
    event.preventDefault();
    this.active = true;
    
    const touch = event.touches[0];
    const rect = this.baseElement.getBoundingClientRect();
    
    this.origin.x = rect.left + rect.width / 2;
    this.origin.y = rect.top + rect.height / 2;
    
    this.position.x = touch.clientX;
    this.position.y = touch.clientY;
    
    this.updateJoystickPosition();
    
    if (typeof this.onStart === 'function') {
      this.onStart(this.vector.x, this.vector.y, this.angle, this.magnitude);
    }
  }
  
  onTouchMove(event) {
    if (!this.active) return;
    
    // Find the relevant touch
    const touch = Array.from(event.touches).find(t => {
      const rect = this.baseElement.getBoundingClientRect();
      return (
        t.clientX >= rect.left - this.maxRadius &&
        t.clientX <= rect.right + this.maxRadius &&
        t.clientY >= rect.top - this.maxRadius &&
        t.clientY <= rect.bottom + this.maxRadius
      );
    });
    
    if (touch) {
      this.position.x = touch.clientX;
      this.position.y = touch.clientY;
      this.updateJoystickPosition();
      
      if (typeof this.onMove === 'function') {
        this.onMove(this.vector.x, this.vector.y);
      }
    }
  }
  
  onTouchEnd(event) {
    // Check if all touches related to joystick are gone
    const rect = this.baseElement.getBoundingClientRect();
    let joystickTouchActive = false;
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      if (
        touch.clientX >= rect.left - this.maxRadius &&
        touch.clientX <= rect.right + this.maxRadius &&
        touch.clientY >= rect.top - this.maxRadius &&
        touch.clientY <= rect.bottom + this.maxRadius
      ) {
        joystickTouchActive = true;
        break;
      }
    }
    
    if (!joystickTouchActive) {
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
    
    if (joystickBase && joystickThumb) {
      window.gameJoystick = new Joystick({
        container: joystickArea,
        baseElement: joystickBase,
        thumbElement: joystickThumb,
        maxRadius: 40
      });
      
      // Set up movement callback
      window.gameJoystick.setOnMove((x, y) => {
        // Get controls instance from game
        const controls = window.game?.controls;
        if (controls) {
          // Update movement vector - convert touch joystick to game movement
          controls.movementVector.x = x;
          controls.movementVector.z = -y; // Invert Y axis for forward/backward
        }
      });
      
      window.gameJoystick.setOnEnd(() => {
        // Reset movement when joystick is released
        const controls = window.game?.controls;
        if (controls) {
          controls.movementVector.x = 0;
          controls.movementVector.z = 0;
        }
      });
    }
  }
});
