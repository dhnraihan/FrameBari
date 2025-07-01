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

