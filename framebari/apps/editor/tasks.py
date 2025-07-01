# apps/editor/tasks.py
from celery import shared_task
from .models import Photo
from apps.processing.engine import PhotoProcessor
from PIL import Image

@shared_task
def process_photo_async(photo_id):
    try:
        photo = Photo.objects.get(id=photo_id)
        photo.status = 'processing'
        photo.save()
        
        # Get image dimensions
        with Image.open(photo.original_image.path) as img:
            photo.width = img.width
            photo.height = img.height
            photo.save()
        
        # Create thumbnail
        processor = PhotoProcessor(photo.original_image.path)
        processor.working_image.thumbnail((300, 300), Image.Resampling.LANCZOS)
        
        thumbnail_path = f"thumbnails/{photo.id}_thumb.jpg"
        processor.save(thumbnail_path, quality=80)
        photo.thumbnail = thumbnail_path
        
        # Detect subjects
        subjects = processor.detect_subjects()
        
        photo.status = 'completed'
        photo.processing_progress = 100
        photo.save()
        
        return f"Successfully processed photo {photo_id}"
        
    except Exception as e:
        photo.status = 'failed'
        photo.save()
        return f"Failed to process photo {photo_id}: {str(e)}"
