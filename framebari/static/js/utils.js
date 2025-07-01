// static/js/utils.js
const Utils = {
    // Debounce function
    debounce(func, wait, immediate = false) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func(...args);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Format date
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },
    
    // Format relative time
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return this.formatDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    },
    
    // Deep clone object
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },
    
    // Generate unique ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Parse query string
    parseQueryString(url = window.location.search) {
        const params = new URLSearchParams(url);
        const result = {};
        
        for (const [key, value] of params) {
            result[key] = value;
        }
        
        return result;
    },
    
    // Build query string
    buildQueryString(params) {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                searchParams.append(key, value);
            }
        });
        
        return searchParams.toString();
    },
    
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Validate URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },
    
    // Sanitize HTML
    sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },
    
    // Escape HTML entities
    escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },
    
    // Get element position
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height
        };
    },
    
    // Check if element is in viewport
    isInViewport(element, threshold = 0) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const verticalInView = rect.top <= windowHeight - threshold && rect.bottom >= threshold;
        const horizontalInView = rect.left <= windowWidth - threshold && rect.right >= threshold;
        
        return verticalInView && horizontalInView;
    },
    
    // Smooth scroll to element
    scrollToElement(element, offset = 0, duration = 500) {
        const targetPosition = this.getElementPosition(element).top - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        }
        
        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }
        
        requestAnimationFrame(animation);
    },
    
    // Get device type
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/tablet|ipad/.test(userAgent)) {
            return 'tablet';
        } else if (/mobile|android|iphone/.test(userAgent)) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    },
    
    // Check if device supports touch
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // Get browser info
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)?.[1];
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)?.[1];
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)?.[1];
        } else if (userAgent.includes('Edge')) {
            browser = 'Edge';
            version = userAgent.match(/Edge\/(\d+)/)?.[1];
        }
        
        return { browser, version };
    },
    
    // Local storage with JSON support
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Failed to save to localStorage:', e);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Failed to read from localStorage:', e);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Failed to remove from localStorage:', e);
                return false;
            }
        },
        
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('Failed to clear localStorage:', e);
                return false;
            }
        }
    },
    
    // Cookie utilities
    cookie: {
        set(name, value, days = 7, path = '/') {
            const expires = new Date();
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=${path}`;
        },
        
        get(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            
            return null;
        },
        
        remove(name, path = '/') {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        }
    },
    
    // Color utilities
    color: {
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        
        rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },
        
        isLight(hex) {
            const rgb = this.hexToRgb(hex);
            if (!rgb) return false;
            
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128;
        }
    },
    
    // Image utilities
    image: {
        preload(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        },
        
        getDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        resizeCanvas(canvas, maxWidth, maxHeight) {
            const ctx = canvas.getContext('2d');
            const { width, height } = canvas;
            
            let newWidth = width;
            let newHeight = height;
            
            if (width > maxWidth) {
                newWidth = maxWidth;
                newHeight = (height * maxWidth) / width;
            }
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (newWidth * maxHeight) / newHeight;
            }
            
            if (newWidth !== width || newHeight !== height) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCtx.drawImage(canvas, 0, 0);
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);
            }
            
            return canvas;
        }
    },
    
    // Performance utilities
    performance: {
        measure(name, fn) {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        },
        
        async measureAsync(name, fn) {
            const start = performance.now();
            const result = await fn();
            const end = performance.now();
            
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        }
    },
    
    // Array utilities
    array: {
        chunk(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },
        
        shuffle(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },
        
        unique(array) {
            return [...new Set(array)];
        },
        
        groupBy(array, key) {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        }
    },
    
    // Math utilities
    math: {
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        
        lerp(start, end, factor) {
            return start + (end - start) * factor;
        },
        
        randomBetween(min, max) {
            return Math.random() * (max - min) + min;
        },
        
        roundToDecimals(value, decimals) {
            return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
        }
    },
    
    // DOM utilities
    dom: {
        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        },
        
        create(tagName, attributes = {}, children = []) {
            const element = document.createElement(tagName);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
            
            return element;
        },
        
        find(selector, context = document) {
            return context.querySelector(selector);
        },
        
        findAll(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },
        
        addClass(element, className) {
            element.classList.add(className);
        },
        
        removeClass(element, className) {
            element.classList.remove(className);
        },
        
        toggleClass(element, className) {
            element.classList.toggle(className);
        },
        
        hasClass(element, className) {
            return element.classList.contains(className);
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
