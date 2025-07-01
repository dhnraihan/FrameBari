# apps/processing/engine.py
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from rembg import remove
import base64
from io import BytesIO

class PhotoProcessor:
    def __init__(self, image_path):
        self.original = Image.open(image_path)
        self.working_image = self.original.copy()
        
    def enhance_photo(self, brightness=0, contrast=0, saturation=0, vibrance=0, exposure=0):
        """Apply basic photo enhancements"""
        img = self.working_image
        
        # Brightness
        if brightness != 0:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1 + brightness/100)
        
        # Contrast
        if contrast != 0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1 + contrast/100)
            
        # Saturation
        if saturation != 0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1 + saturation/100)
            
        # Exposure (simplified)
        if exposure != 0:
            img_array = np.array(img)
            img_array = np.clip(img_array * (1 + exposure/100), 0, 255)
            img = Image.fromarray(img_array.astype(np.uint8))
            
        self.working_image = img
        return self
    
    def remove_background(self):
        """Remove background using AI"""
        img_bytes = BytesIO()
        self.working_image.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Remove background
        result = remove(img_bytes.getvalue())
        self.working_image = Image.open(BytesIO(result))
        return self
    
    def replace_background(self, color='#0066FF', style='solid'):
        """Replace background with specified color/style"""
        if self.working_image.mode != 'RGBA':
            self.working_image = self.working_image.convert('RGBA')
            
        # Create new background
        bg = Image.new('RGBA', self.working_image.size, color)
        
        if style == 'gradient':
            bg = self._create_gradient_background(self.working_image.size, color)
        elif style == 'wave':
            bg = self._create_wave_background(self.working_image.size, color)
            
        # Composite images
        result = Image.alpha_composite(bg, self.working_image)
        self.working_image = result.convert('RGB')
        return self
    
    def _create_gradient_background(self, size, base_color):
        """Create gradient background"""
        width, height = size
        gradient = Image.new('RGBA', size)
        
        # Convert hex to RGB
        base_rgb = tuple(int(base_color[i:i+2], 16) for i in (1, 3, 5))
        
        for y in range(height):
            alpha = int(255 * (y / height))
            color = base_rgb + (alpha,)
            for x in range(width):
                gradient.putpixel((x, y), color)
                
        return gradient
    
    def _create_wave_background(self, size, base_color):
        """Create wave pattern background"""
        width, height = size
        wave_bg = Image.new('RGBA', size)
        
        base_rgb = tuple(int(base_color[i:i+2], 16) for i in (1, 3, 5))
        
        for y in range(height):
            for x in range(width):
                wave = int(50 * np.sin(x * 0.02) * np.cos(y * 0.02))
                alpha = max(0, min(255, 200 + wave))
                color = base_rgb + (alpha,)
                wave_bg.putpixel((x, y), color)
                
        return wave_bg
    
    def detect_subjects(self):
        """Detect and segment subjects in the image"""
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(self.working_image), cv2.COLOR_RGB2BGR)
        
        # Simple contour detection (you'd replace this with proper AI models)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        subjects = []
        for i, contour in enumerate(contours):
            if cv2.contourArea(contour) > 1000:  # Filter small objects
                x, y, w, h = cv2.boundingRect(contour)
                
                # Create mask
                mask = np.zeros(gray.shape, np.uint8)
                cv2.drawContours(mask, [contour], -1, 255, -1)
                
                # Encode mask as base64
                _, buffer = cv2.imencode('.png', mask)
                mask_b64 = base64.b64encode(buffer).decode('utf-8')
                
                subjects.append({
                    'type': 'object',
                    'mask': mask_b64,
                    'bbox': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                    'confidence': 0.8
                })
                
        return subjects
    
    def optimize_for_web(self, quality=85, format='JPEG'):
        """Optimize image for web"""
        if format.upper() == 'WEBP':
            self.working_image = self.working_image.convert('RGB')
            
        return self
    
    def save(self, output_path, quality=85, format='JPEG'):
        """Save the processed image"""
        save_kwargs = {'format': format}
        if format.upper() in ['JPEG', 'WEBP']:
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True
            
        self.working_image.save(output_path, **save_kwargs)
        return output_path
