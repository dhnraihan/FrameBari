# apps/editor/management/commands/cleanup_temp_files.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import os
import glob
from django.conf import settings

class Command(BaseCommand):
    help = 'Clean up temporary files older than 24 hours'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Files older than this many hours will be deleted'
        )
    
    def handle(self, *args, **options):
        hours = options['hours']
        cutoff_time = timezone.now() - timedelta(hours=hours)
        
        # Clean up temp previews
        preview_dir = os.path.join(settings.MEDIA_ROOT, 'previews')
        if os.path.exists(preview_dir):
            for file_path in glob.glob(os.path.join(preview_dir, '*')):
                if os.path.getctime(file_path) < cutoff_time.timestamp():
                    os.remove(file_path)
                    self.stdout.write(f'Deleted: {file_path}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleanup completed for files older than {hours} hours')
        )

