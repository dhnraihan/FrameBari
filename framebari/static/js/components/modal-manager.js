// static/js/components/modal-manager.js
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModals = [];
        this.backdropElement = null;
        this.scrollPosition = 0;
        
        this.init();
    }
    
    init() {
        this.createBackdrop();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }
    
    createBackdrop() {
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'modal-backdrop';
        this.backdropElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        `;
        document.body.appendChild(this.backdropElement);
    }
    
    setupEventListeners() {
        // Close modal on backdrop click
        this.backdropElement.addEventListener('click', (e) => {
            if (e.target === this.backdropElement) {
                const topModal = this.getTopModal();
                if (topModal && topModal.options.closeOnBackdrop) {
                    this.close(topModal.id);
                }
            }
        });
        
        // Handle browser back button
        window.addEventListener('popstate', () => {
            if (this.activeModals.length > 0) {
                const topModal = this.getTopModal();
                if (topModal) {
                    this.close(topModal.id);
                }
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                const topModal = this.getTopModal();
                if (topModal && topModal.options.closeOnEscape) {
                    this.close(topModal.id);
                }
            }
        });
    }
    
    create(id, options = {}) {
        if (this.modals.has(id)) {
            console.warn(`Modal with id '${id}' already exists`);
            return this.modals.get(id);
        }
        
        const defaultOptions = {
            title: '',
            content: '',
            size: 'medium', // small, medium, large, fullscreen
            closeOnBackdrop: true,
            closeOnEscape: true,
            showCloseButton: true,
            showHeader: true,
            showFooter: false,
            buttons: [],
            animation: 'fade', // fade, slide, zoom
            centered: true,
            scrollable: false,
            className: '',
            onShow: () => {},
            onShown: () => {},
            onHide: () => {},
            onHidden: () => {}
        };
        
        const modal = {
            id,
            options: { ...defaultOptions, ...options },
            element: null,
            isVisible: false
        };
        
        modal.element = this.createModalElement(modal);
        this.modals.set(id, modal);
        
        return modal;
    }
    
    createModalElement(modal) {
        const element = document.createElement('div');
        element.className = `modal modal-${modal.options.size} ${modal.options.className}`;
        element.setAttribute('tabindex', '-1');
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('aria-labelledby', `${modal.id}-title`);
        
        if (modal.options.centered) {
            element.classList.add('modal-centered');
        }
        
        if (modal.options.scrollable) {
            element.classList.add('modal-scrollable');
        }
        
        element.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    ${modal.options.showHeader ? `
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modal.id}-title">${modal.options.title}</h5>
                            ${modal.options.showCloseButton ? `
                                <button type="button" class="modal-close" aria-label="Close">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="modal-body">
                        ${modal.options.content}
                    </div>
                    
                    ${modal.options.showFooter || modal.options.buttons.length > 0 ? `
                        <div class="modal-footer">
                            ${this.createButtons(modal.options.buttons)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Setup event listeners
        this.setupModalEvents(modal);
        
        document.body.appendChild(element);
        return element;
    }
    
    createButtons(buttons) {
        return buttons.map(button => {
            const btnClass = button.className || 'btn-secondary';
            const btnType = button.type || 'button';
            
            return `
                <button type="${btnType}" 
                        class="btn ${btnClass}" 
                        data-action="${button.action || ''}"
                        ${button.disabled ? 'disabled' : ''}>
                    ${button.icon ? `<i class="${button.icon}"></i> ` : ''}
                    ${button.text}
                </button>
            `;
        }).join('');
    }
    
    setupModalEvents(modal) {
        // Close button
        const closeBtn = modal.element.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(modal.id);
            });
        }
        
        // Footer buttons
        const footerButtons = modal.element.querySelectorAll('.modal-footer button');
        footerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                
                if (action === 'close' || action === 'cancel') {
                    this.close(modal.id);
                } else if (action && modal.options.onButtonClick) {
                    modal.options.onButtonClick(action, modal);
                }
            });
        });
        
        // Animation classes
        modal.element.classList.add(`modal-${modal.options.animation}`);
    }
    
    show(id, updateOptions = {}) {
        const modal = this.modals.get(id);
        if (!modal) {
            console.error(`Modal with id '${id}' not found`);
            return false;
        }
        
        if (modal.isVisible) {
            return true;
        }
        
        // Update options if provided
        if (Object.keys(updateOptions).length > 0) {
            Object.assign(modal.options, updateOptions);
            this.updateModalContent(modal);
        }
        
        // Call onShow callback
        modal.options.onShow(modal);
        
        // Prevent body scroll
        this.preventBodyScroll();
        
        // Show backdrop
        this.showBackdrop();
        
        // Show modal
        modal.element.style.display = 'flex';
        modal.element.classList.add('show');
        modal.element.setAttribute('aria-hidden', 'false');
        
        // Add to active modals
        this.activeModals.push(modal);
        modal.isVisible = true;
        
        // Set z-index based on stack position
        const zIndex = 1050 + (this.activeModals.length - 1) * 10;
        modal.element.style.zIndex = zIndex;
        
        // Focus management
        this.manageFocus(modal);
        
        // Animation
        requestAnimationFrame(() => {
            modal.element.classList.add('modal-show');
            
            setTimeout(() => {
                modal.options.onShown(modal);
            }, 300);
        });
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('modal_show', { modal_id: id });
        }
        
        return true;
    }
    
    hide(id) {
        const modal = this.modals.get(id);
        if (!modal || !modal.isVisible) {
            return false;
        }
        
        // Call onHide callback
        modal.options.onHide(modal);
        
        // Remove from active modals
        const index = this.activeModals.findIndex(m => m.id === id);
        if (index > -1) {
            this.activeModals.splice(index, 1);
        }
        
        modal.isVisible = false;
        
        // Animation
        modal.element.classList.remove('modal-show');
        
        setTimeout(() => {
            modal.element.style.display = 'none';
            modal.element.classList.remove('show');
            modal.element.setAttribute('aria-hidden', 'true');
            
            // Hide backdrop if no more modals
            if (this.activeModals.length === 0) {
                this.hideBackdrop();
                this.restoreBodyScroll();
            }
            
            // Restore focus
            this.restoreFocus();
            
            modal.options.onHidden(modal);
        }, 300);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('modal_hide', { modal_id: id });
        }
        
        return true;
    }
    
    close(id) {
        return this.hide(id);
    }
    
    toggle(id, updateOptions = {}) {
        const modal = this.modals.get(id);
        if (!modal) {
            return false;
        }
        
        if (modal.isVisible) {
            return this.hide(id);
        } else {
            return this.show(id, updateOptions);
        }
    }
    
    updateContent(id, content) {
        const modal = this.modals.get(id);
        if (!modal) {
            return false;
        }
        
        const bodyElement = modal.element.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
        
        return true;
    }
    
    updateTitle(id, title) {
        const modal = this.modals.get(id);
        if (!modal) {
            return false;
        }
        
        const titleElement = modal.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        modal.options.title = title;
        return true;
    }
    
    updateModalContent(modal) {
        // Update title
        const titleElement = modal.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = modal.options.title;
        }
        
        // Update content
        const bodyElement = modal.element.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = modal.options.content;
        }
        
        // Update buttons
        const footerElement = modal.element.querySelector('.modal-footer');
        if (footerElement && modal.options.buttons.length > 0) {
            footerElement.innerHTML = this.createButtons(modal.options.buttons);
            this.setupModalEvents(modal);
        }
    }
    
    destroy(id) {
        const modal = this.modals.get(id);
        if (!modal) {
            return false;
        }
        
        if (modal.isVisible) {
            this.hide(id);
        }
        
        setTimeout(() => {
            if (modal.element && modal.element.parentNode) {
                modal.element.parentNode.removeChild(modal.element);
            }
            this.modals.delete(id);
        }, 300);
        
        return true;
    }
    
    destroyAll() {
        this.activeModals.forEach(modal => {
            this.destroy(modal.id);
        });
        
        this.hideBackdrop();
        this.restoreBodyScroll();
    }
    
    getTopModal() {
        return this.activeModals[this.activeModals.length - 1] || null;
    }
    
    isVisible(id) {
        const modal = this.modals.get(id);
        return modal ? modal.isVisible : false;
    }
    
    getModal(id) {
        return this.modals.get(id);
    }
    
    getAllModals() {
        return Array.from(this.modals.keys());
    }
    
    showBackdrop() {
        this.backdropElement.style.visibility = 'visible';
        this.backdropElement.style.opacity = '1';
        this.backdropElement.style.zIndex = 1040 + (this.activeModals.length - 1) * 10;
    }
    
    hideBackdrop() {
        this.backdropElement.style.opacity = '0';
        setTimeout(() => {
            this.backdropElement.style.visibility = 'hidden';
        }, 300);
    }
    
    preventBodyScroll() {
        this.scrollPosition = window.pageYOffset;
        document.body.style.cssText = `
            position: fixed;
            top: -${this.scrollPosition}px;
            width: 100%;
            overflow: hidden;
        `;
    }
    
    restoreBodyScroll() {
        document.body.style.cssText = '';
        window.scrollTo(0, this.scrollPosition);
    }
    
    manageFocus(modal) {
        // Store currently focused element
        modal.previousFocus = document.activeElement;
        
        // Focus modal
        const focusableElements = modal.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            modal.element.focus();
        }
        
        // Trap focus within modal
        modal.element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.trapFocus(e, focusableElements);
            }
        });
    }
    
    trapFocus(e, focusableElements) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
    
    restoreFocus() {
        const topModal = this.getTopModal();
        
        if (topModal && topModal.previousFocus) {
            topModal.previousFocus.focus();
        }
    }
    
    // Convenience methods
    alert(message, title = 'Alert', options = {}) {
        const id = 'alert-modal';
        
        if (this.modals.has(id)) {
            this.destroy(id);
        }
        
        this.create(id, {
            title: title,
            content: `<div class="alert-content">${message}</div>`,
            size: 'small',
            buttons: [{
                text: 'OK',
                className: 'btn-primary',
                action: 'close'
            }],
            ...options
        });
        
        return this.show(id);
    }
    
    confirm(message, title = 'Confirm', options = {}) {
        return new Promise((resolve) => {
            const id = 'confirm-modal';
            
            if (this.modals.has(id)) {
                this.destroy(id);
            }
            
            this.create(id, {
                title: title,
                content: `<div class="confirm-content">${message}</div>`,
                size: 'small',
                buttons: [
                    {
                        text: 'Cancel',
                        className: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: 'OK',
                        className: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onButtonClick: (action) => {
                    resolve(action === 'confirm');
                    this.close(id);
                },
                onHidden: () => {
                    resolve(false);
                },
                ...options
            });
            
            this.show(id);
        });
    }
    
    prompt(message, defaultValue = '', title = 'Input', options = {}) {
        return new Promise((resolve) => {
            const id = 'prompt-modal';
            
            if (this.modals.has(id)) {
                this.destroy(id);
            }
            
            this.create(id, {
                title: title,
                content: `
                    <div class="prompt-content">
                        <p>${message}</p>
                        <input type="text" class="form-control prompt-input" value="${defaultValue}" autofocus>
                    </div>
                `,
                size: 'small',
                buttons: [
                    {
                        text: 'Cancel',
                        className: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: 'OK',
                        className: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onButtonClick: (action, modal) => {
                    if (action === 'confirm') {
                        const input = modal.element.querySelector('.prompt-input');
                        resolve(input ? input.value : null);
                    } else {
                        resolve(null);
                    }
                    this.close(id);
                },
                onShown: (modal) => {
                    const input = modal.element.querySelector('.prompt-input');
                    if (input) {
                        input.focus();
                        input.select();
                        
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                const confirmBtn = modal.element.querySelector('[data-action="confirm"]');
                                if (confirmBtn) confirmBtn.click();
                            }
                        });
                    }
                },
                onHidden: () => {
                    resolve(null);
                },
                ...options
            });
            
            this.show(id);
        });
    }
}

// Global modal manager instance
const ModalManager = new ModalManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
