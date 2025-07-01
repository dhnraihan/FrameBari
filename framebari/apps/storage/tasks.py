# apps/storage/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .services import StorageService
from .models import StorageStatistics, FileStorage, StorageQuota

@shared_task
def cleanup_expired_files():
    """Clean up expired files"""
    storage_service = StorageService()
    storage_service.cleanup_expired_files()

@shared_task
def auto_cleanup_user_files():
    """Auto cleanup old files for users with auto cleanup enabled"""
    quotas = StorageQuota.objects.filter(auto_cleanup_enabled=True)
    
    for quota in quotas:
        try:
            storage_service = StorageService()
            storage_service.cleanup_user_files(quota.user, quota.cleanup_after_days)
        except Exception as e:
            print(f"Auto cleanup failed for user {quota.user.id}: {e}")

@shared_task
def generate_storage_statistics():
    """Generate daily storage statistics"""
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    # Calculate statistics
    total_files = FileStorage.objects.filter(status='stored').count()
    total_storage = FileStorage.objects.filter(status='stored').aggregate(
        total=models.Sum('file_size')
    )['total'] or 0
    
    files_uploaded = FileStorage.objects.filter(
        created_at__date=yesterday,
        status='stored'
    ).count()
    
    files_deleted = FileStorage.objects.filter(
        updated_at__date=yesterday,
        status='deleted'
    ).count()
    
    # Create or update statistics
    stats, created = StorageStatistics.objects.get_or_create(
        date=yesterday,
        defaults={
            'total_files': total_files,
            'total_storage_used': total_storage,
            'files_uploaded': files_uploaded,
            'files_deleted': files_deleted,
        }
    )
    
    if not created:
        stats.total_files = total_files
        stats.total_storage_used = total_storage
        stats.files_uploaded = files_uploaded
        stats.files_deleted = files_deleted
        stats.save()

@shared_task
def optimize_storage():
    """Optimize storage by removing duplicate files and compressing old files"""
    # Find duplicate files
    from django.db.models import Count
    
    duplicates = FileStorage.objects.values('file_hash').annotate(
        count=Count('id')
    ).filter(count__gt=1, status='stored')
    
    for duplicate in duplicates:
        files = FileStorage.objects.filter(
            file_hash=duplicate['file_hash'],
            status='stored'
        ).order_by('created_at')
        
        # Keep the oldest file, mark others as duplicates
        keep_file = files.first()
        for file_to_remove in files[1:]:
            try:
                storage_service = StorageService()
                storage_service.delete_file(file_to_remove)
            except Exception as e:
                print(f"Failed to remove duplicate {file_to_remove.id}: {e}")
