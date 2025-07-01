# apps/editor/management/commands/process_pending_photos.py
from django.core.management.base import BaseCommand
from apps.editor.models import Photo
from apps.editor.tasks import process_photo_async

class Command(BaseCommand):
    help = 'Process any photos stuck in pending status'
    
    def handle(self, *args, **options):
        pending_photos = Photo.objects.filter(status='pending')
        
        for photo in pending_photos:
            self.stdout.write(f'Processing photo {photo.id}')
            process_photo_async.delay(str(photo.id))
        
        self.stdout.write(
            self.style.SUCCESS(f'Queued {pending_photos.count()} photos for processing')
        )
