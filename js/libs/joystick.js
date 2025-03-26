class Joystick {
    constructor(baseElement, thumbElement) {
        this.base = baseElement;
        this.thumb = thumbElement;
        this.dragging = false;
        this.position = { x: 0, y: 0 };
        this.baseRect = this.base.getBoundingClientRect();
        this.center = {
            x: this.baseRect.width / 2,
            y: this.baseRect.height / 2
        };
        this.radius = this.baseRect.width / 2;
        
        // Initial position
        this.thumb.style.left = `${this.center.x - this.thumb.offsetWidth / 2}px`;
        this.thumb.style.top = `${this.center.y - this.thumb.offsetHeight / 2}px`;
        
        // Events
        this.bindEvents();
    }
    
    bindEvents() {
        this.base.addEventListener('mousedown', this.onStart.bind(this));
        this.base.addEventListener('touchstart', this.onStart.bind(this));
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
        document.addEventListener('mouseup', this.onEnd.bind(this));
        document.addEventListener('touchend', this.onEnd.bind(this));
    }
    
    onStart(event) {
        this.dragging = true;
        this.onMove(event);
    }
    
    onMove(event) {
        if (!this.dragging) return;
        
        event.preventDefault();
        
        let clientX, clientY;
        
        if (event.touches) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const rect = this.base.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        
        // Calculate distance from center
        const deltaX = offsetX - this.center.x;
        const deltaY = offsetY - this.center.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Normalize for position data
        if (distance > 0) {
            this.position.x = deltaX / this.radius;
            this.position.y = deltaY / this.radius;
            
            // Clamp position to circle
            if (distance > this.radius) {
                const angle = Math.atan2(deltaY, deltaX);
                const limitedX = Math.cos(angle) * this.radius;
                const limitedY = Math.sin(angle) * this.radius;
                
                this.thumb.style.left = `${this.center.x + limitedX - this.thumb.offsetWidth / 2}px`;
                this.thumb.style.top = `${this.center.y + limitedY - this.thumb.offsetHeight / 2}px`;
                
                this.position.x = limitedX / this.radius;
                this.position.y = limitedY / this.radius;
            } else {
                this.thumb.style.left = `${offsetX - this.thumb.offsetWidth / 2}px`;
                this.thumb.style.top = `${offsetY - this.thumb.offsetHeight / 2}px`;
            }
        }
    }
    
    onEnd() {
        if (!this.dragging) return;
        
        this.dragging = false;
        this.position = { x: 0, y: 0 };
        
        // Reset thumb position
        this.thumb.style.left = `${this.center.x - this.thumb.offsetWidth / 2}px`;
        this.thumb.style.top = `${this.center.y - this.thumb.offsetHeight / 2}px`;
    }
    
    getPosition() {
        return this.position;
    }
}
