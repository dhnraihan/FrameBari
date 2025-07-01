// static/js/dashboard.js
class Dashboard {
    constructor() {
        this.charts = {};
        this.photos = [];
        this.selectedPhotos = new Set();
        this.viewMode = 'grid';
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        this.filterBy = 'all';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadUserStats();
        this.loadRecentPhotos();
        this.setupPhotoGrid();
        this.initializeCharts();
        this.setupUploadArea();
    }
    
    setupEventListeners() {
        // View mode toggle
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setViewMode(e.target.dataset.mode);
            });
        });
        
        // Sort controls
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.setSortBy(e.target.value);
        });
        
        // Filter controls
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // Bulk actions
        document.getElementById('select-all')?.addEventListener('change', (e) => {
            this.selectAll(e.target.checked);
        });
        
        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.bulkDelete();
        });
        
        document.getElementById('bulk-download')?.addEventListener('click', () => {
            this.bulkDownload();
        });
        
        // Search
        const searchInput = document.getElementById('photo-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchPhotos(e.target.value);
            }, 300));
        }
        
        // Refresh button
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.refresh();
        });
        
        // Upload button
        document.getElementById('upload-btn')?.addEventListener('click', () => {
            document.getElementById('file-input')?.click();
        });
    }
    
    async loadUserStats() {
        try {
            const response = await API.get('/api/v1/dashboard/stats/');
            
            if (response.success) {
                this.updateStatsCards(response.data);
                this.updateUsageProgress(response.data);
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }
    
    updateStatsCards(data) {
        const cards = {
            'total-photos': data.total_photos,
            'processed-photos': data.processed_photos,
            'storage-used': `${(data.storage_used / (1024*1024*1024)).toFixed(2)} GB`,
            'this-month': data.photos_this_month
        };
        
        Object.entries(cards).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.classList.add('animate-count');
            }
        });
    }
    
    updateUsageProgress(data) {
        // Update storage progress
        const storageProgress = document.getElementById('storage-progress');
        if (storageProgress) {
            const percentage = (data.storage_used / data.storage_limit) * 100;
            storageProgress.style.width = `${percentage}%`;
            
            // Add warning class if near limit
            if (percentage > 80) {
                storageProgress.classList.add('bg-warning');
            } else if (percentage > 90) {
                storageProgress.classList.add('bg-danger');
            }
        }
        
        // Update monthly usage progress
        const monthlyProgress = document.getElementById('monthly-progress');
        if (monthlyProgress) {
            const percentage = (data.photos_this_month / data.monthly_limit) * 100;
            monthlyProgress.style.width = `${percentage}%`;
        }
    }
    
    async loadRecentPhotos() {
        try {
            const response = await API.get('/api/v1/photos/?limit=20&ordering=-created_at');
            
            if (response.success) {
                this.photos = response.results;
                this.renderPhotoGrid();
            }
        } catch (error) {
            console.error('Failed to load photos:', error);
        }
    }
    
    setupPhotoGrid() {
        const grid = document.getElementById('photo-grid');
        if (!grid) return;
        
        // Enable drag and drop
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            grid.classList.add('drag-over');
        });
        
        grid.addEventListener('dragleave', () => {
            grid.classList.remove('drag-over');
        });
        
        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            grid.classList.remove('drag-over');
            this.handleFileDrop(e.dataTransfer.files);
        });
    }
    
    renderPhotoGrid() {
        const grid = document.getElementById('photo-grid');
        if (!grid) return;
        
        // Filter and sort photos
        let filteredPhotos = this.filterPhotos(this.photos);
        filteredPhotos = this.sortPhotos(filteredPhotos);
        
        if (filteredPhotos.length === 0) {
            grid.innerHTML = this.renderEmptyState();
            return;
        }
        
        const photosHTML = filteredPhotos.map(photo => {
            return this.renderPhotoCard(photo);
        }).join('');
        
        grid.innerHTML = photosHTML;
        
        // Setup photo card events
        this.setupPhotoCardEvents();
        
        // Update photo count
        this.updatePhotoCount(filteredPhotos.length);
    }
    
    renderPhotoCard(photo) {
        const isSelected = this.selectedPhotos.has(photo.id);
        const statusClass = this.getStatusClass(photo.status);
        const thumbnailUrl = photo.thumbnail || photo.original_image;
        
        return `
            <div class="photo-card ${this.viewMode === 'list' ? 'list-view' : ''}" 
                 data-photo-id="${photo.id}">
                <div class="photo-thumbnail">
                    <img src="${thumbnailUrl}" alt="Photo" loading="lazy">
                    <div class="photo-overlay">
                        <div class="photo-actions">
                            <button class="btn btn-sm btn-primary edit-btn" 
                                    data-photo-id="${photo.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-success download-btn" 
                                    data-photo-id="${photo.id}" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-btn" 
                                    data-photo-id="${photo.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="photo-select">
                            <input type="checkbox" class="photo-checkbox" 
                                   data-photo-id="${photo.id}" ${isSelected ? 'checked' : ''}>
                        </div>
                    </div>
                </div>
                <div class="photo-info">
                    <div class="photo-title">${photo.filename || 'Untitled'}</div>
                    <div class="photo-meta">
                        <span class="photo-date">${Utils.formatDate(photo.created_at)}</span>
                        <span class="photo-size">${Utils.formatFileSize(photo.file_size)}</span>
                        <span class="photo-status status-${photo.status}">${photo.status}</span>
                    </div>
                    ${this.viewMode === 'list' ? this.renderPhotoDetails(photo) : ''}
                </div>
            </div>
        `;
    }
    
    renderPhotoDetails(photo) {
        return `
            <div class="photo-details">
                <div class="detail-item">
                    <span class="label">Dimensions:</span>
                    <span class="value">${photo.width} × ${photo.height}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Format:</span>
                    <span class="value">${photo.format}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Project:</span>
                    <span class="value">${photo.project_name}</span>
                </div>
            </div>
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-images"></i>
                </div>
                <h3>No photos found</h3>
                <p>Upload your first photo to get started!</p>
                <button class="btn btn-primary" onclick="document.getElementById('file-input').click()">
                    <i class="fas fa-upload"></i> Upload Photos
                </button>
            </div>
        `;
    }
    
    setupPhotoCardEvents() {
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.editPhoto(photoId);
            });
        });
        
        // Download buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.downloadPhoto(photoId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.deletePhoto(photoId);
            });
        });
        
        // Checkboxes
        document.querySelectorAll('.photo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const photoId = e.target.dataset.photoId;
                this.togglePhotoSelection(photoId, e.target.checked);
            });
        });
        
        // Photo cards (double-click to edit)
        document.querySelectorAll('.photo-card').forEach(card => {
            card.addEventListener('dblclick', () => {
                const photoId = card.dataset.photoId;
                this.editPhoto(photoId);
            });
        });
    }
    
    filterPhotos(photos) {
        if (this.filterBy === 'all') return photos;
        
        return photos.filter(photo => {
            switch (this.filterBy) {
                case 'processed':
                    return photo.status === 'completed';
                case 'pending':
                    return photo.status === 'pending';
                case 'processing':
                    return photo.status === 'processing';
                case 'failed':
                    return photo.status === 'failed';
                default:
                    return true;
            }
        });
    }
    
    sortPhotos(photos) {
        return photos.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];
            
            // Handle dates
            if (this.sortBy.includes('_at')) {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (this.sortOrder === 'desc') {
                return bValue > aValue ? 1 : -1;
            } else {
                return aValue > bValue ? 1 : -1;
            }
        });
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        
        // Update buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
        
        // Update grid class
        const grid = document.getElementById('photo-grid');
        if (grid) {
            grid.className = `photo-grid ${mode}-view`;
        }
        
        this.renderPhotoGrid();
    }
    
    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.renderPhotoGrid();
    }
    
    setFilter(filter) {
        this.filterBy = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
        
        this.renderPhotoGrid();
    }
    
    async searchPhotos(query) {
        if (!query.trim()) {
            await this.loadRecentPhotos();
            return;
        }
        
        try {
            const response = await API.get(`/api/v1/photos/?search=${encodeURIComponent(query)}`);
            
            if (response.success) {
                this.photos = response.results;
                this.renderPhotoGrid();
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }
    
    togglePhotoSelection(photoId, selected) {
        if (selected) {
            this.selectedPhotos.add(photoId);
        } else {
            this.selectedPhotos.delete(photoId);
        }
        
        this.updateBulkActions();
    }
    
    selectAll(selected) {
        const checkboxes = document.querySelectorAll('.photo-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selected;
            this.togglePhotoSelection(checkbox.dataset.photoId, selected);
        });
    }
    
    updateBulkActions() {
        const selectedCount = this.selectedPhotos.size;
        const bulkActions = document.getElementById('bulk-actions');
        
        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'block' : 'none';
        }
        
        const selectedCountElement = document.getElementById('selected-count');
        if (selectedCountElement) {
            selectedCountElement.textContent = selectedCount;
        }
    }
    
    async bulkDelete() {
        if (this.selectedPhotos.size === 0) return;
        
        const confirmed = await ModalManager.confirm(
            'Delete Photos',
            `Are you sure you want to delete ${this.selectedPhotos.size} photo(s)?`
        );
        
        if (!confirmed) return;
        
        try {
            const response = await API.post('/api/v1/photos/bulk-delete/', {
                photo_ids: Array.from(this.selectedPhotos)
            });
            
            if (response.success) {
                NotificationManager.showSuccess(`${this.selectedPhotos.size} photos deleted`);
                this.selectedPhotos.clear();
                this.updateBulkActions();
                await this.loadRecentPhotos();
            }
        } catch (error) {
            console.error('Bulk delete failed:', error);
            NotificationManager.showError('Failed to delete photos');
        }
    }
    
    async bulkDownload() {
        if (this.selectedPhotos.size === 0) return;
        
        try {
            const response = await API.post('/api/v1/photos/bulk-download/', {
                photo_ids: Array.from(this.selectedPhotos)
            });
            
            if (response.success) {
                // Trigger download
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                NotificationManager.showSuccess('Photos download started');
            }
        } catch (error) {
            console.error('Bulk download failed:', error);
            NotificationManager.showError('Failed to download photos');
        }
    }
    
    editPhoto(photoId) {
        window.location.href = `/editor/${photoId}/`;
    }
    
    async downloadPhoto(photoId) {
        try {
            const response = await API.get(`/api/v1/photos/${photoId}/download/`);
            
            if (response.download_url) {
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Download failed:', error);
            NotificationManager.showError('Download failed');
        }
    }
    
    async deletePhoto(photoId) {
        const confirmed = await ModalManager.confirm(
            'Delete Photo',
            'Are you sure you want to delete this photo?'
        );
        
        if (!confirmed) return;
        
        try {
            const response = await API.delete(`/api/v1/photos/${photoId}/`);
            
            if (response.success) {
                NotificationManager.showSuccess('Photo deleted');
                await this.loadRecentPhotos();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            NotificationManager.showError('Failed to delete photo');
        }
    }
    
    setupUploadArea() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (!uploadArea || !fileInput) return;
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files);
            }
        });
        
        // Drag and drop
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileDrop(e.dataTransfer.files);
        });
    }
    
    handleFileDrop(files) {
        this.handleFileUpload(files);
    }
    
    async handleFileUpload(files) {
        const validFiles = Array.from(files).filter(file => {
            return file.type.startsWith('image/');
        });
        
        if (validFiles.length === 0) {
            NotificationManager.showWarning('Please select valid image files');
            return;
        }
        
        for (const file of validFiles) {
            await this.uploadSingleFile(file);
        }
        
        // Refresh photos
        await this.loadRecentPhotos();
    }
    
    async uploadSingleFile(file) {
        try {
            const formData = new FormData();
            formData.append('photo', file);
            
            const response = await API.post('/editor/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.success) {
                NotificationManager.showSuccess(`${file.name} uploaded successfully`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            NotificationManager.showError(`Failed to upload ${file.name}`);
        }
    }
    
    initializeCharts() {
        this.initUsageChart();
        this.initActivityChart();
    }
    
    initUsageChart() {
        const ctx = document.getElementById('usage-chart');
        if (!ctx) return;
        
        this.charts.usage = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Used', 'Available'],
                datasets: [{
                    data: [70, 30],
                    backgroundColor: ['#007bff', '#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    initActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;
        
        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Photos Processed',
                    data: [12, 19, 3, 5, 2, 3, 9],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    async refresh() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
        }
        
        try {
            await Promise.all([
                this.loadUserStats(),
                this.loadRecentPhotos()
            ]);
            
            NotificationManager.showSuccess('Dashboard refreshed');
        } catch (error) {
            console.error('Refresh failed:', error);
            NotificationManager.showError('Failed to refresh dashboard');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
            }
        }
    }
    
    updatePhotoCount(count) {
        const countElement = document.getElementById('photo-count');
        if (countElement) {
            countElement.textContent = `${count} photo${count !== 1 ? 's' : ''}`;
        }
    }
    
    getStatusClass(status) {
        const statusClasses = {
            'pending': 'text-warning',
            'processing': 'text-info',
            'completed': 'text-success',
            'failed': 'text-danger'
        };
        
        return statusClasses[status] || 'text-muted';
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-container')) {
        window.dashboard = new Dashboard();
    }
});
