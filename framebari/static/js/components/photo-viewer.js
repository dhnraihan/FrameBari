// static/js/components/photo-viewer.js
class PhotoViewer {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            allowZoom: true,
            allowPan: true,
            allowRotation: false,
            showControls: true,
            showThumbnails: false,
            enableKeyboard: true,
            enableTouch: true,
            maxZoom: 5,
            minZoom: 0.1,
            zoomStep: 0.2,
            transitionDuration: 300,
            backgroundColor: '#000',
            ...options
        };
        
        this.currentImage = null;
        this.images = [];
        this.currentIndex = 0;
        this.scale = 1;
        this.rotation = 0;
        this.panX = 0;
        this.panY = 0;
        
        this.isZoomed = false;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupTouchGestures();
    }
    
    createElements() {
        this.container.classList.add('photo-viewer');
        this.container.innerHTML = `
            <div class="photo-viewer-backdrop"></div>
            <div class="photo-viewer-content">
                <div class="photo-viewer-image-container">
                    <img class="photo-viewer-image" alt="">
                    <div class="photo-viewer-loading">
                        <div class="spinner"></div>
                    </div>
                </div>
                
                ${this.options.showControls ? this.createControls() : ''}
                ${this.options.showThumbnails ? this.createThumbnails() : ''}
            </div>
        `;
        
        this.backdrop = this.container.querySelector('.photo-viewer-backdrop');
        this.content = this.container.querySelector('.photo-viewer-content');
        this.imageContainer = this.container.querySelector('.photo-viewer-image-container');
        this.image = this.container.querySelector('.photo-viewer-image');
        this.loading = this.container.querySelector('.photo-viewer-loading');
        
        if (this.options.showControls) {
            this.controls = this.container.querySelector('.photo-viewer-controls');
        }
        
        if (this.options.showThumbnails) {
            this.thumbnails = this.container.querySelector('.photo-viewer-thumbnails');
        }
    }
    
    createControls() {
        return `
            <div class="photo-viewer-controls">
                <div class="controls-left">
                    <button class="control-btn prev-btn" title="Previous">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="control-btn next-btn" title="Next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="controls-center">
                    <span class="image-counter">1 / 1</span>
                </div>
                
                <div class="controls-right">
                    <button class="control-btn zoom-out-btn" title="Zoom Out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button class="control-btn zoom-in-btn" title="Zoom In">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="control-btn fit-btn" title="Fit to Screen">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    ${this.options.allowRotation ? `
                        <button class="control-btn rotate-btn" title="Rotate">
                            <i class="fas fa-redo"></i>
                        </button>
                    ` : ''}
                    <button class="control-btn fullscreen-btn" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="control-btn close-btn" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    createThumbnails() {
        return `
            <div class="photo-viewer-thumbnails">
                <div class="thumbnails-container"></div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Control buttons
        if (this.options.showControls) {
            this.setupControlButtons();
        }
        
        // Image events
        this.image.addEventListener('load', () => {
            this.hideLoading();
            this.fitToContainer();
        });
        
        this.image.addEventListener('error', () => {
            this.hideLoading();
            this.showError('Failed to load image');
        });
        
        // Mouse events
        if (this.options.allowZoom) {
            this.imageContainer.addEventListener('wheel', this.handleWheel.bind(this));
        }
        
        if (this.options.allowPan) {
            this.imageContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.imageContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.imageContainer.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.imageContainer.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        }
        
        // Double-click to zoom
        this.imageContainer.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Backdrop click to close
        this.backdrop.addEventListener('click', () => {
            this.close();
        });
    }
    
    setupControlButtons() {
        const buttons = {
            '.prev-btn': () => this.previous(),
            '.next-btn': () => this.next(),
            '.zoom-in-btn': () => this.zoomIn(),
            '.zoom-out-btn': () => this.zoomOut(),
            '.fit-btn': () => this.fitToContainer(),
            '.rotate-btn': () => this.rotate(),
            '.fullscreen-btn': () => this.toggleFullscreen(),
            '.close-btn': () => this.close()
        };
        
        Object.entries(buttons).forEach(([selector, handler]) => {
            const button = this.controls.querySelector(selector);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }
    
    setupKeyboardShortcuts() {
        if (!this.options.enableKeyboard) return;
        
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;
            
            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowLeft':
                    this.previous();
                    break;
                case 'ArrowRight':
                    this.next();
                    break;
                case '+':
                case '=':
                    this.zoomIn();
                    break;
                case '-':
                    this.zoomOut();
                    break;
                case '0':
                    this.fitToContainer();
                    break;
                case 'r':
                    if (this.options.allowRotation) {
                        this.rotate();
                    }
                    break;
                case 'f':
                    this.toggleFullscreen();
                    break;
            }
        });
    }
    
    setupTouchGestures() {
        if (!this.options.enableTouch) return;
        
        let hammer = null;
        
        // Check if Hammer.js is available
        if (typeof Hammer !== 'undefined') {
            hammer = new Hammer(this.imageContainer);
            
            // Enable pinch and pan
            hammer.get('pinch').set({ enable: true });
            hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
            
            // Pinch to zoom
            hammer.on('pinch', (e) => {
                this.handlePinch(e);
            });
            
            // Pan to move
            hammer.on('pan', (e) => {
                this.handleTouchPan(e);
            });
            
            // Double tap to zoom
            hammer.on('doubletap', (e) => {
                this.handleDoubleClick(e);
            });
        } else {
            // Fallback touch events
            this.setupFallbackTouch();
        }
    }
    
    setupFallbackTouch() {
        let lastTouchDistance = 0;
        let initialScale = 1;
        
        this.imageContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastTouchDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                initialScale = this.scale;
            }
        });
        
        this.imageContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 2) {
                const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                const scaleChange = currentDistance / lastTouchDistance;
                this.setScale(initialScale * scaleChange);
            }
        });
    }
    
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Public API methods
    show(images = [], index = 0) {
        this.images = Array.isArray(images) ? images : [images];
        this.currentIndex = Math.max(0, Math.min(index, this.images.length - 1));
        
        this.container.style.display = 'flex';
        this.loadImage(this.currentIndex);
        this.updateControls();
        this.updateThumbnails();
        
        // Add to body if not already there
        if (!document.body.contains(this.container)) {
            document.body.appendChild(this.container);
        }
        
        // Trigger show animation
        requestAnimationFrame(() => {
            this.container.classList.add('visible');
        });
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('photo_viewer_open');
        }
    }
    
    close() {
        this.container.classList.remove('visible');
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.reset();
        }, this.options.transitionDuration);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('photo_viewer_close');
        }
    }
    
    previous() {
        if (this.currentIndex > 0) {
            this.goToIndex(this.currentIndex - 1);
        }
    }
    
    next() {
        if (this.currentIndex < this.images.length - 1) {
            this.goToIndex(this.currentIndex + 1);
        }
    }
    
    goToIndex(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentIndex = index;
            this.loadImage(index);
            this.updateControls();
            this.updateThumbnails();
            this.reset();
        }
    }
    
    zoomIn() {
        const newScale = Math.min(this.scale + this.options.zoomStep, this.options.maxZoom);
        this.setScale(newScale);
    }
    
    zoomOut() {
        const newScale = Math.max(this.scale - this.options.zoomStep, this.options.minZoom);
        this.setScale(newScale);
    }
    
    setScale(scale) {
        this.scale = Math.max(this.options.minZoom, Math.min(scale, this.options.maxZoom));
        this.isZoomed = this.scale > 1;
        this.updateTransform();
        this.updateCursor();
    }
    
    rotate() {
        if (!this.options.allowRotation) return;
        
        this.rotation += 90;
        if (this.rotation >= 360) {
            this.rotation = 0;
        }
        
        this.updateTransform();
    }
    
    fitToContainer() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isZoomed = false;
        this.updateTransform();
        this.updateCursor();
    }
    
    reset() {
        this.scale = 1;
        this.rotation = 0;
        this.panX = 0;
        this.panY = 0;
        this.isZoomed = false;
        this.updateTransform();
        this.updateCursor();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen?.() ||
            this.container.webkitRequestFullscreen?.() ||
            this.container.msRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() ||
            document.webkitExitFullscreen?.() ||
            document.msExitFullscreen?.();
        }
    }
    
    // Private methods
    loadImage(index) {
        if (index < 0 || index >= this.images.length) return;
        
        this.showLoading();
        
        const imageData = this.images[index];
        const src = typeof imageData === 'string' ? imageData : imageData.url || imageData.src;
        
        this.image.src = src;
        this.currentImage = imageData;
    }
    
    updateTransform() {
        const transform = `
            translate(${this.panX}px, ${this.panY}px) 
            scale(${this.scale}) 
            rotate(${this.rotation}deg)
        `;
        
        this.image.style.transform = transform;
    }
    
    updateControls() {
        if (!this.options.showControls) return;
        
        const counter = this.controls.querySelector('.image-counter');
        if (counter) {
            counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
        }
        
        const prevBtn = this.controls.querySelector('.prev-btn');
        const nextBtn = this.controls.querySelector('.next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentIndex === this.images.length - 1;
        }
    }
    
    updateThumbnails() {
        if (!this.options.showThumbnails || !this.thumbnails) return;
        
        const container = this.thumbnails.querySelector('.thumbnails-container');
        container.innerHTML = '';
        
        this.images.forEach((imageData, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = `thumbnail ${index === this.currentIndex ? 'active' : ''}`;
            
            const src = typeof imageData === 'string' ? imageData : 
                       imageData.thumbnail || imageData.url || imageData.src;
            
            thumbnail.innerHTML = `<img src="${src}" alt="">`;
            thumbnail.addEventListener('click', () => this.goToIndex(index));
            
            container.appendChild(thumbnail);
        });
    }
    
    updateCursor() {
        if (this.isZoomed) {
            this.imageContainer.style.cursor = 'grab';
        } else {
            this.imageContainer.style.cursor = 'zoom-in';
        }
    }
    
    showLoading() {
        this.loading.style.display = 'flex';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    showError(message) {
        this.loading.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
        this.loading.style.display = 'flex';
    }
    
    isVisible() {
        return this.container.classList.contains('visible');
    }
    
    // Event handlers
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -this.options.zoomStep : this.options.zoomStep;
        const newScale = Math.max(this.options.minZoom, 
                         Math.min(this.scale + delta, this.options.maxZoom));
        
        this.setScale(newScale);
    }
    
    handleMouseDown(e) {
        if (!this.isZoomed) return;
        
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.imageContainer.style.cursor = 'grabbing';
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.lastPanX;
        const deltaY = e.clientY - this.lastPanY;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        
        this.updateTransform();
    }
    
    handleMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
        }
    }
    
    handleDoubleClick(e) {
        if (this.isZoomed) {
            this.fitToContainer();
        } else {
            this.setScale(2);
        }
    }
    
    handlePinch(e) {
        this.setScale(this.scale * e.scale);
    }
    
    handleTouchPan(e) {
        if (this.isZoomed) {
            this.panX += e.deltaX;
            this.panY += e.deltaY;
            this.updateTransform();
        }
    }
    
    destroy() {
        // Remove event listeners and clean up
        this.container.remove();
    }
}

// Auto-initialize photo viewers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-photo-viewer]').forEach(element => {
        new PhotoViewer(element);
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhotoViewer;
}
