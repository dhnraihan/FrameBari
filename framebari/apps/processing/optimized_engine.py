# apps/processing/optimized_engine.py
from django.core.cache import cache
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
import io

class OptimizedPhotoProcessor:
    def __init__(self, image_path, max_preview_size=(800, 600)):
        self.image_path = image_path
        self.max_preview_size = max_preview_size
        self.cache = PhotoCache()
        
    def get_optimized_preview(self, settings):
        """Get optimized preview with caching"""
        # Check cache first
        cached_url = self.cache.get_preview(self.image_path, settings)
        if cached_url:
            return cached_url
        
        # Generate preview
        preview_url = self._generate_preview(settings)
        
        # Cache result
        self.cache.set_preview(self.image_path, settings, preview_url)
        
        return preview_url
    
    def _generate_preview(self, settings):
        """Generate optimized preview image"""
        with Image.open(self.image_path) as img:
            # Resize for faster processing
            img.thumbnail(self.max_preview_size, Image.Resampling.LANCZOS)
            
            # Apply effects
            processed = self._apply_effects_optimized(img, settings)
            
            # Save preview
            preview_buffer = io.BytesIO()
            processed.save(preview_buffer, format='JPEG', quality=70, optimize=True)
            
            # Save to storage and return URL
            # Implementation depends on your storage backend
            return self._save_preview_to_storage(preview_buffer)
    
    def _apply_effects_optimized(self, image, settings):
        """Apply effects with optimizations"""
        # Use numpy arrays for faster operations
        img_array = np.array(image)
        
        # Apply brightness/contrast in one operation
        if settings.get('brightness', 0) != 0 or settings.get('contrast', 0) != 0:
            brightness = settings.get('brightness', 0) / 100.0
            contrast = settings.get('contrast', 0) / 100.0 + 1.0
            
            img_array = img_array * contrast + brightness * 255
            img_array = np.clip(img_array, 0, 255)
        
        return Image.fromarray(img_array.astype(np.uint8))

