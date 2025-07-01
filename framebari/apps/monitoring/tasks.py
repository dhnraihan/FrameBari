# apps/monitoring/tasks.py
from celery import shared_task
from .logger import ActivityLogger
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def collect_system_metrics():
    """Collect system metrics periodically"""
    logger = ActivityLogger()
    logger.log_system_metrics()

@shared_task
def send_error_notifications():
    """Send notifications for critical errors"""
    critical_errors = ErrorLog.objects.filter(
        severity='critical',
        resolved=False,
        timestamp__gte=timezone.now() - timedelta(hours=1)
    )
    
    if critical_errors:
        subject = f'[CRITICAL] {critical_errors.count()} critical errors in photo editor'
        message = '\n'.join([f'- {error.message}' for error in critical_errors])
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.ADMIN_EMAIL],
            fail_silently=False,
        )

