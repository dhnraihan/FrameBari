// static/js/analytics.js
class AnalyticsTracker {
    constructor(options = {}) {
        this.options = {
            endpoint: '/api/v1/analytics/track/',
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            batchSize: 10,
            batchTimeout: 5000, // 5 seconds
            enableAutoTracking: true,
            trackPageViews: true,
            trackClicks: true,
            trackFormSubmissions: true,
            trackScrollDepth: true,
            trackTimeOnPage: true,
            ...options
        };
        
        this.eventQueue = [];
        this.batchTimer = null;
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.pageLoadTime = Date.now();
        this.maxScrollDepth = 0;
        this.isTracking = false;
        
        this.init();
    }
    
    init() {
        if (this.options.enableAutoTracking) {
            this.setupAutoTracking();
        }
        
        this.startSession();
        this.setupEventListeners();
        
        // Track initial page view
        if (this.options.trackPageViews) {
            this.trackPageView();
        }
    }
    
    setupAutoTracking() {
        if (this.options.trackClicks) {
            this.setupClickTracking();
        }
        
        if (this.options.trackFormSubmissions) {
            this.setupFormTracking();
        }
        
        if (this.options.trackScrollDepth) {
            this.setupScrollTracking();
        }
        
        if (this.options.trackTimeOnPage) {
            this.setupTimeTracking();
        }
    }
    
    setupEventListeners() {
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackTimeOnPage();
            this.flushEvents();
        });
        
        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackTimeOnPage();
                this.flushEvents();
            } else {
                this.pageLoadTime = Date.now();
            }
        });
        
        // Track hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            this.trackPageView();
        });
    }
    
    setupClickTracking() {
        document.addEventListener('click', (e) => {
            const element = e.target.closest('a, button, [data-track]');
            if (!element) return;
            
            const properties = {
                element_type: element.tagName.toLowerCase(),
                element_id: element.id || null,
                element_class: element.className || null,
                element_text: element.textContent?.trim().substring(0, 100) || null,
                href: element.href || null,
                x: e.clientX,
                y: e.clientY
            };
            
            // Custom tracking attributes
            if (element.dataset.track) {
                properties.track_id = element.dataset.track;
            }
            
            if (element.dataset.trackCategory) {
                properties.category = element.dataset.trackCategory;
            }
            
            this.track('click', properties);
        });
    }
    
    setupFormTracking() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form.tagName || form.tagName.toLowerCase() !== 'form') return;
            
            const properties = {
                form_id: form.id || null,
                form_class: form.className || null,
                form_action: form.action || null,
                form_method: form.method || 'get',
                field_count: form.elements.length
            };
            
            // Track form fields (without values for privacy)
            const fieldTypes = Array.from(form.elements)
                .map(el => el.type)
                .filter(type => type)
                .reduce((acc, type) => {
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {});
            
            properties.field_types = fieldTypes;
            
            this.track('form_submit', properties);
        });
    }
    
    setupScrollTracking() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = Math.round((scrollTop / documentHeight) * 100);
                
                if (scrollPercent > this.maxScrollDepth) {
                    this.maxScrollDepth = scrollPercent;
                    
                    // Track milestone scroll depths
                    const milestones = [25, 50, 75, 90, 100];
                    milestones.forEach(milestone => {
                        if (scrollPercent >= milestone && this.maxScrollDepth < milestone) {
                            this.track('scroll_depth', {
                                depth_percent: milestone,
                                page_height: documentHeight + window.innerHeight
                            });
                        }
                    });
                }
            }, 250);
        });
    }
    
    setupTimeTracking() {
        // Track time intervals
        setInterval(() => {
            if (!document.hidden) {
                this.track('time_on_page', {
                    duration: Date.now() - this.pageLoadTime,
                    is_active: this.isUserActive()
                });
            }
        }, 30000); // Every 30 seconds
    }
    
    track(eventName, properties = {}, options = {}) {
        const event = {
            event_name: eventName,
            properties: {
                ...this.getDefaultProperties(),
                ...properties
            },
            timestamp: Date.now(),
            session_id: this.sessionId,
            user_id: this.userId,
            ...options
        };
        
        this.addToQueue(event);
        
        // Trigger immediate send for important events
        if (options.immediate || this.isImportantEvent(eventName)) {
            this.flushEvents();
        }
    }
    
    trackPageView(path = null) {
        const properties = {
            page_url: path || window.location.href,
            page_path: path || window.location.pathname,
            page_title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            page_load_time: this.pageLoadTime
        };
        
        this.track('page_view', properties);
    }
    
    trackTimeOnPage() {
        const timeOnPage = Date.now() - this.pageLoadTime;
        
        this.track('time_on_page_final', {
            duration: timeOnPage,
            max_scroll_depth: this.maxScrollDepth,
            page_url: window.location.href
        });
    }
    
    trackConversion(conversionType, value = null, properties = {}) {
        this.track('conversion', {
            conversion_type: conversionType,
            conversion_value: value,
            ...properties
        }, { immediate: true });
    }
    
    trackError(error, context = {}) {
        this.track('error', {
            error_message: error.message,
            error_stack: error.stack,
            error_type: error.constructor.name,
            page_url: window.location.href,
            ...context
        }, { immediate: true });
    }
    
    trackFeatureUsage(featureName, properties = {}) {
        this.track('feature_usage', {
            feature_name: featureName,
            ...properties
        });
    }
    
    trackUserAction(action, target = null, properties = {}) {
        this.track('user_action', {
            action: action,
            target: target,
            ...properties
        });
    }
    
    addToQueue(event) {
        this.eventQueue.push(event);
        
        // Auto-flush if batch size reached
        if (this.eventQueue.length >= this.options.batchSize) {
            this.flushEvents();
        } else if (!this.batchTimer) {
            // Set timer for batch timeout
            this.batchTimer = setTimeout(() => {
                this.flushEvents();
            }, this.options.batchTimeout);
        }
    }
    
    async flushEvents() {
        if (this.eventQueue.length === 0) return;
        
        const events = [...this.eventQueue];
        this.eventQueue = [];
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        
        try {
            await this.sendEvents(events);
        } catch (error) {
            console.error('Failed to send analytics events:', error);
            
            // Re-queue events on failure (with limit)
            if (events.length < 100) {
                this.eventQueue.unshift(...events);
            }
        }
    }
    
    async sendEvents(events) {
        const payload = {
            events: events,
            session_id: this.sessionId,
            timestamp: Date.now()
        };
        
        // Use sendBeacon for better reliability during page unload
        if (navigator.sendBeacon && document.visibilityState === 'hidden') {
            const success = navigator.sendBeacon(
                this.options.endpoint,
                JSON.stringify(payload)
            );
            
            if (!success) {
                throw new Error('Beacon send failed');
            }
        } else {
            // Use fetch for normal requests
            const response = await fetch(this.options.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(payload),
                keepalive: true
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        }
    }
    
    getDefaultProperties() {
        return {
            timestamp: Date.now(),
            page_url: window.location.href,
            page_path: window.location.pathname,
            user_agent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            connection_type: this.getConnectionType(),
            device_type: this.getDeviceType()
        };
    }
    
    getConnectionType() {
        if (navigator.connection) {
            return navigator.connection.effectiveType || navigator.connection.type;
        }
        return 'unknown';
    }
    
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/tablet|ipad/.test(userAgent)) {
            return 'tablet';
        } else if (/mobile|android|iphone/.test(userAgent)) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getUserId() {
        // Try to get user ID from various sources
        const userElement = document.querySelector('[data-user-id]');
        if (userElement) {
            return userElement.dataset.userId;
        }
        
        // Check if user info is available globally
        if (window.currentUser && window.currentUser.id) {
            return window.currentUser.id;
        }
        
        return null;
    }
    
    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
               document.querySelector('meta[name=csrf-token]')?.getAttribute('content') ||
               '';
    }
    
    isImportantEvent(eventName) {
        const importantEvents = [
            'conversion',
            'error',
            'purchase',
            'signup',
            'login',
            'subscription'
        ];
        
        return importantEvents.includes(eventName);
    }
    
    isUserActive() {
        // Simple activity detection based on recent mouse/keyboard events
        return Date.now() - this.lastActivityTime < 5000;
    }
    
    startSession() {
        this.track('session_start', {
            session_id: this.sessionId,
            is_returning_visitor: this.isReturningVisitor()
        });
        
        // Update last activity time
        this.updateLastActivity();
        
        // Track activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }
    
    updateLastActivity() {
        this.lastActivityTime = Date.now();
    }
    
    isReturningVisitor() {
        return localStorage.getItem('analytics_visited') !== null;
    }
    
    markAsVisited() {
        localStorage.setItem('analytics_visited', 'true');
    }
    
    // Public API methods
    identify(userId, properties = {}) {
        this.userId = userId;
        
        this.track('identify', {
            user_id: userId,
            ...properties
        }, { immediate: true });
    }
    
    reset() {
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.eventQueue = [];
        this.maxScrollDepth = 0;
        this.pageLoadTime = Date.now();
    }
    
    setProperty(key, value) {
        this.customProperties = this.customProperties || {};
        this.customProperties[key] = value;
    }
    
    removeProperty(key) {
        if (this.customProperties) {
            delete this.customProperties[key];
        }
    }
    
    enable() {
        this.isTracking = true;
    }
    
    disable() {
        this.isTracking = false;
        this.flushEvents();
    }
    
    isEnabled() {
        return this.isTracking;
    }
}

// Global analytics instance
const Analytics = new AnalyticsTracker();

// Convenience functions
const track = (eventName, properties, options) => {
    Analytics.track(eventName, properties, options);
};

const trackPageView = (path) => {
    Analytics.trackPageView(path);
};

const trackConversion = (type, value, properties) => {
    Analytics.trackConversion(type, value, properties);
};

const trackFeatureUsage = (feature, properties) => {
    Analytics.trackFeatureUsage(feature, properties);
};

const trackError = (error, context) => {
    Analytics.trackError(error, context);
};

// Auto-track JavaScript errors
window.addEventListener('error', (e) => {
    Analytics.trackError(e.error || new Error(e.message), {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

// Auto-track unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    Analytics.trackError(new Error(e.reason), {
        type: 'unhandled_promise_rejection'
    });
});

// Mark as visited
Analytics.markAsVisited();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsTracker, Analytics, track, trackPageView, trackConversion, trackFeatureUsage, trackError };
}
