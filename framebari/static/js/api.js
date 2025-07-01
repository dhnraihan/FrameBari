// static/js/api.js
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Setup CSRF token
        this.setupCSRF();
        
        // Setup default error handling
        this.setupDefaultErrorHandling();
    }
    
    setupCSRF() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                         document.querySelector('meta[name=csrf-token]')?.getAttribute('content');
        
        if (csrfToken) {
            this.defaultHeaders['X-CSRFToken'] = csrfToken;
        }
    }
    
    setupDefaultErrorHandling() {
        this.addResponseInterceptor(
            (response) => response,
            (error) => {
                // Handle common errors
                if (error.status === 401) {
                    // Unauthorized - redirect to login
                    window.location.href = '/accounts/login/';
                } else if (error.status === 403) {
                    // Forbidden
                    NotificationManager.showError('Access denied');
                } else if (error.status === 429) {
                    // Rate limited
                    NotificationManager.showError('Too many requests. Please try again later.');
                } else if (error.status >= 500) {
                    // Server error
                    NotificationManager.showError('Server error. Please try again later.');
                }
                
                return Promise.reject(error);
            }
        );
    }
    
    addRequestInterceptor(fulfilled, rejected) {
        this.requestInterceptors.push({ fulfilled, rejected });
    }
    
    addResponseInterceptor(fulfilled, rejected) {
        this.responseInterceptors.push({ fulfilled, rejected });
    }
    
    async request(url, options = {}) {
        // Prepare request
        const config = {
            headers: { ...this.defaultHeaders },
            ...options
        };
        
        // Merge custom headers
        if (options.headers) {
            config.headers = { ...config.headers, ...options.headers };
        }
        
        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            try {
                if (interceptor.fulfilled) {
                    config = await interceptor.fulfilled(config);
                }
            } catch (error) {
                if (interceptor.rejected) {
                    return interceptor.rejected(error);
                }
                throw error;
            }
        }
        
        // Make request
        try {
            const response = await fetch(this.baseURL + url, config);
            
            // Create response object
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            
            const responseObj = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config: config,
                success: response.ok,
                ...responseData // Spread response data for backward compatibility
            };
            
            // Apply response interceptors
            let finalResponse = responseObj;
            for (const interceptor of this.responseInterceptors) {
                try {
                    if (response.ok && interceptor.fulfilled) {
                        finalResponse = await interceptor.fulfilled(finalResponse);
                    } else if (!response.ok && interceptor.rejected) {
                        return interceptor.rejected(finalResponse);
                    }
                } catch (error) {
                    throw error;
                }
            }
            
            if (!response.ok) {
                throw finalResponse;
            }
            
            return finalResponse;
            
        } catch (error) {
            // Network or other errors
            if (!error.status) {
                error = {
                    ...error,
                    status: 0,
                    statusText: 'Network Error',
                    message: 'Network request failed'
                };
            }
            
            throw error;
        }
    }
    
    async get(url, params = {}, options = {}) {
        // Convert params to query string
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        return this.request(fullUrl, {
            method: 'GET',
            ...options
        });
    }
    
    async post(url, data = null, options = {}) {
        const config = {
            method: 'POST',
            ...options
        };
        
        if (data) {
            if (data instanceof FormData) {
                // Don't set Content-Type for FormData, let browser set it
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }
        
        return this.request(url, config);
    }
    
    async put(url, data = null, options = {}) {
        const config = {
            method: 'PUT',
            ...options
        };
        
        if (data) {
            if (data instanceof FormData) {
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }
        
        return this.request(url, config);
    }
    
    async patch(url, data = null, options = {}) {
        const config = {
            method: 'PATCH',
            ...options
        };
        
        if (data) {
            if (data instanceof FormData) {
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }
        
        return this.request(url, config);
    }
    
    async delete(url, options = {}) {
        return this.request(url, {
            method: 'DELETE',
            ...options
        });
    }
    
    // Convenience methods for common API patterns
    async uploadFile(url, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = (e.loaded / e.total) * 100;
                        onProgress(progress);
                    }
                });
            }
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        message: xhr.responseText
                    });
                }
            });
            
            xhr.addEventListener('error', () => {
                reject({
                    status: 0,
                    statusText: 'Network Error',
                    message: 'Upload failed'
                });
            });
            
            xhr.open('POST', this.baseURL + url);
            
            // Add CSRF token
            const csrfToken = this.defaultHeaders['X-CSRFToken'];
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRFToken', csrfToken);
            }
            
            xhr.send(formData);
        });
    }
    
    async downloadFile(url, filename = null) {
        try {
            const response = await fetch(this.baseURL + url, {
                headers: this.defaultHeaders
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Get filename from response headers or use provided filename
            const contentDisposition = response.headers.get('content-disposition');
            if (!filename && contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            
            return { success: true, filename };
            
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }
    
    // Batch request helper
    async batch(requests) {
        const promises = requests.map(request => {
            const { method = 'GET', url, data, options = {} } = request;
            
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.get(url, data, options);
                case 'POST':
                    return this.post(url, data, options);
                case 'PUT':
                    return this.put(url, data, options);
                case 'PATCH':
                    return this.patch(url, data, options);
                case 'DELETE':
                    return this.delete(url, options);
                default:
                    return this.request(url, { method, body: data, ...options });
            }
        });
        
        return Promise.allSettled(promises);
    }
    
    // Retry mechanism
    async retryRequest(url, options = {}, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                // Wait before retrying
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
                }
            }
        }
        
        throw lastError;
    }
    
    // Cancel token support
    createCancelToken() {
        const controller = new AbortController();
        return {
            token: controller.signal,
            cancel: (reason) => controller.abort(reason)
        };
    }
    
    // Request caching
    cache = new Map();
    
    async getCached(url, params = {}, cacheTime = 5 * 60 * 1000) { // 5 minutes default
        const cacheKey = `${url}?${new URLSearchParams(params).toString()}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            return cached.data;
        }
        
        const response = await this.get(url, params);
        
        this.cache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        });
        
        return response;
    }
    
    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
}

// Create global API instance
const API = new APIClient();

// Add loading indicator interceptor
API.addRequestInterceptor(
    (config) => {
        // Show loading indicator for non-background requests
        if (!config.background) {
            LoadingManager.show();
        }
        return config;
    },
    (error) => {
        LoadingManager.hide();
        return Promise.reject(error);
    }
);

API.addResponseInterceptor(
    (response) => {
        LoadingManager.hide();
        return response;
    },
    (error) => {
        LoadingManager.hide();
        return Promise.reject(error);
    }
);

// Loading manager
class LoadingManager {
    static activeRequests = 0;
    static loadingElement = null;
    
    static show() {
        this.activeRequests++;
        
        if (!this.loadingElement) {
            this.createLoadingElement();
        }
        
        this.loadingElement.style.display = 'flex';
    }
    
    static hide() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        
        if (this.activeRequests === 0 && this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }
    
    static createLoadingElement() {
        if (document.getElementById('global-loading')) return;
        
        const loadingHTML = `
            <div id="global-loading" class="global-loading">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        this.loadingElement = document.getElementById('global-loading');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, API, LoadingManager };
}
