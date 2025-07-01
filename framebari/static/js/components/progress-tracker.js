// static/js/components/progress-tracker.js
class ProgressTracker {
    constructor(options = {}) {
        this.options = {
            type: 'overlay', // overlay, inline, modal
            showPercentage: true,
            showMessage: true,
            showCancel: false,
            showETA: false,
            showSpeed: false,
            allowBackgroundClick: false,
            theme: 'default', // default, minimal, modern
            size: 'medium', // small, medium, large
            position: 'center', // center, top, bottom (for overlay type)
            ...options
        };
        
        this.isVisible = false;
        this.progress = 0;
        this.message = '';
        this.startTime = null;
        this.lastUpdate = null;
        this.speeds = [];
        this.element = null;
        this.backdrop = null;
        
        // Callbacks
        this.onCancel = options.onCancel || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onUpdate = options.onUpdate || (() => {});
        
        this.init();
    }
    
    init() {
        this.createElement();
        this.setupEventListeners();
    }
    
    createElement() {
        if (this.options.type === 'overlay' || this.options.type === 'modal') {
            this.createOverlay();
        } else {
            this.createInline();
        }
    }
    
    createOverlay() {
        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'progress-backdrop';
        this.backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9998;
            display: none;
            ${this.options.position === 'center' ? 'align-items: center; justify-content: center;' : ''}
            ${this.options.position === 'top' ? 'align-items: flex-start; justify-content: center; padding-top: 50px;' : ''}
            ${this.options.position === 'bottom' ? 'align-items: flex-end; justify-content: center; padding-bottom: 50px;' : ''}
        `;
        
        // Create progress element
        this.element = document.createElement('div');
        this.element.className = `progress-tracker progress-${this.options.theme} progress-${this.options.size}`;
        this.element.innerHTML = this.createProgressHTML();
        
        this.backdrop.appendChild(this.element);
        document.body.appendChild(this.backdrop);
    }
    
    createInline() {
        this.element = document.createElement('div');
        this.element.className = `progress-tracker progress-inline progress-${this.options.theme} progress-${this.options.size}`;
        this.element.innerHTML = this.createProgressHTML();
        this.element.style.display = 'none';
    }
    
    createProgressHTML() {
        return `
            <div class="progress-content">
                ${this.options.showMessage ? `
                    <div class="progress-message">${this.message || 'Loading...'}</div>
                ` : ''}
                
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        ${this.options.showPercentage ? `
                            <div class="progress-percentage">0%</div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="progress-details">
                    ${this.options.showETA ? `
                        <div class="progress-eta">
                            <span class="eta-label">ETA:</span>
                            <span class="eta-value">--:--</span>
                        </div>
                    ` : ''}
                    
                    ${this.options.showSpeed ? `
                        <div class="progress-speed">
                            <span class="speed-value">0</span>
                            <span class="speed-unit">items/sec</span>
                        </div>
                    ` : ''}
                </div>
                
                ${this.options.showCancel ? `
                    <div class="progress-actions">
                        <button class="progress-cancel-btn">Cancel</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    setupEventListeners() {
        // Cancel button
        if (this.options.showCancel) {
            const cancelBtn = this.element.querySelector('.progress-cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.cancel();
                });
            }
        }
        
        // Backdrop click
        if (this.backdrop && this.options.allowBackgroundClick) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.hide();
                }
            });
        }
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible && this.options.showCancel) {
                this.cancel();
            }
        });
        
        // Add CSS if not already present
        this.addStyles();
    }
    
    addStyles() {
        if (document.getElementById('progress-tracker-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'progress-tracker-styles';
        styles.textContent = `
            .progress-backdrop {
                display: flex;
            }
            
            .progress-tracker {
                background: white;
                border-radius: 12px;
                padding: 24px;
                min-width: 300px;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                position: relative;
            }
            
            .progress-tracker.progress-small {
                padding: 16px;
                min-width: 250px;
            }
            
            .progress-tracker.progress-large {
                padding: 32px;
                min-width: 400px;
            }
            
            .progress-inline {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            }
            
            .progress-message {
                text-align: center;
                margin-bottom: 16px;
                font-weight: 500;
                color: #495057;
            }
            
            .progress-bar-container {
                margin-bottom: 12px;
                position: relative;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
                border-radius: 4px;
                width: 0%;
                transition: width 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(255, 255, 255, 0.4) 50%,
                    transparent 100%
                );
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-percentage {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                font-weight: 600;
                color: #495057;
                text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
            }
            
            .progress-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 12px;
            }
            
            .progress-eta,
            .progress-speed {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .eta-label,
            .speed-unit {
                opacity: 0.7;
            }
            
            .eta-value,
            .speed-value {
                font-weight: 500;
            }
            
            .progress-actions {
                text-align: center;
                margin-top: 16px;
            }
            
            .progress-cancel-btn {
                padding: 8px 16px;
                border: 1px solid #dc3545;
                background: transparent;
                color: #dc3545;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .progress-cancel-btn:hover {
                background: #dc3545;
                color: white;
            }
            
            /* Minimal theme */
            .progress-minimal {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            }
            
            .progress-minimal .progress-bar {
                height: 4px;
            }
            
            .progress-minimal .progress-fill {
                background: #007bff;
            }
            
            /* Modern theme */
            .progress-modern {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .progress-modern .progress-bar {
                height: 6px;
                background: rgba(0, 0, 0, 0.1);
            }
            
            .progress-modern .progress-fill {
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            }
            
            /* Indeterminate progress */
            .progress-indeterminate .progress-fill {
                width: 30% !important;
                animation: indeterminate 2s infinite ease-in-out;
            }
            
            @keyframes indeterminate {
                0% { left: -30%; }
                50% { left: 100%; }
                100% { left: 100%; }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // Public API methods
    show(message = '', progress = 0) {
        this.message = message;
        this.progress = Math.max(0, Math.min(100, progress));
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.speeds = [];
        
        if (this.backdrop) {
            this.backdrop.style.display = 'flex';
        } else {
            this.element.style.display = 'block';
        }
        
        this.isVisible = true;
        this.updateDisplay();
        
        // Add to container if inline and not already added
        if (this.options.type === 'inline' && !this.element.parentNode) {
            const container = this.options.container || document.body;
            container.appendChild(this.element);
        }
        
        // Animation
        requestAnimationFrame(() => {
            this.element.classList.add('show');
        });
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('progress_tracker_show');
        }
    }
    
    hide() {
        this.isVisible = false;
        
        this.element.classList.remove('show');
        
        setTimeout(() => {
            if (this.backdrop) {
                this.backdrop.style.display = 'none';
            } else {
                this.element.style.display = 'none';
            }
        }, 300);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('progress_tracker_hide', {
                final_progress: this.progress,
                duration: Date.now() - this.startTime
            });
        }
    }
    
    update(progress, message = null) {
        const oldProgress = this.progress;
        this.progress = Math.max(0, Math.min(100, progress));
        
        if (message !== null) {
            this.message = message;
        }
        
        // Calculate speed
        const now = Date.now();
        const timeDiff = now - this.lastUpdate;
        const progressDiff = this.progress - oldProgress;
        
        if (timeDiff > 0 && progressDiff > 0) {
            const speed = (progressDiff / timeDiff) * 1000; // progress per second
            this.speeds.push(speed);
            
            // Keep only last 10 measurements for smoothing
            if (this.speeds.length > 10) {
                this.speeds.shift();
            }
        }
        
        this.lastUpdate = now;
        this.updateDisplay();
        
        // Trigger callback
        this.onUpdate(this.progress, this.message);
        
        // Auto-complete at 100%
        if (this.progress >= 100) {
            setTimeout(() => {
                this.complete();
            }, 500);
        }
    }
    
    setMessage(message) {
        this.message = message;
        this.updateDisplay();
    }
    
    setProgress(progress) {
        this.update(progress);
    }
    
    increment(amount = 1) {
        this.update(this.progress + amount);
    }
    
    complete() {
        this.progress = 100;
        this.updateDisplay();
        
        setTimeout(() => {
            this.hide();
            this.onComplete();
        }, 1000);
    }
    
    cancel() {
        this.hide();
        this.onCancel();
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('progress_tracker_cancel', {
                progress_at_cancel: this.progress
            });
        }
    }
    
    reset() {
        this.progress = 0;
        this.message = '';
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.speeds = [];
        this.updateDisplay();
    }
    
    setIndeterminate(indeterminate = true) {
        if (indeterminate) {
            this.element.classList.add('progress-indeterminate');
        } else {
            this.element.classList.remove('progress-indeterminate');
        }
    }
    
    // Private methods
    updateDisplay() {
        if (!this.isVisible) return;
        
        // Update message
        const messageEl = this.element.querySelector('.progress-message');
        if (messageEl) {
            messageEl.textContent = this.message;
        }
        
        // Update progress bar
        const fillEl = this.element.querySelector('.progress-fill');
        if (fillEl) {
            fillEl.style.width = `${this.progress}%`;
        }
        
        // Update percentage
        const percentageEl = this.element.querySelector('.progress-percentage');
        if (percentageEl) {
            percentageEl.textContent = `${Math.round(this.progress)}%`;
        }
        
        // Update ETA
        if (this.options.showETA) {
            this.updateETA();
        }
        
        // Update speed
        if (this.options.showSpeed) {
            this.updateSpeed();
        }
    }
    
    updateETA() {
        const etaEl = this.element.querySelector('.eta-value');
        if (!etaEl || this.progress <= 0) return;
        
        const elapsed = Date.now() - this.startTime;
        const remaining = (elapsed / this.progress) * (100 - this.progress);
        
        if (remaining > 0 && remaining < Infinity) {
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            etaEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            etaEl.textContent = '--:--';
        }
    }
    
    updateSpeed() {
        const speedEl = this.element.querySelector('.speed-value');
        if (!speedEl || this.speeds.length === 0) return;
        
        // Calculate average speed
        const avgSpeed = this.speeds.reduce((sum, speed) => sum + speed, 0) / this.speeds.length;
        speedEl.textContent = avgSpeed.toFixed(1);
    }
    
    destroy() {
        this.hide();
        
        setTimeout(() => {
            if (this.backdrop && this.backdrop.parentNode) {
                this.backdrop.parentNode.removeChild(this.backdrop);
            } else if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);
    }
    
    // Static convenience methods
    static show(message = '', progress = 0, options = {}) {
        const tracker = new ProgressTracker(options);
        tracker.show(message, progress);
        return tracker;
    }
    
    static createInline(container, options = {}) {
        return new ProgressTracker({
            type: 'inline',
            container: container,
            ...options
        });
    }
}

// Global progress tracker for simple usage
let globalProgressTracker = null;

const ProgressManager = {
    show(message, progress, options) {
        if (!globalProgressTracker) {
            globalProgressTracker = new ProgressTracker(options);
        }
        globalProgressTracker.show(message, progress);
        return globalProgressTracker;
    },
    
    update(progress, message) {
        if (globalProgressTracker) {
            globalProgressTracker.update(progress, message);
        }
    },
    
    hide() {
        if (globalProgressTracker) {
            globalProgressTracker.hide();
        }
    },
    
    complete() {
        if (globalProgressTracker) {
            globalProgressTracker.complete();
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressTracker, ProgressManager };
}
