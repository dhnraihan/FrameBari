// static/js/components/color-picker.js
class ColorPicker {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            color: '#ff0000',
            format: 'hex', // hex, rgb, hsl
            alpha: false,
            palette: true,
            presets: [
                '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                '#000000', '#ffffff', '#808080', '#800000', '#008000', '#000080'
            ],
            showInput: true,
            showButtons: true,
            inline: false,
            ...options
        };
        
        this.currentColor = this.parseColor(this.options.color);
        this.isOpen = false;
        this.isDragging = false;
        
        // Event callbacks
        this.onChange = options.onChange || (() => {});
        this.onOpen = options.onOpen || (() => {});
        this.onClose = options.onClose || (() => {});
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.setupEventListeners();
        this.updateDisplay();
        
        if (this.options.inline) {
            this.show();
        }
    }
    
    createElements() {
        this.container.classList.add('color-picker-container');
        
        if (!this.options.inline) {
            // Create trigger button
            this.trigger = document.createElement('div');
            this.trigger.className = 'color-picker-trigger';
            this.trigger.innerHTML = `
                <div class="color-preview" style="background-color: ${this.formatColor()}"></div>
                <span class="color-value">${this.formatColor()}</span>
                <i class="fas fa-chevron-down"></i>
            `;
            this.container.appendChild(this.trigger);
        }
        
        // Create picker popup
        this.picker = document.createElement('div');
        this.picker.className = `color-picker ${this.options.inline ? 'inline' : 'popup'}`;
        this.picker.innerHTML = this.createPickerHTML();
        
        if (this.options.inline) {
            this.container.appendChild(this.picker);
        } else {
            document.body.appendChild(this.picker);
        }
        
        // Get references to picker elements
        this.colorArea = this.picker.querySelector('.color-area');
        this.colorHandle = this.picker.querySelector('.color-handle');
        this.hueSlider = this.picker.querySelector('.hue-slider');
        this.hueHandle = this.picker.querySelector('.hue-handle');
        this.alphaSlider = this.picker.querySelector('.alpha-slider');
        this.alphaHandle = this.picker.querySelector('.alpha-handle');
        this.previewColor = this.picker.querySelector('.preview-color');
        this.hexInput = this.picker.querySelector('.hex-input');
        this.rgbInputs = this.picker.querySelectorAll('.rgb-input');
        this.hslInputs = this.picker.querySelectorAll('.hsl-input');
        this.presetColors = this.picker.querySelectorAll('.preset-color');
    }
    
    createPickerHTML() {
        return `
            <div class="color-picker-inner">
                <!-- Color Area -->
                <div class="color-area-container">
                    <div class="color-area">
                        <div class="color-area-overlay"></div>
                        <div class="color-handle"></div>
                    </div>
                </div>
                
                <!-- Sliders -->
                <div class="slider-container">
                    <div class="hue-slider-container">
                        <div class="hue-slider">
                            <div class="hue-handle"></div>
                        </div>
                    </div>
                    
                    ${this.options.alpha ? `
                        <div class="alpha-slider-container">
                            <div class="alpha-slider">
                                <div class="alpha-handle"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Preview -->
                <div class="color-preview-section">
                    <div class="preview-container">
                        <div class="preview-color"></div>
                        <div class="preview-label">Preview</div>
                    </div>
                </div>
                
                <!-- Color Values -->
                ${this.options.showInput ? this.createInputsHTML() : ''}
                
                <!-- Presets -->
                ${this.options.palette ? this.createPresetsHTML() : ''}
                
                <!-- Buttons -->
                ${this.options.showButtons && !this.options.inline ? `
                    <div class="color-picker-buttons">
                        <button class="btn btn-sm btn-secondary cancel-btn">Cancel</button>
                        <button class="btn btn-sm btn-primary apply-btn">Apply</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    createInputsHTML() {
        return `
            <div class="color-inputs">
                <div class="input-group">
                    <label>HEX</label>
                    <input type="text" class="hex-input" maxlength="7">
                </div>
                
                <div class="input-group">
                    <label>RGB</label>
                    <div class="rgb-inputs">
                        <input type="number" class="rgb-input" data-channel="r" min="0" max="255">
                        <input type="number" class="rgb-input" data-channel="g" min="0" max="255">
                        <input type="number" class="rgb-input" data-channel="b" min="0" max="255">
                    </div>
                </div>
                
                <div class="input-group">
                    <label>HSL</label>
                    <div class="hsl-inputs">
                        <input type="number" class="hsl-input" data-channel="h" min="0" max="360">
                        <input type="number" class="hsl-input" data-channel="s" min="0" max="100">
                        <input type="number" class="hsl-input" data-channel="l" min="0" max="100">
                    </div>
                </div>
                
                ${this.options.alpha ? `
                    <div class="input-group">
                        <label>Alpha</label>
                        <input type="number" class="alpha-input" min="0" max="100" step="1">
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    createPresetsHTML() {
        const presets = this.options.presets.map(color => 
            `<div class="preset-color" data-color="${color}" style="background-color: ${color}"></div>`
        ).join('');
        
        return `
            <div class="color-presets">
                <div class="presets-label">Presets</div>
                <div class="presets-grid">
                    ${presets}
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Trigger click (for popup mode)
        if (this.trigger) {
            this.trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        
        // Color area
        this.colorArea.addEventListener('mousedown', this.handleColorAreaMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleColorAreaMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Hue slider
        this.hueSlider.addEventListener('mousedown', this.handleHueSliderMouseDown.bind(this));
        
        // Alpha slider
        if (this.alphaSlider) {
            this.alphaSlider.addEventListener('mousedown', this.handleAlphaSliderMouseDown.bind(this));
        }
        
        // Inputs
        if (this.hexInput) {
            this.hexInput.addEventListener('input', this.handleHexInput.bind(this));
        }
        
        if (this.rgbInputs) {
            this.rgbInputs.forEach(input => {
                input.addEventListener('input', this.handleRgbInput.bind(this));
            });
        }
        
        if (this.hslInputs) {
            this.hslInputs.forEach(input => {
                input.addEventListener('input', this.handleHslInput.bind(this));
            });
        }
        
        // Presets
        if (this.presetColors) {
            this.presetColors.forEach(preset => {
                preset.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    this.setColor(color);
                });
            });
        }
        
        // Buttons
        const cancelBtn = this.picker.querySelector('.cancel-btn');
        const applyBtn = this.picker.querySelector('.apply-btn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.apply());
        }
        
        // Close on outside click
        if (!this.options.inline) {
            document.addEventListener('click', (e) => {
                if (!this.picker.contains(e.target) && !this.container.contains(e.target)) {
                    this.hide();
                }
            });
        }
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                if (e.key === 'Escape') {
                    this.cancel();
                } else if (e.key === 'Enter') {
                    this.apply();
                }
            }
        });
    }
    
    handleColorAreaMouseDown(e) {
        this.isDragging = 'colorArea';
        this.updateColorFromArea(e);
        e.preventDefault();
    }
    
    handleColorAreaMouseMove(e) {
        if (this.isDragging === 'colorArea') {
            this.updateColorFromArea(e);
        } else if (this.isDragging === 'hue') {
            this.updateHueFromSlider(e);
        } else if (this.isDragging === 'alpha') {
            this.updateAlphaFromSlider(e);
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    handleHueSliderMouseDown(e) {
        this.isDragging = 'hue';
        this.updateHueFromSlider(e);
        e.preventDefault();
    }
    
    handleAlphaSliderMouseDown(e) {
        this.isDragging = 'alpha';
        this.updateAlphaFromSlider(e);
        e.preventDefault();
    }
    
    updateColorFromArea(e) {
        const rect = this.colorArea.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        
        const s = (x / rect.width) * 100;
        const l = 100 - (y / rect.height) * 100;
        
        this.currentColor.s = s;
        this.currentColor.l = l;
        
        this.updateDisplay();
        this.notifyChange();
    }
    
    updateHueFromSlider(e) {
        const rect = this.hueSlider.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const h = (x / rect.width) * 360;
        
        this.currentColor.h = h;
        this.updateDisplay();
        this.notifyChange();
    }
    
    updateAlphaFromSlider(e) {
        const rect = this.alphaSlider.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const a = x / rect.width;
        
        this.currentColor.a = a;
        this.updateDisplay();
        this.notifyChange();
    }
    
    handleHexInput(e) {
        const hex = e.target.value;
        if (this.isValidHex(hex)) {
            this.setColor(hex);
        }
    }
    
    handleRgbInput(e) {
        const channel = e.target.dataset.channel;
        const value = parseInt(e.target.value);
        
        if (!isNaN(value) && value >= 0 && value <= 255) {
            const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
            rgb[channel] = value;
            
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            this.currentColor.h = hsl.h;
            this.currentColor.s = hsl.s;
            this.currentColor.l = hsl.l;
            
            this.updateDisplay();
            this.notifyChange();
        }
    }
    
    handleHslInput(e) {
        const channel = e.target.dataset.channel;
        const value = parseInt(e.target.value);
        
        let isValid = false;
        if (channel === 'h' && value >= 0 && value <= 360) isValid = true;
        if ((channel === 's' || channel === 'l') && value >= 0 && value <= 100) isValid = true;
        
        if (isValid) {
            this.currentColor[channel] = value;
            this.updateDisplay();
            this.notifyChange();
        }
    }
    
    updateDisplay() {
        // Update color area background
        this.colorArea.style.backgroundColor = `hsl(${this.currentColor.h}, 100%, 50%)`;
        
        // Update color handle position
        const saturation = this.currentColor.s / 100;
        const lightness = this.currentColor.l / 100;
        
        this.colorHandle.style.left = `${saturation * 100}%`;
        this.colorHandle.style.top = `${(1 - lightness) * 100}%`;
        
        // Update hue handle position
        this.hueHandle.style.left = `${(this.currentColor.h / 360) * 100}%`;
        
        // Update alpha handle position
        if (this.alphaHandle) {
            this.alphaHandle.style.left = `${this.currentColor.a * 100}%`;
        }
        
        // Update preview
        const color = this.formatColor();
        this.previewColor.style.backgroundColor = color;
        
        // Update trigger (if not inline)
        if (this.trigger) {
            const preview = this.trigger.querySelector('.color-preview');
            const value = this.trigger.querySelector('.color-value');
            
            preview.style.backgroundColor = color;
            value.textContent = color;
        }
        
        // Update inputs
        this.updateInputs();
    }
    
    updateInputs() {
        if (!this.options.showInput) return;
        
        // Update hex input
        if (this.hexInput) {
            this.hexInput.value = this.formatColor('hex');
        }
        
        // Update RGB inputs
        if (this.rgbInputs) {
            const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
            this.rgbInputs[0].value = Math.round(rgb.r);
            this.rgbInputs[1].value = Math.round(rgb.g);
            this.rgbInputs[2].value = Math.round(rgb.b);
        }
        
        // Update HSL inputs
        if (this.hslInputs) {
            this.hslInputs[0].value = Math.round(this.currentColor.h);
            this.hslInputs[1].value = Math.round(this.currentColor.s);
            this.hslInputs[2].value = Math.round(this.currentColor.l);
        }
        
        // Update alpha input
        const alphaInput = this.picker.querySelector('.alpha-input');
        if (alphaInput) {
            alphaInput.value = Math.round(this.currentColor.a * 100);
        }
    }
    
    // Public API methods
    show() {
        if (this.options.inline) return;
        
        this.isOpen = true;
        this.picker.classList.add('visible');
        this.positionPicker();
        this.onOpen();
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('color_picker_open');
        }
    }
    
    hide() {
        if (this.options.inline) return;
        
        this.isOpen = false;
        this.picker.classList.remove('visible');
        this.onClose();
    }
    
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    setColor(color) {
        this.currentColor = this.parseColor(color);
        this.updateDisplay();
        this.notifyChange();
    }
    
    getColor(format = null) {
        return this.formatColor(format || this.options.format);
    }
    
    apply() {
        this.hide();
        this.onChange(this.getColor());
        
        // Track analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackFeatureUsage('color_picker_apply');
        }
    }
    
    cancel() {
        this.hide();
        // Reset to initial color if needed
    }
    
    destroy() {
        this.picker.remove();
        if (this.trigger) {
            this.trigger.remove();
        }
    }
    
    // Utility methods
    parseColor(color) {
        if (typeof color === 'string') {
            if (color.startsWith('#')) {
                return this.hexToHsl(color);
            } else if (color.startsWith('rgb')) {
                const rgb = this.parseRgb(color);
                return this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            } else if (color.startsWith('hsl')) {
                return this.parseHsl(color);
            }
        }
        
        // Default to red
        return { h: 0, s: 100, l: 50, a: 1 };
    }
    
    formatColor(format = null) {
        format = format || this.options.format;
        
        switch (format) {
            case 'hex':
                const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
                return this.rgbToHex(rgb.r, rgb.g, rgb.b);
            
            case 'rgb':
                const rgbColor = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
                if (this.options.alpha && this.currentColor.a < 1) {
                    return `rgba(${Math.round(rgbColor.r)}, ${Math.round(rgbColor.g)}, ${Math.round(rgbColor.b)}, ${this.currentColor.a})`;
                } else {
                    return `rgb(${Math.round(rgbColor.r)}, ${Math.round(rgbColor.g)}, ${Math.round(rgbColor.b)})`;
                }
            
            case 'hsl':
                if (this.options.alpha && this.currentColor.a < 1) {
                    return `hsla(${Math.round(this.currentColor.h)}, ${Math.round(this.currentColor.s)}%, ${Math.round(this.currentColor.l)}%, ${this.currentColor.a})`;
                } else {
                    return `hsl(${Math.round(this.currentColor.h)}, ${Math.round(this.currentColor.s)}%, ${Math.round(this.currentColor.l)}%)`;
                }
            
            default:
                return this.formatColor('hex');
        }
    }
    
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        if (s === 0) {
            return { r: l * 255, g: l * 255, b: l * 255 };
        }
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        return {
            r: hue2rgb(p, q, h + 1/3) * 255,
            g: hue2rgb(p, q, h) * 255,
            b: hue2rgb(p, q, h - 1/3) * 255
        };
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        return {
            h: h * 360,
            s: s * 100,
            l: l * 100,
            a: this.currentColor ? this.currentColor.a : 1
        };
    }
    
    hexToHsl(hex) {
        const rgb = this.hexToRgb(hex);
        return this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
    }
    
    parseRgb(rgb) {
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        } : null;
    }
    
    parseHsl(hsl) {
        const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        return match ? {
            h: parseInt(match[1]),
            s: parseInt(match[2]),
            l: parseInt(match[3]),
            a: 1
        } : null;
    }
    
    isValidHex(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }
    
    positionPicker() {
        if (this.options.inline) return;
        
        const triggerRect = this.container.getBoundingClientRect();
        const pickerRect = this.picker.getBoundingClientRect();
        
        let top = triggerRect.bottom + 5;
        let left = triggerRect.left;
        
        // Adjust if picker goes off screen
        if (left + pickerRect.width > window.innerWidth) {
            left = window.innerWidth - pickerRect.width - 10;
        }
        
        if (top + pickerRect.height > window.innerHeight) {
            top = triggerRect.top - pickerRect.height - 5;
        }
        
        this.picker.style.top = `${top + window.pageYOffset}px`;
        this.picker.style.left = `${left + window.pageXOffset}px`;
    }
    
    notifyChange() {
        if (this.options.inline) {
            this.onChange(this.getColor());
        }
    }
}

// Auto-initialize color pickers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-color-picker]').forEach(element => {
        const options = element.dataset.colorPickerOptions ? 
                       JSON.parse(element.dataset.colorPickerOptions) : {};
        new ColorPicker(element, options);
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorPicker;
}
