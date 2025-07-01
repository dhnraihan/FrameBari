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

# apps/editor/tasks.py (additional task)
@shared_task
def process_single_photo_batch(photo_id, settings):
    """Process single photo in batch"""
    try:
        photo = Photo.objects.get(id=photo_id)
        
        processor = PhotoProcessor(photo.original_image.path)
        
        # Apply all settings
        processor.enhance_photo(
            brightness=settings.get('brightness', 0),
            contrast=settings.get('contrast', 0),
            saturation=settings.get('saturation', 0),
            vibrance=settings.get('vibrance', 0),
            exposure=settings.get('exposure', 0)
        )
        
        # Apply color grading if specified
        if settings.get('color_grade'):
            color_engine = ColorGradingEngine()
            processor.working_image = color_engine.apply_lut(
                processor.working_image,
                settings['color_grade'],
                settings.get('grade_intensity', 1.0)
            )
        
        # Apply background replacement if specified
        if settings.get('replace_background'):
            processor.remove_background()
            
            bg_engine = AdvancedBackgroundEngine()
            processor.working_image = bg_engine.replace_background(
                processor.working_image,
                None,  # Mask already applied
                settings.get('background_style', 'blue_default')
            )
        
        # Save result
        output_path = f"batch_processed/{photo.id}_batch.jpg"
        full_path = default_storage.path(output_path)
        processor.save(full_path, quality=settings.get('quality', 85))
        
        photo.processed_image = output_path
        photo.status = 'completed'
        photo.save()
        
        return f"Successfully processed {photo_id}"
        
    except Exception as e:
        return f"Failed to process {photo_id}: {str(e)}"
