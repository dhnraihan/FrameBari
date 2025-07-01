// Mobile-specific functionality for Photo Editor Pro
class MobilePhotoEditor {
    constructor() {
        this.isTouch = 'ontouchstart' in window;
        this.currentPhoto = null;
        this.editingMode = 'basic';
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isGestureActive = false;
        this.gestureStartDistance = 0;
        this.gestureStartScale = 1;
        this.currentScale = 1;
        this.maxScale = 3;
        this.minScale = 0.5;
        
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.setupUploadHandlers();
        this.setupTouchGestures();
        this.setupEditorControls();
        this.setupSwipeGestures();
        this.registerServiceWorker();
        this.checkOnlineStatus();
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }
    
    onDOMReady() {
        this.updateViewportHeight();
        this.initializeCurrentPhoto();
        this.setupKeyboardHandling();
    }
    
    // Navigation Management
    setupNavigation() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        overlay.addEventListener('click', () => {
            this.closeSidebar();
        });
        
        // Handle back button
        window.addEventListener('popstate', () => {
            if (sidebar.classList.contains('active')) {
                this.closeSidebar();
            }
        });
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menu-toggle');
        const overlay = document.querySelector('.sidebar-overlay');
        
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent body scroll when sidebar is open
        document.body.classList.toggle('sidebar-open');
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menu-toggle');
        const overlay = document.querySelector('.sidebar-overlay');
        
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
    
    // Upload Functionality
    setupUploadHandlers() {
        const mobileUploadBtn = document.getElementById('mobile-upload');
        const uploadModal = document.getElementById('upload-modal');
        const closeUpload = document.getElementById('close-upload');
        const cameraUpload = document.getElementById('camera-upload');
        const galleryUpload = document.getElementById('gallery-upload');
        const fileInput = document.getElementById('file-input');
        const galleryInput = document.getElementById('gallery-input');
        
        if (mobileUploadBtn) {
            mobileUploadBtn.addEventListener('click', () => {
                this.showUploadModal();
            });
        }
        
        if (closeUpload) {
            closeUpload.addEventListener('click', () => {
                this.hideUploadModal();
            });
        }
        
        if (cameraUpload) {
            cameraUpload.addEventListener('click', () => {
                this.openCamera();
            });
        }
        
        if (galleryUpload) {
            galleryUpload.addEventListener('click', () => {
                this.openGallery();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        if (galleryInput) {
            galleryInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        // Handle drag and drop on mobile
        this.setupDragAndDrop();
    }
    
    showUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }
    
    hideUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }
    
    openCamera() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
        this.hideUploadModal();
    }
    
    openGallery() {
        const galleryInput = document.getElementById('gallery-input');
        if (galleryInput) {
            galleryInput.click();
        }
        this.hideUploadModal();
    }
    
    async handleFileUpload(files) {
        if (files.length === 0) return;
        
        this.showProcessingOverlay('Uploading photos...');
        
        const formData = new FormData();
        Array.from(files).forEach(file => {
            // Compress image before upload on mobile
            this.compressImage(file).then(compressedFile => {
                formData.append('photos', compressedFile);
            });
        });
        
        try {
            const response = await fetch('/editor/upload/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    this.showToast('Photos uploaded successfully!', 'success');
                    this.refreshPhotoGrid();
                }
            } else {
                this.showToast(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Upload failed. Please try again.', 'error');
            
            // Store for offline sync if available
            if ('serviceWorker' in navigator) {
                this.storeOfflineUpload(files);
            }
        } finally {
            this.hideProcessingOverlay();
        }
    }
    
    async compressImage(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, file.type, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    // Touch Gestures for Photo Editing
    setupTouchGestures() {
        const canvas = document.getElementById('editor-canvas');
        if (!canvas || !this.isTouch) return;
        
        let hammer;
        if (typeof Hammer !== 'undefined') {
            hammer = new Hammer(canvas);
            hammer.get('pinch').set({ enable: true });
            hammer.get('pan').set({ threshold: 10 });
            
            hammer.on('pinchstart', (e) => this.onPinchStart(e));
            hammer.on('pinchmove', (e) => this.onPinchMove(e));
            hammer.on('pinchend', (e) => this.onPinchEnd(e));
            hammer.on('pan', (e) => this.onPan(e));
            hammer.on('tap', (e) => this.onTap(e));
            hammer.on('doubletap', (e) => this.onDoubleTap(e));
        } else {
            // Fallback to native touch events
            this.setupNativeTouchGestures(canvas);
        }
    }
    
    setupNativeTouchGestures(canvas) {
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }
    
    onTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            this.isGestureActive = true;
            this.gestureStartDistance = this.getDistance(e.touches[0], e.touches[1]);
            this.gestureStartScale = this.currentScale;
        }
    }
    
    onTouchMove(e) {
        e.preventDefault();
        
        if (this.isGestureActive && e.touches.length === 2) {
            const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = (currentDistance / this.gestureStartDistance) * this.gestureStartScale;
            
            this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
            this.applyTransform();
        }
    }
    
    onTouchEnd(e) {
        if (e.touches.length < 2) {
            this.isGestureActive = false;
        }
        
        // Handle tap if it was a short touch
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = Math.abs(touchEndX - this.touchStartX);
            const deltaY = Math.abs(touchEndY - this.touchStartY);
            
            if (deltaX < 10 && deltaY < 10) {
                this.onTap(e.changedTouches[0]);
            }
        }
    }
    
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    onPinchStart(e) {
        this.gestureStartScale = this.currentScale;
    }
    
    onPinchMove(e) {
        this.currentScale = this.gestureStartScale * e.scale;
        this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, this.currentScale));
        this.applyTransform();
    }
    
    onPinchEnd(e) {
        // Snap to reasonable scale values
        if (this.currentScale < 0.75) {
            this.currentScale = 0.5;
        } else if (this.currentScale > 2.5) {
            this.currentScale = 3;
        } else if (Math.abs(this.currentScale - 1) < 0.1) {
            this.currentScale = 1;
        }
        
        this.applyTransform();
    }
    
    onPan(e) {
        // Handle image panning when zoomed
        if (this.currentScale > 1) {
            // Implement panning logic
        }
    }
    
    onTap(e) {
        // Handle single tap - maybe show/hide controls
        this.toggleControls();
    }
    
    onDoubleTap(e) {
        // Reset zoom on double tap
        this.currentScale = this.currentScale === 1 ? 2 : 1;
        this.applyTransform();
    }
    
    applyTransform() {
        const canvas = document.getElementById('editor-canvas');
        if (canvas) {
            canvas.style.transform = `scale(${this.currentScale})`;
        }
    }
    
    // Editor Controls
    setupEditorControls() {
        const controlTabs = document.querySelectorAll('.control-tab');
        const controlPanels = document.querySelectorAll('.control-panel');
        
        controlTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.dataset.panel;
                this.switchControlPanel(targetPanel);
            });
        });
        
        // Setup sliders with touch-friendly behavior
        const sliders = document.querySelectorAll('.mobile-slider');
        sliders.forEach(slider => {
            this.setupSlider(slider);
        });
        
        // Setup preset buttons
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
            });
        });
    }
    
    switchControlPanel(panelName) {
        // Update tabs
        document.querySelectorAll('.control-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');
        
        // Update panels
        document.querySelectorAll('.control-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(panelName).classList.add('active');
        
        this.editingMode = panelName;
    }
    
    setupSlider(slider) {
        const valueDisplay = slider.parentElement.querySelector('.slider-value');
        
        slider.addEventListener('input', (e) => {
            if (valueDisplay) {
                valueDisplay.textContent = e.target.value;
            }
            
            // Throttle preview updates on mobile
            clearTimeout(this.sliderTimeout);
            this.sliderTimeout = setTimeout(() => {
                this.updatePreview(slider.id, e.target.value);
            }, 150);
        });
        
        // Haptic feedback on iOS
        slider.addEventListener('touchstart', () => {
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        });
    }
    
    async updatePreview(setting, value) {
        if (!this.currentPhoto) return;
        
        const settings = this.getCurrentSettings();
        settings[setting] = parseInt(value);
        
        try {
            const response = await fetch(`/editor/${this.currentPhoto}/preview/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify(settings)
            });
            
            const data = await response.json();
            if (data.success) {
                this.updateImageDisplay(data.preview_url);
            }
        } catch (error) {
            console.error('Preview update failed:', error);
        }
    }
    
    getCurrentSettings() {
        const settings = {};
        document.querySelectorAll('.mobile-slider').forEach(slider => {
            settings[slider.id] = parseInt(slider.value);
        });
        return settings;
    }
    
    updateImageDisplay(imageUrl) {
        const img = document.querySelector('.editor-image');
        if (img) {
            img.src = imageUrl + '?t=' + new Date().getTime();
        }
    }
    
    // Swipe Gestures for Navigation
    setupSwipeGestures() {
        let startX, startY, distX, distY;
        const threshold = 100;
        const restraint = 100;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].pageX;
            startY = e.changedTouches[0].pageY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            distX = e.changedTouches[0].pageX - startX;
            distY = e.changedTouches[0].pageY - startY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
                if (distX > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            }
        }, { passive: true });
    }
    
    onSwipeRight() {
        // Open sidebar if not already open
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('active')) {
            this.toggleSidebar();
        }
    }
    
    onSwipeLeft() {
        // Close sidebar if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('active')) {
            this.closeSidebar();
        }
    }
    
    // PWA Features
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered successfully');
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        this.showUpdateAvailable();
                    });
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }
    
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>A new version is available!</span>
                <button class="update-btn" onclick="window.location.reload()">Update</button>
                <button class="dismiss-btn" onclick="this.parentElement.parentElement.remove()">Later</button>
            </div>
        `;
        document.body.appendChild(updateBanner);
    }
    
    checkOnlineStatus() {
        const updateOnlineStatus = () => {
            const statusIndicator = document.querySelector('.network-status');
            if (statusIndicator) {
                statusIndicator.textContent = navigator.onLine ? 'Online' : 'Offline';
                statusIndicator.className = `network-status ${navigator.onLine ? 'online' : 'offline'}`;
            }
            
            if (!navigator.onLine) {
                this.showToast('You are offline. Some features may be limited.', 'warning');
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }
    
    // Utility Functions
    updateViewportHeight() {
        // Fix viewport height issues on mobile browsers
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        window.addEventListener('resize', () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
    }
    
    initializeCurrentPhoto() {
        const photoElement = document.querySelector('[data-photo-id]');
        if (photoElement) {
            this.currentPhoto = photoElement.dataset.photoId;
        }
    }
    
    setupKeyboardHandling() {
        // Handle virtual keyboard on mobile
        if (this.isTouch) {
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        }
    }
    
    toggleControls() {
        const controls = document.querySelector('.editor-controls');
        if (controls) {
            controls.classList.toggle('hidden');
        }
    }
    
    showProcessingOverlay(message = 'Processing...') {
        let overlay = document.querySelector('.mobile-processing-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-processing-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.innerHTML = `
            <div class="processing-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        overlay.style.display = 'flex';
    }
    
    hideProcessingOverlay() {
        const overlay = document.querySelector('.mobile-processing-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `mobile-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }
    
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || '';
    }
    
    refreshPhotoGrid() {
        // Reload current page to show new photos
        window.location.reload();
    }
    
    storeOfflineUpload(files) {
        // Store upload for when connection is restored
        const uploads = JSON.parse(localStorage.getItem('offlineUploads') || '[]');
        const uploadData = {
            id: Date.now(),
            files: Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type
            })),
            timestamp: new Date().toISOString()
        };
        
        uploads.push(uploadData);
        localStorage.setItem('offlineUploads', JSON.stringify(uploads));
        
        this.showToast('Upload queued for when you\'re back online', 'info');
    }
    
    applyPreset(presetName) {
        // Apply predefined editing presets
        const presets = {
            vintage: { brightness: 10, contrast: 15, saturation: -20, sepia: 30 },
            vibrant: { brightness: 5, contrast: 20, saturation: 30, vibrance: 25 },
            dramatic: { brightness: -5, contrast: 40, saturation: 10, shadows: -30 },
            soft: { brightness: 15, contrast: -10, saturation: 5, blur: 2 }
        };
        
        const preset = presets[presetName];
        if (preset) {
            Object.keys(preset).forEach(setting => {
                const slider = document.getElementById(setting);
                if (slider) {
                    slider.value = preset[setting];
                    const event = new Event('input');
                    slider.dispatchEvent(event);
                }
            });
        }
    }
}

// Initialize mobile editor when DOM is ready
const mobileEditor = new MobilePhotoEditor();

// Export for global access
window.MobilePhotoEditor = MobilePhotoEditor;
window.mobileEditor = mobileEditor;
