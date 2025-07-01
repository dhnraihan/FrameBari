// static/js/websocket.js
class WebSocketManager {
    constructor() {
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageHandlers = new Map();
        this.globalHandlers = [];
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseConnections();
            } else {
                this.resumeConnections();
            }
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.resumeConnections();
        });
        
        window.addEventListener('offline', () => {
            this.pauseConnections();
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.closeAllConnections();
        });
    }
    
    connect(name, url, options = {}) {
        if (this.connections.has(name)) {
            console.warn(`WebSocket connection '${name}' already exists`);
            return this.connections.get(name);
        }
        
        const wsUrl = this.buildWebSocketURL(url);
        const connection = new WebSocketConnection(name, wsUrl, options);
        
        this.connections.set(name, connection);
        this.reconnectAttempts.set(name, 0);
        
        // Setup connection event handlers
        this.setupConnectionHandlers(connection);
        
        return connection;
    }
    
    buildWebSocketURL(path) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}${path}`;
    }
    
    setupConnectionHandlers(connection) {
        connection.onOpen(() => {
            console.log(`WebSocket '${connection.name}' connected`);
            this.reconnectAttempts.set(connection.name, 0);
        });
        
        connection.onClose((event) => {
            console.log(`WebSocket '${connection.name}' closed`, event);
            
            if (!event.wasClean && event.code !== 1000) {
                this.attemptReconnect(connection);
            }
        });
        
        connection.onError((error) => {
            console.error(`WebSocket '${connection.name}' error:`, error);
        });
        
        connection.onMessage((data) => {
            this.handleMessage(connection.name, data);
        });
    }
    
    attemptReconnect(connection) {
        const attempts = this.reconnectAttempts.get(connection.name) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts reached for '${connection.name}'`);
            NotificationManager.showError(`Connection to ${connection.name} lost`);
            return;
        }
        
        const delay = this.reconnectDelay * Math.pow(2, attempts);
        
        setTimeout(() => {
            console.log(`Attempting to reconnect '${connection.name}' (attempt ${attempts + 1})`);
            this.reconnectAttempts.set(connection.name, attempts + 1);
            connection.reconnect();
        }, delay);
    }
    
    handleMessage(connectionName, data) {
        // Call global handlers
        this.globalHandlers.forEach(handler => {
            try {
                handler(connectionName, data);
            } catch (error) {
                console.error('Global message handler error:', error);
            }
        });
        
        // Call specific handlers
        const handlers = this.messageHandlers.get(connectionName) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Message handler error for '${connectionName}':`, error);
            }
        });
    }
    
    addMessageHandler(connectionName, handler) {
        if (!this.messageHandlers.has(connectionName)) {
            this.messageHandlers.set(connectionName, []);
        }
        
        this.messageHandlers.get(connectionName).push(handler);
    }
    
    removeMessageHandler(connectionName, handler) {
        const handlers = this.messageHandlers.get(connectionName);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    addGlobalHandler(handler) {
        this.globalHandlers.push(handler);
    }
    
    removeGlobalHandler(handler) {
        const index = this.globalHandlers.indexOf(handler);
        if (index > -1) {
            this.globalHandlers.splice(index, 1);
        }
    }
    
    send(connectionName, data) {
        const connection = this.connections.get(connectionName);
        if (connection) {
            return connection.send(data);
        } else {
            console.warn(`WebSocket connection '${connectionName}' not found`);
            return false;
        }
    }
    
    broadcast(data, excludeConnections = []) {
        let successCount = 0;
        
        this.connections.forEach((connection, name) => {
            if (!excludeConnections.includes(name)) {
                if (connection.send(data)) {
                    successCount++;
                }
            }
        });
        
        return successCount;
    }
    
    disconnect(connectionName) {
        const connection = this.connections.get(connectionName);
        if (connection) {
            connection.close();
            this.connections.delete(connectionName);
            this.reconnectAttempts.delete(connectionName);
            this.messageHandlers.delete(connectionName);
        }
    }
    
    closeAllConnections() {
        this.connections.forEach((connection, name) => {
            connection.close();
        });
        
        this.connections.clear();
        this.reconnectAttempts.clear();
        this.messageHandlers.clear();
    }
    
    pauseConnections() {
        this.connections.forEach(connection => {
            connection.pause();
        });
    }
    
    resumeConnections() {
        this.connections.forEach(connection => {
            connection.resume();
        });
    }
    
    getConnection(name) {
        return this.connections.get(name);
    }
    
    getConnectionStatus(name) {
        const connection = this.connections.get(name);
        return connection ? connection.getStatus() : 'not_found';
    }
    
    getAllConnections() {
        return Array.from(this.connections.keys());
    }
}

class WebSocketConnection {
    constructor(name, url, options = {}) {
        this.name = name;
        this.url = url;
        this.options = {
            autoReconnect: true,
            heartbeat: true,
            heartbeatInterval: 30000,
            protocols: [],
            ...options
        };
        
        this.ws = null;
        this.status = 'disconnected';
        this.isPaused = false;
        this.heartbeatTimer = null;
        this.messageQueue = [];
        
        // Event handlers
        this.openHandlers = [];
        this.closeHandlers = [];
        this.errorHandlers = [];
        this.messageHandlers = [];
        
        // Connect immediately
        this.connect();
    }
    
    connect() {
        if (this.status === 'connected' || this.status === 'connecting') {
            return;
        }
        
        this.status = 'connecting';
        
        try {
            this.ws = new WebSocket(this.url, this.options.protocols);
            this.setupEventListeners();
        } catch (error) {
            this.status = 'error';
            this.triggerError(error);
        }
    }
    
    setupEventListeners() {
        this.ws.onopen = (event) => {
            this.status = 'connected';
            this.triggerOpen(event);
            
            // Send queued messages
            this.sendQueuedMessages();
            
            // Start heartbeat
            if (this.options.heartbeat) {
                this.startHeartbeat();
            }
        };
        
        this.ws.onclose = (event) => {
            this.status = 'disconnected';
            this.triggerClose(event);
            
            // Stop heartbeat
            this.stopHeartbeat();
        };
        
        this.ws.onerror = (error) => {
            this.status = 'error';
            this.triggerError(error);
        };
        
        this.ws.onmessage = (event) => {
            let data;
            
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                data = event.data;
            }
            
            // Handle heartbeat response
            if (data.type === 'pong') {
                return;
            }
            
            this.triggerMessage(data);
        };
    }
    
    send(data) {
        if (this.status !== 'connected') {
            // Queue message if not connected
            this.messageQueue.push(data);
            return false;
        }
        
        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error(`Failed to send message on '${this.name}':`, error);
            return false;
        }
    }
    
    sendQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (!this.send(message)) {
                // Put it back if send failed
                this.messageQueue.unshift(message);
                break;
            }
        }
    }
    
    close(code = 1000, reason = '') {
        if (this.ws) {
            this.ws.close(code, reason);
        }
        
        this.stopHeartbeat();
        this.status = 'disconnected';
    }
    
    reconnect() {
        this.close();
        
        setTimeout(() => {
            this.connect();
        }, 100);
    }
    
    pause() {
        this.isPaused = true;
        this.stopHeartbeat();
    }
    
    resume() {
        this.isPaused = false;
        
        if (this.status === 'connected' && this.options.heartbeat) {
            this.startHeartbeat();
        } else if (this.status === 'disconnected') {
            this.reconnect();
        }
    }
    
    startHeartbeat() {
        if (this.heartbeatTimer || this.isPaused) return;
        
        this.heartbeatTimer = setInterval(() => {
            if (this.status === 'connected') {
                this.send({ type: 'ping', timestamp: Date.now() });
            }
        }, this.options.heartbeatInterval);
    }
    
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    // Event handler registration
    onOpen(handler) {
        this.openHandlers.push(handler);
    }
    
    onClose(handler) {
        this.closeHandlers.push(handler);
    }
    
    onError(handler) {
        this.errorHandlers.push(handler);
    }
    
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    
    // Event triggering
    triggerOpen(event) {
        this.openHandlers.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error('Open handler error:', error);
            }
        });
    }
    
    triggerClose(event) {
        this.closeHandlers.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error('Close handler error:', error);
            }
        });
    }
    
    triggerError(error) {
        this.errorHandlers.forEach(handler => {
            try {
                handler(error);
            } catch (err) {
                console.error('Error handler error:', err);
            }
        });
    }
    
    triggerMessage(data) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('Message handler error:', error);
            }
        });
    }
    
    getStatus() {
        return this.status;
    }
    
    isConnected() {
        return this.status === 'connected';
    }
    
    getQueueSize() {
        return this.messageQueue.length;
    }
}

// Global WebSocket manager instance
const WebSocket_Manager = new WebSocketManager();

// Convenience functions for common use cases
const EditorWebSocket = {
    connect(photoId) {
        return WebSocket_Manager.connect('editor', `/ws/editor/${photoId}/`);
    },
    
    onProcessingUpdate(callback) {
        WebSocket_Manager.addMessageHandler('editor', (data) => {
            if (data.type === 'processing_update') {
                callback(data);
            }
        });
    },
    
    sendMessage(data) {
        return WebSocket_Manager.send('editor', data);
    }
};

const BatchWebSocket = {
    connect(jobId) {
        return WebSocket_Manager.connect('batch', `/ws/batch/${jobId}/`);
    },
    
    onBatchUpdate(callback) {
        WebSocket_Manager.addMessageHandler('batch', (data) => {
            if (data.type === 'batch_update') {
                callback(data);
            }
        });
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebSocketManager, WebSocketConnection, WebSocket_Manager, EditorWebSocket, BatchWebSocket };
}
