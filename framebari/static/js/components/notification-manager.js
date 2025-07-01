// static/js/components/notification-manager.js
class NotificationManager {
    constructor(options = {}) {
        this.options = {
            position: 'top-right', // top-left, top-right, bottom-left, bottom-right, top-center, bottom-center
            duration: 5000,
            maxNotifications: 5,
            showProgress: true,
            pauseOnHover: true,
            closeOnClick: true,
            allowDuplicates: false,
            animation: 'slide', // slide, fade, bounce
            theme: 'default', // default, minimal, modern
            ...options
        };
        
        this.notifications = new Map();
        this.container = null;
        this.notificationCount = 0;
        
        this.init();
    }
    
    init() {
        this.createContainer();
        this.setupStyles();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = `notification-container notification-${this.options.position} notification-${this.options.theme}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        
        document.body.appendChild(this.container);
    }
    
    setupStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                z-index: 9999;
                pointer-events: none;
                max-height: 100vh;
                overflow: hidden;
            }
            
            .notification-top-right {
                top: 20px;
                right: 20px;
            }
            
            .notification-top-left {
                top: 20px;
                left: 20px;
            }
            
            .notification-bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .notification-bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .notification-top-center {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .notification-bottom-center {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .notification {
                pointer-events: auto;
                margin-bottom: 10px;
                min-width: 300px;
                max-width: 500px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                overflow: hidden;
                position: relative;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }
            
            .notification.notification-left {
                transform: translateX(-100%);
            }
            
            .notification.notification-center {
                transform: translateY(-100%);
            }
            
            .notification.show {
                opacity: 1;
                transform: translate(0, 0);
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .notification-icon {
                margin-right: 12px;
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-title {
                font-weight: 600;
                margin: 0 0 4px 0;
                font-size: 14px;
            }
            
            .notification-message {
                margin: 0;
                font-size: 13px;
                color: #6c757d;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #6c757d;
                margin-left: 12px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .notification-close:hover {
                color: #495057;
            }
            
            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
                transition: width linear;
            }
            
            .notification-actions {
                padding: 8px 16px;
                border-top: 1px solid #e9ecef;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .notification-action {
                padding: 4px 12px;
                border: 1px solid transparent;
                border-radius: 4px;
                background: none;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .notification-action.primary {
                background: #007bff;
                color: white;
            }
            
            .notification-action.secondary {
                border-color: #6c757d;
                color: #6c757d;
            }
            
            .notification-action:hover {
                opacity: 0.8;
            }
            
            /* Types */
            .notification-success {
                border-left: 4px solid #28a745;
            }
            
            .notification-success .notification-icon {
                color: #28a745;
            }
            
            .notification-error {
                border-left: 4px solid #dc3545;
            }
            
            .notification-error .notification-icon {
                color: #dc3545;
            }
            
            .notification-warning {
                border-left: 4px solid #ffc107;
            }
            
            .notification-warning .notification-icon {
                color: #ffc107;
            }
            
            .notification-info {
                border-left: 4px solid #17a2b8;
            }
            
            .notification-info .notification-icon {
                color: #17a2b8;
            }
            
            /* Animations */
            .notification-fade {
                transform: none;
                opacity: 0;
            }
            
            .notification-fade.show {
                opacity: 1;
            }
            
            .notification-bounce {
                animation: bounceIn 0.6s ease;
            }
            
            @keyframes bounceIn {
                0% {
                    opacity: 0;
                    transform: scale(0.3);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.05);
                }
                70% {
                    transform: scale(0.9);
                }
                100% {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            /* Minimal theme */
            .notification-minimal .notification {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            }
            
            .notification-minimal .notification-header {
                border-bottom: none;
                padding: 16px;
            }
            
            /* Modern theme */
            .notification-modern .notification {
                border-radius: 12px;
                backdrop-filter: blur(10px);
                background: rgba(255, 255, 255, 0.95);
            }
            
            .notification-modern .notification-header {
                border-bottom: none;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    show(type, message, options = {}) {
        const id = this.generateId();
        
        const defaultOptions = {
            title: this.getDefaultTitle(type),
            duration: this.options.duration,
            showProgress: this.options.showProgress,
            closeable: true,
            actions: [],
            data: null,
            onClick: null,
            onClose: null,
            onShow: null
        };
        
        const notificationOptions = { ...defaultOptions, ...options };
        
        // Check for duplicates
        if (!this.options.allowDuplicates && this.hasDuplicate(message)) {
            return null;
        }
        
        // Remove oldest if at max capacity
        if (this.notifications.size >= this.options.maxNotifications) {
            this.removeOldest();
        }
        
        const notification = {
            id,
            type,
            message,
            options: notificationOptions,
            element: null,
            timer: null,
            startTime: Date.now(),
            pausedTime: 0
        };
        
        notification.element = this.createElement(notification);
        this.notifications.set(id, notification);
        
        this.container.appendChild(notification.element);
        
        // Show animation
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
            
            if (notificationOptions.onShow) {
                notificationOptions.onShow(notification);
            }
        });
        
        // Auto-hide timer
        if (notificationOptions.duration > 0) {
            this.startTimer(notification);
        }
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('notification_show', {
                type: type,
                has_actions: notificationOptions.actions.length > 0
            });
        }
        
        return id;
    }
    
    createElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type} notification-${this.options.animation}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        
        if (this.options.position.includes('left')) {
            element.classList.add('notification-left');
        } else if (this.options.position.includes('center')) {
            element.classList.add('notification-center');
        }
        
        const icon = this.getIcon(notification.type);
        const hasActions = notification.options.actions.length > 0;
        
        element.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    ${notification.options.title ? `
                        <div class="notification-title">${notification.options.title}</div>
                    ` : ''}
                    <div class="notification-message">${notification.message}</div>
                </div>
                ${notification.options.closeable ? `
                    <button class="notification-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
            
            ${hasActions ? `
                <div class="notification-actions">
                    ${this.createActions(notification.options.actions)}
                </div>
            ` : ''}
            
            ${notification.options.showProgress && notification.options.duration > 0 ? `
                <div class="notification-progress"></div>
            ` : ''}
        `;
        
        this.setupEventListeners(notification, element);
        return element;
    }
    
    createActions(actions) {
        return actions.map(action => {
            const className = action.primary ? 'primary' : 'secondary';
            return `
                <button class="notification-action ${className}" 
                        data-action="${action.action || ''}"
                        ${action.disabled ? 'disabled' : ''}>
                    ${action.icon ? `<i class="${action.icon}"></i> ` : ''}
                    ${action.text}
                </button>
            `;
        }).join('');
    }
    
    setupEventListeners(notification, element) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close(notification.id);
            });
        }
        
        // Click handler
        if (notification.options.onClick || this.options.closeOnClick) {
            element.addEventListener('click', (e) => {
                if (e.target.closest('.notification-close') || e.target.closest('.notification-action')) {
                    return;
                }
                
                if (notification.options.onClick) {
                    notification.options.onClick(notification);
                }
                
                if (this.options.closeOnClick) {
                    this.close(notification.id);
                }
            });
        }
        
        // Action buttons
        const actionButtons = element.querySelectorAll('.notification-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const actionConfig = notification.options.actions.find(a => a.action === action);
                
                if (actionConfig && actionConfig.handler) {
                    actionConfig.handler(notification);
                }
                
                if (!actionConfig || actionConfig.closeOnClick !== false) {
                    this.close(notification.id);
                }
            });
        });
        
        // Pause on hover
        if (this.options.pauseOnHover && notification.options.duration > 0) {
            element.addEventListener('mouseenter', () => {
                this.pauseTimer(notification);
            });
            
            element.addEventListener('mouseleave', () => {
                this.resumeTimer(notification);
            });
        }
    }
    
    startTimer(notification) {
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
        
        const remainingTime = notification.options.duration - notification.pausedTime;
        
        notification.timer = setTimeout(() => {
            this.close(notification.id);
        }, remainingTime);
        
        // Update progress bar
        if (notification.options.showProgress) {
            this.updateProgress(notification, remainingTime);
        }
    }
    
    pauseTimer(notification) {
        if (notification.timer) {
            clearTimeout(notification.timer);
            notification.pausedTime = Date.now() - notification.startTime;
        }
    }
    
    resumeTimer(notification) {
        if (notification.options.duration > 0) {
            notification.startTime = Date.now() - notification.pausedTime;
            this.startTimer(notification);
        }
    }
    
    updateProgress(notification, duration) {
        const progressBar = notification.element.querySelector('.notification-progress');
        if (!progressBar) return;
        
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
        
        // Reset for next update
        setTimeout(() => {
            progressBar.style.transition = 'none';
            progressBar.style.width = '100%';
        }, duration);
    }
    
    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) return false;
        
        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
        
        // Hide animation
        notification.element.classList.remove('show');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            this.notifications.delete(id);
            
            if (notification.options.onClose) {
                notification.options.onClose(notification);
            }
        }, 300);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('notification_close', {
                type: notification.type,
                duration_shown: Date.now() - notification.startTime
            });
        }
        
        return true;
    }
    
    closeAll() {
        this.notifications.forEach((notification, id) => {
            this.close(id);
        });
    }
    
    // Convenience methods
    success(message, options = {}) {
        return this.show('success', message, options);
    }
    
    error(message, options = {}) {
        return this.show('error', message, {
            duration: 0, // Don't auto-hide errors
            ...options
        });
    }
    
    warning(message, options = {}) {
        return this.show('warning', message, options);
    }
    
    info(message, options = {}) {
        return this.show('info', message, options);
    }
    
    // Utility methods
    generateId() {
        return `notification_${++this.notificationCount}_${Date.now()}`;
    }
    
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        
        return titles[type] || 'Notification';
    }
    
    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        return icons[type] || 'fas fa-bell';
    }
    
    hasDuplicate(message) {
        for (const notification of this.notifications.values()) {
            if (notification.message === message) {
                return true;
            }
        }
        return false;
    }
    
    removeOldest() {
        const oldest = Array.from(this.notifications.values())
            .sort((a, b) => a.startTime - b.startTime)[0];
        
        if (oldest) {
            this.close(oldest.id);
        }
    }
    
    update(id, updates) {
        const notification = this.notifications.get(id);
        if (!notification) return false;
        
        // Update message
        if (updates.message) {
            const messageEl = notification.element.querySelector('.notification-message');
            if (messageEl) {
                messageEl.textContent = updates.message;
            }
            notification.message = updates.message;
        }
        
        // Update title
        if (updates.title) {
            const titleEl = notification.element.querySelector('.notification-title');
            if (titleEl) {
                titleEl.textContent = updates.title;
            }
            notification.options.title = updates.title;
        }
        
        // Update type
        if (updates.type && updates.type !== notification.type) {
            notification.element.classList.remove(`notification-${notification.type}`);
            notification.element.classList.add(`notification-${updates.type}`);
            
            const iconEl = notification.element.querySelector('.notification-icon i');
            if (iconEl) {
                iconEl.className = this.getIcon(updates.type);
            }
            
            notification.type = updates.type;
        }
        
        return true;
    }
    
    getNotification(id) {
        return this.notifications.get(id);
    }
    
    getAllNotifications() {
        return Array.from(this.notifications.values());
    }
    
    getVisibleCount() {
        return this.notifications.size;
    }
    
    destroy() {
        this.closeAll();
        
        setTimeout(() => {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }, 300);
    }
}

// Global notification manager instance
const NotificationManager = new NotificationManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
