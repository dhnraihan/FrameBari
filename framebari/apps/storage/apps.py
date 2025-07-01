# apps/storage/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import StorageProvider, FileStorage, StorageQuota, FileVersion, StorageStatistics

@admin.register(StorageProvider)
class StorageProviderAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider_type', 'is_active', 'is_primary', 'created_at']
    list_filter = ['provider_type', 'is_active', 'is_primary']
    search_fields = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'provider_type', 'is_active', 'is_primary')
        }),
        ('Configuration', {
            'fields': ('config', 'max_file_size', 'allowed_formats'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FileStorage)
class FileStorageAdmin(admin.ModelAdmin):
    list_display = [
        'original_filename', 'user', 'provider', 'file_size_mb', 
        'status', 'created_at', 'file_preview'
    ]
    list_filter = ['status', 'provider', 'content_type', 'created_at']
    search_fields = ['original_filename', 'user__username', 'file_hash']
    readonly_fields = ['file_hash', 'created_at', 'updated_at']
    
    fieldsets = (
        ('File Information', {
            'fields': ('user', 'provider', 'original_filename', 'stored_filename')
        }),
        ('Storage Details', {
            'fields': ('file_path', 'file_size', 'content_type', 'file_hash')
        }),
        ('Image Metadata', {
            'fields': ('width', 'height', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'upload_progress', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'accessed_at', 'expires_at'),
            'classes': ('collapse',)
        }),
    )
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024*1024):.2f} MB"
    file_size_mb.short_description = 'Size'
    
    def file_preview(self, obj):
        if obj.content_type and obj.content_type.startswith('image/'):
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;">',
                obj.url
            )
        return "No preview"
    file_preview.short_description = 'Preview'

@admin.register(StorageQuota)
class StorageQuotaAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'usage_display', 'file_count', 'max_files', 
        'bandwidth_usage', 'auto_cleanup_enabled'
    ]
    list_filter = ['auto_cleanup_enabled']
    search_fields = ['user__username', 'user__email']
    
    def usage_display(self, obj):
        percentage = obj.usage_percentage
        color = 'green' if percentage < 80 else 'orange' if percentage < 95 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}% ({} / {} MB)</span>',
            color,
            percentage,
            obj.used_storage // (1024*1024),
            obj.total_quota // (1024*1024)
        )
    usage_display.short_description = 'Storage Usage'
    
    def bandwidth_usage(self, obj):
        percentage = obj.bandwidth_usage_percentage
        return f"{percentage:.1f}% ({obj.monthly_bandwidth_used // (1024*1024)} MB)"
    bandwidth_usage.short_description = 'Bandwidth Usage'

@admin.register(FileVersion)
class FileVersionAdmin(admin.ModelAdmin):
    list_display = [
        'file_storage', 'version_number', 'file_size_mb', 
        'created_by_operation', 'created_at'
    ]
    list_filter = ['created_by_operation', 'created_at']
    search_fields = ['file_storage__original_filename']
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024*1024):.2f} MB"
    file_size_mb.short_description = 'Size'

@admin.register(StorageStatistics)
class StorageStatisticsAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_files', 'total_storage_gb', 'files_uploaded', 
        'files_deleted', 'total_bandwidth_gb'
    ]
    list_filter = ['date']
    readonly_fields = ['date']
    
    def total_storage_gb(self, obj):
        return f"{obj.total_storage_used / (1024*1024*1024):.2f} GB"
    total_storage_gb.short_description = 'Total Storage'
    
    def total_bandwidth_gb(self, obj):
        return f"{obj.total_bandwidth / (1024*1024*1024):.2f} GB"
    total_bandwidth_gb.short_description = 'Total Bandwidth'
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation
