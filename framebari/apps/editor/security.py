# apps/editor/security.py
from django.core.exceptions import ValidationError
from django.conf import settings
from PIL import Image
import magic
import hashlib
import os

class SecurityValidator:
    ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/tiff'
    ]
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    MAX_DIMENSIONS = (8000, 8000)
    
    def validate_upload(self, uploaded_file):
        """Comprehensive file validation"""
        # Check file size
        if uploaded_file.size > self.MAX_FILE_SIZE:
            raise ValidationError(f'File too large. Maximum size is {self.MAX_FILE_SIZE // (1024*1024)}MB')
        
        # Check MIME type
        mime_type = magic.from_buffer(uploaded_file.read(1024), mime=True)
        uploaded_file.seek(0)
        
        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise ValidationError(f'Invalid file type: {mime_type}')
        
        # Check image validity and dimensions
        try:
            with Image.open(uploaded_file) as img:
                if img.width > self.MAX_DIMENSIONS[0] or img.height > self.MAX_DIMENSIONS[1]:
                    raise ValidationError(f'Image too large. Maximum dimensions: {self.MAX_DIMENSIONS}')
                
                # Verify image integrity
                img.verify()
        except Exception as e:
            raise ValidationError('Invalid or corrupted image file')
        
        # Reset file pointer
        uploaded_file.seek(0)
        
        return True
    
    def sanitize_filename(self, filename):
        """Sanitize uploaded filename"""
        # Remove path components
        filename = os.path.basename(filename)
        
        # Generate safe filename
        name, ext = os.path.splitext(filename)
        safe_name = ''.join(c for c in name if c.isalnum() or c in '-_')[:50]
        
        # Add timestamp hash for uniqueness
        timestamp_hash = hashlib.md5(str(timezone.now()).encode()).hexdigest()[:8]
        
        return f"{safe_name}_{timestamp_hash}{ext}"

