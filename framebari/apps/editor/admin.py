# apps/editor/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Project, Photo, EditingSettings, DetectedSubject

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'photo_count', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    def photo_count(self, obj):
        return obj.photo_set.count()
    photo_count.short_description = 'Photos'

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'project_name', 'user', 'thumbnail_preview', 
        'status', 'format', 'file_size_mb', 'created_at'
    ]
    list_filter = ['status', 'format', 'created_at']
    search_fields = ['project__name', 'project__user__username']
    readonly_fields = [
        'id', 'width', 'height', 'file_size', 'format', 
        'created_at', 'thumbnail_preview', 'original_preview'
    ]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('project', 'status', 'processing_progress')
        }),
        ('Images', {
            'fields': ('original_image', 'original_preview', 'processed_image', 
                      'thumbnail', 'thumbnail_preview')
        }),
        ('Metadata', {
            'fields': ('width', 'height', 'file_size', 'format', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def project_name(self, obj):
        return obj.project.name
    project_name.short_description = 'Project'
    
    def user(self, obj):
        return obj.project.user.username
    user.short_description = 'User'
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024*1024):.2f} MB"
    file_size_mb.short_description = 'Size'
    
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;">',
                obj.thumbnail.url
            )
        return "No thumbnail"
    thumbnail_preview.short_description = 'Thumbnail'
    
    def original_preview(self, obj):
        if obj.original_image:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;">',
                obj.original_image.url
            )
        return "No image"
    original_preview.short_description = 'Original Image'

@admin.register(EditingSettings)
class EditingSettingsAdmin(admin.ModelAdmin):
    list_display = ['photo', 'brightness', 'contrast', 'saturation', 'background_color']
    list_filter = ['output_format', 'background_style']
    search_fields = ['photo__project__name']

@admin.register(DetectedSubject)
class DetectedSubjectAdmin(admin.ModelAdmin):
    list_display = ['photo', 'subject_type', 'confidence', 'bounding_box_info']
    list_filter = ['subject_type']
    search_fields = ['photo__project__name']
    
    def bounding_box_info(self, obj):
        bbox = obj.bounding_box
        return f"({bbox['x']}, {bbox['y']}) {bbox['width']}x{bbox['height']}"
    bounding_box_info.short_description = 'Bounding Box'

