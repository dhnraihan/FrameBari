# apps/processing/batch_processor.py
from celery import group
from django.core.files.storage import default_storage
import zipfile
import tempfile
import os
from .engine import PhotoProcessor
from .color_grading import ColorGradingEngine
from .background_engine import AdvancedBackgroundEngine

class BatchProcessor:
    def __init__(self):
        self.color_engine = ColorGradingEngine()
        self.background_engine = AdvancedBackgroundEngine()
    
    def process_batch(self, photo_ids, settings):
        """Process multiple photos with same settings"""
        from .tasks import process_single_photo_batch
        
        # Create group of tasks
        job = group(
            process_single_photo_batch.s(photo_id, settings) 
            for photo_id in photo_ids
        )
        
        result = job.apply_async()
        return result.id
    
    def create_download_zip(self, processed_photos):
        """Create ZIP file with processed photos"""
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, 'processed_photos.zip')
        
        with zipfile.ZipFile(zip_path, 'w') as zip_file:
            for photo in processed_photos:
                if photo.processed_image:
                    # Add to zip with original filename
                    original_name = os.path.basename(photo.original_image.name)
                    name_parts = original_name.rsplit('.', 1)
                    processed_name = f"{name_parts[0]}_processed.{name_parts[1]}"
                    
                    zip_file.write(photo.processed_image.path, processed_name)
        
        return zip_path

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
