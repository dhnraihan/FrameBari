# apps/monitoring/admin.py
from django.contrib import admin
from .models import SystemMetrics, UserActivity, ErrorLog

@admin.register(SystemMetrics)
class SystemMetricsAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'cpu_usage', 'memory_usage', 'disk_usage', 
                   'active_users', 'processing_queue_size']
    list_filter = ['timestamp']
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation

@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'timestamp', 'ip_address']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False

@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'severity', 'error_type', 'user', 'resolved']
    list_filter: list[str] = ['severity', 'resolved', 'timestamp']
    search_fields = ['error_type', 'message', 'user__username']
    readonly_fields = ['timestamp']
    
    actions = ['mark_as_resolved']
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(resolved=True)
    mark_as_resolved.short_description = 'Mark selected errors as resolved'
