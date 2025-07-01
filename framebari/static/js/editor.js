// static/js/editor.js
class PhotoEditor {
    constructor(photoId, canvasId = 'main-canvas') {
        this.photoId = photoId;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.originalImage = null;
        this.currentImage = null;
        this.imageHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 20;
        this.isProcessing = false;
        
        // Editor state
        this.settings = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            vibrance: 0,
            exposure: 0,
            highlights: 0,
            shadows: 0,
            temperature: 0,
            tint: 0,
            clarity: 0,
            structure: 0,
            backgroundStyle: 'solid',
            backgroundColor: '#0066FF'
        };
        
        // Tools and modes
        this.currentTool = 'adjust';
        this.selectedSubject = null;
        this.subjects = [];
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Event handlers
        this.onImageLoad = null;
        this.onSettingsChange = null;
        this.onProcessingStart = null;
        this.onProcessingComplete = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadImage();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.initializeCanvas();
            
            // Initialize components
            this.progressTracker = new ProgressTracker();
            this.notificationManager = new NotificationManager();
            
            console.log('Photo Editor initialized successfully');
        } catch (error) {
            console.error('Failed to initialize editor:', error);
            this.notificationManager?.showError('Failed to initialize editor');
        }
    }
    
    async loadImage() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.addToHistory(img);
                this.fitImageToCanvas();
                
                if (this.onImageLoad) {
                    this.onImageLoad(img);
                }
                
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Get image URL from data attribute or API
            const imageUrl = document.querySelector(`[data-photo-id="${this.photoId}"]`)?.dataset.imageUrl;
            if (imageUrl) {
                img.src = imageUrl;
            } else {
                reject(new Error('Image URL not found'));
            }
        });
    }
    
    setupEventListeners() {
        // Canvas events
        if (this.canvas) {
            this.canvas.addEventListener('wheel', this.handleZoom.bind(this));
            this.canvas.addEventListener('mousedown', this.handlePanStart.bind(this));
            this.canvas.addEventListener('mousemove', this.handlePanMove.bind(this));
            this.canvas.addEventListener('mouseup', this.handlePanEnd.bind(this));
            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
            this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
            this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
        
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.dataset.tool);
            });
        });
        
        // Settings sliders
        document.querySelectorAll('.adjustment-slider').forEach(slider => {
            slider.addEventListener('input', this.handleSliderChange.bind(this));
            slider.addEventListener('change', this.handleSliderComplete.bind(this));
        });
        
        // Action buttons
        this.bindButton('apply-adjustments', () => this.applyAdjustments());
        this.bindButton('reset-all', () => this.resetAllSettings());
        this.bindButton('undo', () => this.undo());
        this.bindButton('redo', () => this.redo());
        this.bindButton('detect-subjects', () => this.detectSubjects());
        this.bindButton('remove-background', () => this.removeBackground());
        this.bindButton('export-photo', () => this.exportPhoto());
        this.bindButton('save-project', () => this.saveProject());
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'z':
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        e.preventDefault();
                        break;
                    case 's':
                        this.saveProject();
                        e.preventDefault();
                        break;
                    case 'e':
                        this.exportPhoto();
                        e.preventDefault();
                        break;
                    case '0':
                        this.resetZoom();
                        e.preventDefault();
                        break;
                    case '=':
                    case '+':
                        this.zoomIn();
                        e.preventDefault();
                        break;
                    case '-':
                        this.zoomOut();
                        e.preventDefault();
                        break;
                }
            }
            
            // Tool shortcuts
            switch(e.key.toLowerCase()) {
                case 'v':
                    this.selectTool('move');
                    break;
                case 'c':
                    this.selectTool('crop');
                    break;
                case 'a':
                    this.selectTool('adjust');
                    break;
                case 'f':
                    this.selectTool('filters');
                    break;
                case 'b':
                    this.selectTool('background');
                    break;
                case 'space':
                    this.selectTool('pan');
                    e.preventDefault();
                    break;
            }
        });
    }
    
    initializeCanvas() {
        if (!this.canvas || !this.currentImage) return;
        
        this.fitImageToCanvas();
        this.drawImage();
    }
    
    fitImageToCanvas() {
        if (!this.canvas || !this.currentImage) return;
        
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas size to container
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        // Calculate fit scale
        const imageAspect = this.currentImage.width / this.currentImage.height;
        const canvasAspect = this.canvas.width / this.canvas.height;
        
        if (imageAspect > canvasAspect) {
            this.zoom = this.canvas.width / this.currentImage.width;
        } else {
            this.zoom = this.canvas.height / this.currentImage.height;
        }
        
        // Center image
        this.panX = (this.canvas.width - this.currentImage.width * this.zoom) / 2;
        this.panY = (this.canvas.height - this.currentImage.height * this.zoom) / 2;
    }
    
    drawImage() {
        if (!this.ctx || !this.currentImage) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw image
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.drawImage(this.currentImage, 0, 0);
        this.ctx.restore();
        
        // Draw subjects overlay
        this.drawSubjects();
        
        // Draw UI overlays
        this.drawUIOverlays();
    }
    
    drawSubjects() {
        if (!this.subjects.length) return;
        
        this.ctx.save();
        this.subjects.forEach((subject, index) => {
            const isSelected = index === this.selectedSubject;
            
            // Transform coordinates
            const x = (subject.bbox.x * this.zoom) + this.panX;
            const y = (subject.bbox.y * this.zoom) + this.panY;
            const width = subject.bbox.width * this.zoom;
            const height = subject.bbox.height * this.zoom;
            
            // Draw bounding box
            this.ctx.strokeStyle = isSelected ? '#ff6600' : '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, height);
            
            // Draw selection overlay
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 102, 0, 0.1)';
                this.ctx.fillRect(x, y, width, height);
            }
            
            // Draw label
            this.ctx.fillStyle = isSelected ? '#ff6600' : '#00ff00';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(
                `${subject.type} (${Math.round(subject.confidence * 100)}%)`,
                x + 5,
                y - 5
            );
        });
        this.ctx.restore();
    }
    
    drawUIOverlays() {
        // Draw zoom indicator
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 100, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`${Math.round(this.zoom * 100)}%`, 20, 30);
        this.ctx.restore();
    }
    
    handleSliderChange(e) {
        const setting = e.target.dataset.setting;
        const value = parseInt(e.target.value);
        
        this.settings[setting] = value;
        this.updateSliderValue(e.target);
        
        // Debounced preview
        this.debouncePreview();
        
        if (this.onSettingsChange) {
            this.onSettingsChange(this.settings);
        }
    }
    
    handleSliderComplete(e) {
        // Apply final adjustment
        this.generatePreview();
    }
    
    updateSliderValue(slider) {
        const valueDisplay = slider.parentElement.querySelector('.slider-value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }
    }
    
    debouncePreview() {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.generatePreview();
        }, 300);
    }
    
    async generatePreview() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.progressTracker.show('Generating preview...');
            
            const response = await API.post(`/editor/${this.photoId}/preview/`, {
                settings: this.settings
            });
            
            if (response.success) {
                await this.loadPreviewImage(response.preview_url);
            }
        } catch (error) {
            console.error('Preview generation failed:', error);
            this.notificationManager.showError('Preview generation failed');
        } finally {
            this.isProcessing = false;
            this.progressTracker.hide();
        }
    }
    
    async loadPreviewImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.currentImage = img;
                this.drawImage();
                resolve(img);
            };
            
            img.onerror = reject;
            img.src = url + '?t=' + Date.now();
        });
    }
    
    async applyAdjustments() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.progressTracker.show('Applying adjustments...');
            
            if (this.onProcessingStart) {
                this.onProcessingStart();
            }
            
            const response = await API.post(`/editor/${this.photoId}/apply/`, {
                settings: this.settings
            });
            
            if (response.success) {
                await this.loadPreviewImage(response.processed_url);
                this.addToHistory(this.currentImage);
                this.notificationManager.showSuccess('Adjustments applied successfully!');
                
                if (this.onProcessingComplete) {
                    this.onProcessingComplete(response);
                }
            }
        } catch (error) {
            console.error('Apply adjustments failed:', error);
            this.notificationManager.showError('Failed to apply adjustments');
        } finally {
            this.isProcessing = false;
            this.progressTracker.hide();
        }
    }
    
    async detectSubjects() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.progressTracker.show('Detecting subjects...');
            
            const response = await API.get(`/editor/${this.photoId}/detect-subjects/`);
            
            if (response.subjects) {
                this.subjects = response.subjects;
                this.drawImage();
                this.showSubjectControls();
                this.notificationManager.showSuccess(`Found ${this.subjects.length} subjects`);
            }
        } catch (error) {
            console.error('Subject detection failed:', error);
            this.notificationManager.showError('Subject detection failed');
        } finally {
            this.isProcessing = false;
            this.progressTracker.hide();
        }
    }
    
    async removeBackground() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.progressTracker.show('Removing background...');
            
            const response = await API.post(`/editor/${this.photoId}/remove-background/`);
            
            if (response.success) {
                await this.loadPreviewImage(response.preview_url);
                this.addToHistory(this.currentImage);
                this.notificationManager.showSuccess('Background removed successfully!');
            }
        } catch (error) {
            console.error('Background removal failed:', error);
            this.notificationManager.showError('Background removal failed');
        } finally {
            this.isProcessing = false;
            this.progressTracker.hide();
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
        
        // Show/hide tool panels
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        
        document.getElementById(`${tool}-panel`)?.style.display = 'block';
        
        // Update cursor
        this.updateCursor();
    }
    
    updateCursor() {
        if (!this.canvas) return;
        
        switch(this.currentTool) {
            case 'move':
                this.canvas.style.cursor = 'move';
                break;
            case 'crop':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }
    
    // History management
    addToHistory(image) {
        // Remove any history after current index
        this.imageHistory = this.imageHistory.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.imageHistory.push(this.cloneImage(image));
        this.historyIndex++;
        
        // Limit history size
        if (this.imageHistory.length > this.maxHistorySize) {
            this.imageHistory.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentImage = this.imageHistory[this.historyIndex];
            this.drawImage();
            this.updateHistoryButtons();
            this.notificationManager.showInfo('Undone');
        }
    }
    
    redo() {
        if (this.historyIndex < this.imageHistory.length - 1) {
            this.historyIndex++;
            this.currentImage = this.imageHistory[this.historyIndex];
            this.drawImage();
            this.updateHistoryButtons();
            this.notificationManager.showInfo('Redone');
        }
    }
    
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.imageHistory.length - 1;
        }
    }
    
    cloneImage(image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const clonedImage = new Image();
        clonedImage.src = canvas.toDataURL();
        return clonedImage;
    }
    
    // Zoom and pan
    handleZoom(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * delta));
        
        // Zoom toward mouse position
        this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
        this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
        this.zoom = newZoom;
        
        this.drawImage();
    }
    
    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.drawImage();
    }
    
    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom * 0.8);
        this.drawImage();
    }
    
    resetZoom() {
        this.fitImageToCanvas();
        this.drawImage();
    }
    
    // Pan handling
    handlePanStart(e) {
        if (this.currentTool !== 'pan' && this.currentTool !== 'move') return;
        
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    handlePanMove(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.lastPanX;
        const deltaY = e.clientY - this.lastPanY;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        
        this.drawImage();
    }
    
    handlePanEnd() {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
        }
    }
    
    // Touch handling
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            this.handlePanStart({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        } else if (e.touches.length === 2) {
            this.startPinchZoom(e);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.isPanning) {
            this.handlePanMove({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        } else if (e.touches.length === 2) {
            this.handlePinchZoom(e);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handlePanEnd();
        this.isPinching = false;
    }
    
    startPinchZoom(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.initialPinchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        this.isPinching = true;
    }
    
    handlePinchZoom(e) {
        if (!this.isPinching) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const scale = currentDistance / this.initialPinchDistance;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom * scale));
        this.initialPinchDistance = currentDistance;
        
        this.drawImage();
    }
    
    // Export and save
    async exportPhoto() {
        try {
            this.progressTracker.show('Exporting photo...');
            
            const exportSettings = {
                format: document.getElementById('export-format')?.value || 'JPEG',
                quality: document.getElementById('export-quality')?.value || 85,
                ...this.settings
            };
            
            const response = await API.post(`/editor/${this.photoId}/export/`, exportSettings);
            
            if (response.success) {
                // Trigger download
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.notificationManager.showSuccess('Photo exported successfully!');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.notificationManager.showError('Export failed');
        } finally {
            this.progressTracker.hide();
        }
    }
    
    async saveProject() {
        try {
            const response = await API.post(`/editor/${this.photoId}/save/`, {
                settings: this.settings
            });
            
            if (response.success) {
                this.notificationManager.showSuccess('Project saved!');
            }
        } catch (error) {
            console.error('Save failed:', error);
            this.notificationManager.showError('Save failed');
        }
    }
    
    resetAllSettings() {
        // Reset all settings to default
        Object.keys(this.settings).forEach(key => {
            if (typeof this.settings[key] === 'number') {
                this.settings[key] = 0;
            }
        });
        
        // Update UI
        document.querySelectorAll('.adjustment-slider').forEach(slider => {
            slider.value = 0;
            this.updateSliderValue(slider);
        });
        
        // Reset to original image
        this.currentImage = this.originalImage;
        this.drawImage();
        
        this.notificationManager.showInfo('All settings reset');
    }
    
    showSubjectControls() {
        // Show subject-specific controls
        const controlsPanel = document.getElementById('subject-controls');
        if (controlsPanel) {
            controlsPanel.style.display = 'block';
        }
    }
    
    bindButton(id, callback) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', callback);
        }
    }
    
    destroy() {
        // Cleanup event listeners and resources
        if (this.canvas) {
            this.canvas.removeEventListener('wheel', this.handleZoom);
            this.canvas.removeEventListener('mousedown', this.handlePanStart);
            this.canvas.removeEventListener('mousemove', this.handlePanMove);
            this.canvas.removeEventListener('mouseup', this.handlePanEnd);
        }
        
        clearTimeout(this.previewTimeout);
        this.imageHistory = [];
        this.subjects = [];
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const photoId = document.querySelector('[data-photo-id]')?.dataset.photoId;
    if (photoId) {
        window.photoEditor = new PhotoEditor(photoId);
    }
});
