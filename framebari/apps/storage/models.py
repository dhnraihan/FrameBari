#  apps/storage/models.py
from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import os
import hashlib

class StorageProvider(models.Model):
    PROVIDER_TYPES = [
        ('local', 'Local Storage'),
        ('s3', 'Amazon S3'),
        ('gcs', 'Google Cloud Storage'),
        ('azure', 'Azure Blob Storage'),
        ('cloudinary', 'Cloudinary'),
    ]
    
    name = models.CharField(max_length=100)
    provider_type = models.CharField(max_length=20, choices=PROVIDER_TYPES)
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False)
    
    # Configuration
    config = models.JSONField(default=dict)
    
    # Limits
    max_file_size = models.BigIntegerField(default=50 * 1024 * 1024)  # 50MB
    allowed_formats = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"
    
    class Meta:
        db_table = 'storage_providers'

class FileStorage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('uploading', 'Uploading'),
        ('stored', 'Stored'),
        ('failed', 'Failed'),
        ('deleted', 'Deleted'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    provider = models.ForeignKey(StorageProvider, on_delete=models.CASCADE)
    
    # File information
    original_filename = models.CharField(max_length=255)
    stored_filename = models.CharField(max_length=255)
    file_path = models.TextField()
    file_size = models.BigIntegerField()
    content_type = models.CharField(max_length=100)
    
    # File hash for deduplication
    file_hash = models.CharField(max_length=64, db_index=True)
    
    # Metadata
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    upload_progress = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    accessed_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.original_filename} ({self.get_status_display()})"
    
    @property
    def url(self):
        """Get the public URL for this file"""
        from .services import StorageService
        storage_service = StorageService()
        return storage_service.get_file_url(self)
    
    @property
    def is_expired(self):
        """Check if file has expired"""
        return self.expires_at and timezone.now() > self.expires_at
    
    def mark_accessed(self):
        """Update access timestamp"""
        self.accessed_at = timezone.now()
        self.save(update_fields=['accessed_at'])
    
    class Meta:
        db_table = 'file_storage'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]

class StorageQuota(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # Quota limits (in bytes)
    total_quota = models.BigIntegerField(default=1024 * 1024 * 1024)  # 1GB
    used_storage = models.BigIntegerField(default=0)
    
    # File count limits
    max_files = models.PositiveIntegerField(default=1000)
    file_count = models.PositiveIntegerField(default=0)
    
    # Bandwidth limits (in bytes)
    monthly_bandwidth_limit = models.BigIntegerField(default=10 * 1024 * 1024 * 1024)  # 10GB
    monthly_bandwidth_used = models.BigIntegerField(default=0)
    bandwidth_reset_date = models.DateField(default=timezone.now)
    
    # Auto-cleanup settings
    auto_cleanup_enabled = models.BooleanField(default=True)
    cleanup_after_days = models.PositiveIntegerField(default=30)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Quota for {self.user.username}"
    
    @property
    def usage_percentage(self):
        """Calculate storage usage percentage"""
        if self.total_quota == 0:
            return 0
        return (self.used_storage / self.total_quota) * 100
    
    @property
    def available_storage(self):
        """Get available storage in bytes"""
        return max(0, self.total_quota - self.used_storage)
    
    @property
    def bandwidth_usage_percentage(self):
        """Calculate bandwidth usage percentage"""
        if self.monthly_bandwidth_limit == 0:
            return 0
        return (self.monthly_bandwidth_used / self.monthly_bandwidth_limit) * 100
    
    def can_upload_file(self, file_size):
        """Check if user can upload a file of given size"""
        return (self.used_storage + file_size) <= self.total_quota and \
               self.file_count < self.max_files
    
    def update_usage(self, size_delta, count_delta=0):
        """Update storage usage"""
        self.used_storage = max(0, self.used_storage + size_delta)
        self.file_count = max(0, self.file_count + count_delta)
        self.save(update_fields=['used_storage', 'file_count', 'updated_at'])
    
    def reset_bandwidth_if_needed(self):
        """Reset bandwidth usage if month has passed"""
        today = timezone.now().date()
        if today >= self.bandwidth_reset_date + timedelta(days=30):
            self.monthly_bandwidth_used = 0
            self.bandwidth_reset_date = today
            self.save(update_fields=['monthly_bandwidth_used', 'bandwidth_reset_date'])
    
    class Meta:
        db_table = 'storage_quotas'

class FileVersion(models.Model):
    file_storage = models.ForeignKey(FileStorage, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    
    # Version-specific information
    stored_filename = models.CharField(max_length=255)
    file_path = models.TextField()
    file_size = models.BigIntegerField()
    file_hash = models.CharField(max_length=64)
    
    # Processing information
    processing_settings = models.JSONField(default=dict)
    created_by_operation = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.file_storage.original_filename} v{self.version_number}"
    
    class Meta:
        db_table = 'file_versions'
        unique_together = ['file_storage', 'version_number']
        ordering = ['-version_number']

class StorageStatistics(models.Model):
    date = models.DateField(unique=True)
    
    # File statistics
    total_files = models.PositiveIntegerField(default=0)
    total_storage_used = models.BigIntegerField(default=0)
    files_uploaded = models.PositiveIntegerField(default=0)
    files_deleted = models.PositiveIntegerField(default=0)
    
    # Bandwidth statistics
    total_bandwidth = models.BigIntegerField(default=0)
    upload_bandwidth = models.BigIntegerField(default=0)
    download_bandwidth = models.BigIntegerField(default=0)
    
    # Performance statistics
    avg_upload_time = models.FloatField(default=0)
    avg_download_time = models.FloatField(default=0)
    error_rate = models.FloatField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'storage_statistics'
        ordering = ['-date']
