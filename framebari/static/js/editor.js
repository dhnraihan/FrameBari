// static/js/editor.js
class PhotoEditor {
    constructor(photoId) {
        this.photoId = photoId;
        this.canvas = null;
        this.ctx = null;
        this.originalImage = null;
        this.currentImage = null;
        this.settings = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            vibrance: 0,
            exposure: 0,
            backgroundStyle: 'solid',
            backgroundColor: '#0066FF'
        };
        this.subjects = [];
        this.selectedSubject = null;
        this.isProcessing = false;
        this.websocket = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.bindEvents();
        this.loadImage();
        this.connectWebSocket();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('main-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
    }
    
    bindEvents() {
        // Slider events
        document.querySelectorAll('.range-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateSetting(e.target.id, parseInt(e.target.value));
                this.updateSliderValue(e.target);
                this.debouncePreview();
            });
        });
        
        // Background style selection
        document.querySelectorAll('.bg-style-preview').forEach(preview => {
            preview.addEventListener('click', (e) => {
                this.selectBackgroundStyle(e.target.dataset.style);
            });
        });
        
        // Action buttons
        this.bindButton('detect-subjects', () => this.detectSubjects());
        this.bindButton('remove-background', () => this.removeBackground());
        this.bindButton('apply-effects', () => this.applyEffects());
        this.bindButton('export-photo', () => this.exportPhoto());
        this.bindButton('reset-all', () => this.resetSettings());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'z': this.undo(); e.preventDefault(); break;
                    case 'y': this.redo(); e.preventDefault(); break;
                    case 's': this.saveProject(); e.preventDefault(); break;
                    case 'e': this.exportPhoto(); e.preventDefault(); break;
                }
            }
        });
    }
    
    bindButton(id, callback) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', callback);
        }
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettingsToLocal();
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
        
        this.showProcessing(true);
        
        try {
            const response = await fetch(`/editor/${this.photoId}/preview/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify(this.settings)
            });
            
            const data = await response.json();
            if (data.success) {
                this.loadPreviewImage(data.preview_url);
            }
        } catch (error) {
            console.error('Preview generation failed:', error);
            this.showError('Preview generation failed');
        } finally {
            this.showProcessing(false);
        }
    }
    
    loadImage() {
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.currentImage = img;
            this.drawImage();
            this.loadSettingsFromLocal();
        };
        img.onerror = () => {
            this.showError('Failed to load image');
        };
        img.src = document.querySelector('[data-original-url]').dataset.originalUrl;
    }
    
    loadPreviewImage(url) {
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawImage();
        };
        img.src = url + '?t=' + new Date().getTime();
    }
    
    drawImage() {
        if (!this.canvas || !this.currentImage) return;
        
        const containerWidth = this.canvas.parentElement.clientWidth;
        const containerHeight = this.canvas.parentElement.clientHeight;
        
        const imageAspect = this.currentImage.width / this.currentImage.height;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth, displayHeight;
        
        if (imageAspect > containerAspect) {
            displayWidth = containerWidth * 0.9;
            displayHeight = displayWidth / imageAspect;
        } else {
            displayHeight = containerHeight * 0.9;
            displayWidth = displayHeight * imageAspect;
        }
        
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        
        this.ctx.clearRect(0, 0, displayWidth, displayHeight);
        this.ctx.drawImage(this.currentImage, 0, 0, displayWidth, displayHeight);
        
        // Draw subjects if any
        this.drawSubjects();
    }
    
    async detectSubjects() {
        this.showProcessing(true);
        
        try {
            const response = await fetch(`/editor/${this.photoId}/detect-subjects/`);
            const data = await response.json();
            
            if (data.subjects) {
                this.subjects = data.subjects;
                this.drawSubjects();
                this.showSubjectControls();
            }
        } catch (error) {
            console.error('Subject detection failed:', error);
            this.showError('Subject detection failed');
        } finally {
            this.showProcessing(false);
        }
    }
    
    drawSubjects() {
        // Clear existing overlays
        document.querySelectorAll('.subject-overlay').forEach(el => el.remove());
        
        if (!this.subjects.length) return;
        
        const container = this.canvas.parentElement;
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const scaleX = this.canvas.width / this.originalImage.width;
        const scaleY = this.canvas.height / this.originalImage.height;
        
        this.subjects.forEach((subject, index) => {
            const overlay = document.createElement('div');
            overlay.className = 'subject-overlay';
            overlay.dataset.subjectIndex = index;
            
            const x = subject.bbox.x * scaleX + (canvasRect.left - containerRect.left);
            const y = subject.bbox.y * scaleY + (canvasRect.top - containerRect.top);
            const width = subject.bbox.width * scaleX;
            const height = subject.bbox.height * scaleY;
            
            overlay.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
            `;
            
            const label = document.createElement('div');
            label.className = 'subject-label';
            label.textContent = `${subject.type} (${Math.round(subject.confidence * 100)}%)`;
            overlay.appendChild(label);
            
            overlay.addEventListener('click', () => {
                this.selectSubject(index);
            });
            
            container.appendChild(overlay);
        });
    }
    
    selectSubject(index) {
        // Remove previous selection
        document.querySelectorAll('.subject-overlay').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select new subject
        const overlay = document.querySelector(`[data-subject-index="${index}"]`);
        if (overlay) {
            overlay.classList.add('selected');
            this.selectedSubject = index;
            this.showSubjectSpecificControls();
        }
    }
    
    showSubjectSpecificControls() {
        const subject = this.subjects[this.selectedSubject];
        if (!subject) return;
        
        // Create or update subject controls
        let controlsPanel = document.getElementById('subject-controls');
        if (!controlsPanel) {
            controlsPanel = document.createElement('div');
            controlsPanel.id = 'subject-controls';
            controlsPanel.className = 'tool-group';
            document.querySelector('.editor-sidebar').appendChild(controlsPanel);
        }
        
        controlsPanel.innerHTML = `
            <h6>Subject Controls</h6>
            <p><strong>Type:</strong> ${subject.type}</p>
            <p><strong>Confidence:</strong> ${Math.round(subject.confidence * 100)}%</p>
            
            <div class="slider-container">
                <label>Subject Brightness</label>
                <input type="range" class="range-slider" id="subject-brightness" 
                       min="-100" max="100" value="0">
                <span class="slider-value">0</span>
            </div>
            
            <div class="slider-container">
                <label>Subject Saturation</label>
                <input type="range" class="range-slider" id="subject-saturation" 
                       min="-100" max="100" value="0">
                <span class="slider-value">0</span>
            </div>
            
            <select id="subject-lut" class="form-select mb-3">
                <option value="">No Effect</option>
                <option value="warm">Warm Tone</option>
                <option value="cool">Cool Tone</option>
                <option value="vintage">Vintage</option>
                <option value="dramatic">Dramatic</option>
            </select>
            
            <button class="btn btn-sm btn-primary" onclick="editor.applySubjectEffects()">
                Apply to Subject
            </button>
        `;
        
        // Bind new events
        controlsPanel.querySelectorAll('.range-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateSliderValue(e.target);
            });
        });
    }
    
    selectBackgroundStyle(style) {
        document.querySelectorAll('.bg-style-preview').forEach(el => {
            el.classList.remove('active');
        });
        
        document.querySelector(`[data-style="${style}"]`).classList.add('active');
        this.updateSetting('backgroundStyle', style);
        this.debouncePreview();
    }
    
    async removeBackground() {
        this.showProcessing(true);
        
        try {
            const response = await fetch(`/editor/${this.photoId}/remove-background/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
            
            const data = await response.json();
            if (data.success) {
                this.loadPreviewImage(data.preview_url);
            }
        } catch (error) {
            console.error('Background removal failed:', error);
            this.showError('Background removal failed');
        } finally {
            this.showProcessing(false);
        }
    }
    
    async applyEffects() {
        this.showProcessing(true);
        
        try {
            const response = await fetch(`/editor/${this.photoId}/apply/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify(this.settings)
            });
            
            const data = await response.json();
            if (data.success) {
                this.loadPreviewImage(data.processed_url);
                this.showSuccess('Effects applied successfully!');
            }
        } catch (error) {
            console.error('Apply effects failed:', error);
            this.showError('Failed to apply effects');
        } finally {
            this.showProcessing(false);
        }
    }
    
    async exportPhoto() {
        this.showProcessing(true);
        
        try {
            const exportSettings = {
                ...this.settings,
                format: document.getElementById('export-format')?.value || 'JPEG',
                quality: document.getElementById('export-quality')?.value || 85
            };
            
            const response = await fetch(`/editor/${this.photoId}/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify(exportSettings)
            });
            
            const data = await response.json();
            if (data.success) {
                // Trigger download
                const link = document.createElement('a');
                link.href = data.download_url;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showSuccess('Photo exported successfully!');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Export failed');
        } finally {
            this.showProcessing(false);
        }
    }
    
    resetSettings() {
        this.settings = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            vibrance: 0,
            exposure: 0,
            backgroundStyle: 'solid',
            backgroundColor: '#0066FF'
        };
        
        // Update UI
        document.querySelectorAll('.range-slider').forEach(slider => {
            slider.value = 0;
            this.updateSliderValue(slider);
        });
        
        // Reload original image
        this.currentImage = this.originalImage;
        this.drawImage();
        
        this.saveSettingsToLocal();
    }
    
    connectWebSocket() {
        const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsScheme}//${window.location.host}/ws/editor/${this.photoId}/`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 3000);
        };
    }
    
    handleWebSocketMessage(data) {
        if (data.type === 'processing_update') {
            this.updateProcessingProgress(data.progress, data.status);
        }
    }
    
    updateProcessingProgress(progress, status) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;
        }
        
        const statusText = document.querySelector('.processing-status');
        if (statusText) {
            statusText.textContent = status;
        }
    }
    
    showProcessing(show) {
        this.isProcessing = show;
        const overlay = document.querySelector('.processing-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
        
        // Disable/enable controls
        document.querySelectorAll('.range-slider, button, select').forEach(el => {
            el.disabled = show;
        });
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    saveSettingsToLocal() {
        localStorage.setItem(`editor-settings-${this.photoId}`, JSON.stringify(this.settings));
    }
    
    loadSettingsFromLocal() {
        const saved = localStorage.getItem(`editor-settings-${this.photoId}`);
        if (saved) {
            this.settings = {...this.settings, ...JSON.parse(saved)};
            this.applySavedSettings();
        }
    }
    
    applySavedSettings() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = this.settings[key];
                this.updateSliderValue(element);
            }
        });
    }
    
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || '';
    }
}

// Toast CSS (add to main.css)
const toastCSS = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.toast.show {
    transform: translateX(0);
}

.toast.toast-success {
    border-left: 4px solid #28a745;
}

.toast.toast-error {
    border-left: 4px solid #dc3545;
}

.toast.toast-info {
    border-left: 4px solid #007bff;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.toast-content i {
    font-size: 1.25rem;
}

.toast-success .toast-content i {
    color: #28a745;
}

.toast-error .toast-content i {
    color: #dc3545;
}

.toast-info .toast-content i {
    color: #007bff;
}
`;

// Inject toast CSS
const style = document.createElement('style');
style.textContent = toastCSS;
document.head.appendChild(style);

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const photoId = document.querySelector('[data-photo-id]')?.dataset.photoId;
    if (photoId) {
        window.editor = new PhotoEditor(photoId);
    }
});
