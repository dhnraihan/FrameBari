// static/js/components/slider-component.js
class SliderComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            min: 0,
            max: 100,
            value: 50,
            step: 1,
            orientation: 'horizontal', // horizontal, vertical
            showValue: true,
            showTicks: false,
            tickStep: 10,
            showLabels: true,
            animate: true,
            disabled: false,
            theme: 'default', // default, minimal, modern
            size: 'medium', // small, medium, large
            ...options
        };
        
        this.value = this.options.value;
        this.isDragging = false;
        this.startValue = this.value;
        
        // Event callbacks
        this.onInput = options.onInput || (() => {});
        this.onChange = options.onChange || (() => {});
        this.onStart = options.onStart || (() => {});
        this.onEnd = options.onEnd || (() => {});
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.validateValue();
    }
    
    createElements() {
        this.container.classList.add('slider-component', `slider-${this.options.theme}`, `slider-${this.options.size}`);
        
        if (this.options.orientation === 'vertical') {
            this.container.classList.add('vertical');
        }
        
        this.container.innerHTML = `
            <div class="slider-container">
                ${this.options.showLabels ? `
                    <div class="slider-labels">
                        <span class="slider-label min-label">${this.options.min}</span>
                        <span class="slider-label max-label">${this.options.max}</span>
                    </div>
                ` : ''}
                
                <div class="slider-track-container">
                    <div class="slider-track">
                        <div class="slider-fill"></div>
                        ${this.options.showTicks ? this.createTicks() : ''}
                    </div>
                    <div class="slider-handle">
                        <div class="slider-handle-inner"></div>
                        ${this.options.showValue ? '<div class="slider-tooltip"></div>' : ''}
                    </div>
                </div>
                
                ${this.options.showValue ? `
                    <div class="slider-value-display">
                        <span class="slider-value">${this.value}</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Get references
        this.track = this.container.querySelector('.slider-track');
        this.fill = this.container.querySelector('.slider-fill');
        this.handle = this.container.querySelector('.slider-handle');
        this.tooltip = this.container.querySelector('.slider-tooltip');
        this.valueDisplay = this.container.querySelector('.slider-value');
        
        if (this.options.disabled) {
            this.container.classList.add('disabled');
        }
    }
    
    createTicks() {
        const ticks = [];
        const range = this.options.max - this.options.min;
        const tickCount = Math.floor(range / this.options.tickStep) + 1;
        
        for (let i = 0; i < tickCount; i++) {
            const value = this.options.min + (i * this.options.tickStep);
            const position = ((value - this.options.min) / range) * 100;
            
            ticks.push(`
                <div class="slider-tick" 
                     style="${this.options.orientation === 'horizontal' ? 'left' : 'bottom'}: ${position}%"
                     data-value="${value}">
                    <div class="tick-mark"></div>
                    <div class="tick-label">${value}</div>
                </div>
            `);
        }
        
        return ticks.join('');
    }
    
    setupEventListeners() {
        // Mouse events
        this.handle.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.track.addEventListener('mousedown', this.handleTrackClick.bind(this));
        
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events
        this.handle.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Focus events
        this.container.addEventListener('focus', () => {
            this.container.classList.add('focused');
        });
        
        this.container.addEventListener('blur', () => {
            this.container.classList.remove('focused');
        });
        
        // Make container focusable
        if (!this.container.hasAttribute('tabindex')) {
            this.container.setAttribute('tabindex', '0');
        }
        
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.updateDisplay();
        }, 100));
    }
    
    handleMouseDown(e) {
        if (this.options.disabled) return;
        
        this.startDrag(e.clientX, e.clientY);
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.updateFromPosition(e.clientX, e.clientY);
        }
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    handleTouchStart(e) {
        if (this.options.disabled) return;
        
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY);
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (this.isDragging) {
            const touch = e.touches[0];
            this.updateFromPosition(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    }
    
    handleTouchEnd() {
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    handleTrackClick(e) {
        if (this.options.disabled || e.target === this.handle) return;
        
        this.updateFromPosition(e.clientX, e.clientY);
        this.triggerChange();
    }
    
    handleKeyDown(e) {
        if (this.options.disabled) return;
        
        let newValue = this.value;
        const step = e.shiftKey ? this.options.step * 10 : this.options.step;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                newValue += step;
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue -= step;
                break;
            case 'Home':
                newValue = this.options.min;
                break;
            case 'End':
                newValue = this.options.max;
                break;
            case 'PageUp':
                newValue += step * 10;
                break;
            case 'PageDown':
                newValue -= step * 10;
                break;
            default:
                return;
        }
        
        e.preventDefault();
        this.setValue(newValue);
        this.triggerChange();
    }
    
    startDrag(clientX, clientY) {
        this.isDragging = true;
        this.startValue = this.value;
        this.container.classList.add('dragging');
        
        if (this.tooltip) {
            this.tooltip.style.display = 'block';
        }
        
        this.onStart(this.value);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('slider_drag_start');
        }
    }
    
    updateFromPosition(clientX, clientY) {
        const rect = this.track.getBoundingClientRect();
        let position;
        
        if (this.options.orientation === 'horizontal') {
            position = (clientX - rect.left) / rect.width;
        } else {
            position = 1 - (clientY - rect.top) / rect.height;
        }
        
        position = Math.max(0, Math.min(1, position));
        
        const range = this.options.max - this.options.min;
        const newValue = this.options.min + (position * range);
        
        this.setValue(newValue);
        this.onInput(this.value);
    }
    
    endDrag() {
        this.isDragging = false;
        this.container.classList.remove('dragging');
        
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
        
        if (this.value !== this.startValue) {
            this.triggerChange();
        }
        
        this.onEnd(this.value);
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('slider_drag_end', {
                start_value: this.startValue,
                end_value: this.value,
                change: this.value - this.startValue
            });
        }
    }
    
    // Public API methods
    setValue(value, silent = false) {
        const oldValue = this.value;
        this.value = this.clampValue(this.snapToStep(value));
        
        if (this.value !== oldValue) {
            this.updateDisplay();
            
            if (!silent) {
                this.onInput(this.value);
            }
        }
    }
    
    getValue() {
        return this.value;
    }
    
    setMin(min) {
        this.options.min = min;
        this.setValue(this.value);
        this.updateLabels();
    }
    
    setMax(max) {
        this.options.max = max;
        this.setValue(this.value);
        this.updateLabels();
    }
    
    setStep(step) {
        this.options.step = step;
        this.setValue(this.value);
    }
    
    enable() {
        this.options.disabled = false;
        this.container.classList.remove('disabled');
        this.container.removeAttribute('aria-disabled');
    }
    
    disable() {
        this.options.disabled = true;
        this.container.classList.add('disabled');
        this.container.setAttribute('aria-disabled', 'true');
    }
    
    reset() {
        this.setValue(this.options.value);
        this.triggerChange();
    }
    
    destroy() {
        // Remove event listeners and clean up
        this.container.classList.remove('slider-component');
        this.container.innerHTML = '';
    }
    
    // Private methods
    updateDisplay() {
        const percentage = this.getPercentage();
        
        // Update handle position
        if (this.options.orientation === 'horizontal') {
            this.handle.style.left = `${percentage}%`;
            this.handle.style.bottom = 'auto';
        } else {
            this.handle.style.bottom = `${percentage}%`;
            this.handle.style.left = 'auto';
        }
        
        // Update fill
        if (this.options.orientation === 'horizontal') {
            this.fill.style.width = `${percentage}%`;
            this.fill.style.height = '100%';
        } else {
            this.fill.style.height = `${percentage}%`;
            this.fill.style.width = '100%';
        }
        
        // Update value displays
        if (this.valueDisplay) {
            this.valueDisplay.textContent = this.formatValue(this.value);
        }
        
        if (this.tooltip) {
            this.tooltip.textContent = this.formatValue(this.value);
        }
        
        // Update ARIA attributes
        this.container.setAttribute('aria-valuenow', this.value);
        this.container.setAttribute('aria-valuetext', this.formatValue(this.value));
        
        // Add animation class
        if (this.options.animate && !this.isDragging) {
            this.handle.classList.add('animated');
            this.fill.classList.add('animated');
            
            setTimeout(() => {
                this.handle.classList.remove('animated');
                this.fill.classList.remove('animated');
            }, 200);
        }
    }
    
    updateLabels() {
        const minLabel = this.container.querySelector('.min-label');
        const maxLabel = this.container.querySelector('.max-label');
        
        if (minLabel) minLabel.textContent = this.options.min;
        if (maxLabel) maxLabel.textContent = this.options.max;
    }
    
    getPercentage() {
        const range = this.options.max - this.options.min;
        return ((this.value - this.options.min) / range) * 100;
    }
    
    clampValue(value) {
        return Math.max(this.options.min, Math.min(this.options.max, value));
    }
    
    snapToStep(value) {
        const steps = Math.round((value - this.options.min) / this.options.step);
        return this.options.min + (steps * this.options.step);
    }
    
    formatValue(value) {
        if (this.options.formatter) {
            return this.options.formatter(value);
        }
        
        // Default formatting
        if (this.options.step < 1) {
            const decimals = this.options.step.toString().split('.')[1]?.length || 0;
            return value.toFixed(decimals);
        }
        
        return Math.round(value).toString();
    }
    
    validateValue() {
        this.setValue(this.value, true);
        
        // Set ARIA attributes
        this.container.setAttribute('role', 'slider');
        this.container.setAttribute('aria-valuemin', this.options.min);
        this.container.setAttribute('aria-valuemax', this.options.max);
        this.container.setAttribute('aria-valuenow', this.value);
        this.container.setAttribute('aria-valuetext', this.formatValue(this.value));
        
        if (this.options.disabled) {
            this.container.setAttribute('aria-disabled', 'true');
        }
    }
    
    triggerChange() {
        this.onChange(this.value);
        
        // Dispatch custom event
        const event = new CustomEvent('sliderchange', {
            detail: { value: this.value },
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }
}

// Range Slider (dual handle) extension
class RangeSlider extends SliderComponent {
    constructor(container, options = {}) {
        super(container, {
            ...options,
            value: options.value || [options.min || 0, options.max || 100]
        });
        
        this.isRange = true;
        this.activeHandle = 0;
    }
    
    createElements() {
        super.createElements();
        
        // Add second handle
        const secondHandle = this.handle.cloneNode(true);
        secondHandle.classList.add('handle-max');
        this.handle.classList.add('handle-min');
        this.track.appendChild(secondHandle);
        
        this.handleMin = this.handle;
        this.handleMax = secondHandle;
        this.handles = [this.handleMin, this.handleMax];
        
        // Update tooltips
        this.tooltipMin = this.handleMin.querySelector('.slider-tooltip');
        this.tooltipMax = this.handleMax.querySelector('.slider-tooltip');
        
        this.setupRangeEvents();
    }
    
    setupRangeEvents() {
        this.handleMax.addEventListener('mousedown', (e) => {
            this.activeHandle = 1;
            this.handleMouseDown(e);
        });
        
        this.handleMax.addEventListener('touchstart', (e) => {
            this.activeHandle = 1;
            this.handleTouchStart(e);
        });
    }
    
    setValue(value, silent = false) {
        if (Array.isArray(value)) {
            this.value = [
                this.clampValue(this.snapToStep(value[0])),
                this.clampValue(this.snapToStep(value[1]))
            ];
            
            // Ensure min <= max
            if (this.value[0] > this.value[1]) {
                [this.value[0], this.value[1]] = [this.value[1], this.value[0]];
            }
        } else {
            // Single value - update active handle
            this.value[this.activeHandle] = this.clampValue(this.snapToStep(value));
            
            // Ensure min <= max
            if (this.value[0] > this.value[1]) {
                if (this.activeHandle === 0) {
                    this.value[1] = this.value[0];
                } else {
                    this.value[0] = this.value[1];
                }
            }
        }
        
        this.updateDisplay();
        
        if (!silent) {
            this.onInput(this.value);
        }
    }
    
    updateDisplay() {
        const percentage1 = ((this.value[0] - this.options.min) / (this.options.max - this.options.min)) * 100;
        const percentage2 = ((this.value[1] - this.options.min) / (this.options.max - this.options.min)) * 100;
        
        // Update handle positions
        this.handleMin.style.left = `${percentage1}%`;
        this.handleMax.style.left = `${percentage2}%`;
        
        // Update fill (between handles)
        this.fill.style.left = `${percentage1}%`;
        this.fill.style.width = `${percentage2 - percentage1}%`;
        
        // Update tooltips
        if (this.tooltipMin) {
            this.tooltipMin.textContent = this.formatValue(this.value[0]);
        }
        
        if (this.tooltipMax) {
            this.tooltipMax.textContent = this.formatValue(this.value[1]);
        }
        
        // Update value display
        if (this.valueDisplay) {
            this.valueDisplay.textContent = `${this.formatValue(this.value[0])} - ${this.formatValue(this.value[1])}`;
        }
    }
    
    updateFromPosition(clientX, clientY) {
        const rect = this.track.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const range = this.options.max - this.options.min;
        const newValue = this.options.min + (position * range);
        
        // Determine which handle is closer
        if (!this.isDragging) {
            const dist1 = Math.abs(newValue - this.value[0]);
            const dist2 = Math.abs(newValue - this.value[1]);
            this.activeHandle = dist1 <= dist2 ? 0 : 1;
        }
        
        this.setValue(newValue);
        this.onInput(this.value);
    }
}

// Auto-initialize sliders
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-slider]').forEach(element => {
        const options = element.dataset.sliderOptions ? 
                       JSON.parse(element.dataset.sliderOptions) : {};
        
        if (element.dataset.slider === 'range') {
            new RangeSlider(element, options);
        } else {
            new SliderComponent(element, options);
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SliderComponent, RangeSlider };
}
