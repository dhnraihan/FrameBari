# apps/monitoring/logger.py
import logging
import psutil
from django.contrib.auth.models import User
from .models import SystemMetrics, UserActivity, ErrorLog

class ActivityLogger:
    def __init__(self):
        self.logger = logging.getLogger('activity')
    
    def log_user_activity(self, user, action, request, details=None):
        """Log user activity"""
        activity = UserActivity.objects.create(
            user=user,
            action=action,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details=details or {}
        )
        
        self.logger.info(f'User {user.username} performed {action}', extra={
            'user_id': user.id,
            'action': action,
            'ip': activity.ip_address
        })
    
    def log_error(self, error, severity='medium', user=None, request=None):
        """Log application error"""
        error_log = ErrorLog.objects.create(
            severity=severity,
            error_type=type(error).__name__,
            message=str(error),
            stack_trace=self._get_stack_trace(),
            user=user,
            request_path=request.path if request else ''
        )
        
        self.logger.error(f'Error: {error}', extra={
            'error_id': error_log.id,
            'severity': severity,
            'user_id': user.id if user else None
        })
    
    def log_system_metrics(self):
        """Log system performance metrics"""
        cpu_usage = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        active_users = User.objects.filter(
            last_login__gte=timezone.now() - timedelta(minutes=30)
        ).count()
        
        # Get queue size (depends on your queue implementation)
        from celery.task.control import inspect
        i = inspect()
        queue_size = len(i.active().get('celery@worker', []))
        
        SystemMetrics.objects.create(
            cpu_usage=cpu_usage,
            memory_usage=memory.percent,
            disk_usage=disk.percent,
            active_users=active_users,
            processing_queue_size=queue_size
        )
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
    
    def _get_stack_trace(self):
        """Get current stack trace"""
        import traceback
        return traceback.format_exc()

