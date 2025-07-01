# apps/processing/background_engine.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import cv2
import math

class AdvancedBackgroundEngine:
    def __init__(self):
        self.styles = {
            'blue_default': self._create_solid_blue,
            'blue_neon': self._create_neon_blue,
            'blue_wave': self._create_wave_blue,
            'blue_metallic': self._create_metallic_blue,
            'blue_gradient': self._create_gradient_blue,
            'abstract_geometric': self._create_geometric,
            'studio_light': self._create_studio_lighting,
            'bokeh': self._create_bokeh_effect
        }
    
    def replace_background(self, image, mask, style='blue_default', **kwargs):
        """Replace background with specified style"""
        if style not in self.styles:
            style = 'blue_default'
        
        # Create background
        background = self.styles[style](image.size, **kwargs)
        
        # Apply mask
        result = self._composite_with_mask(image, background, mask)
        
        # Apply edge refinement
        result = self._refine_edges(result, mask)
        
        return result
    
    def _create_solid_blue(self, size, color='#0066FF', **kwargs):
        """Create solid blue background"""
        return Image.new('RGB', size, color)
    
    def _create_neon_blue(self, size, **kwargs):
        """Create neon blue background with glow effect"""
        width, height = size
        background = Image.new('RGB', size, '#001122')
        
        # Create neon lines
        draw = ImageDraw.Draw(background)
        
        for i in range(0, width, 50):
            # Vertical neon lines
            line_color = f"#{i%255:02x}{100 + i%155:02x}FF"
            draw.line([(i, 0), (i, height)], fill=line_color, width=2)
        
        # Apply blur for glow effect
        background = background.filter(ImageFilter.GaussianBlur(radius=3))
        
        return background
    
    def _create_wave_blue(self, size, **kwargs):
        """Create wave pattern blue background"""
        width, height = size
        background = Image.new('RGB', size)
        
        pixels = []
        for y in range(height):
            row = []
            for x in range(width):
                # Create wave pattern
                wave1 = math.sin(x * 0.02) * 50
                wave2 = math.cos(y * 0.03) * 30
                intensity = int(100 + wave1 + wave2)
                
                color = (0, max(0, min(255, intensity)), 255)
                row.append(color)
            pixels.extend(row)
        
        background.putdata(pixels)
        return background
    
    def _create_metallic_blue(self, size, **kwargs):
        """Create metallic blue background"""
        width, height = size
        background = Image.new('RGB', size)
        
        # Create metallic gradient
        for y in range(height):
            for x in range(width):
                # Metallic effect calculation
                distance = math.sqrt((x - width/2)**2 + (y - height/2)**2)
                metallic = int(150 + 50 * math.sin(distance * 0.1))
                
                color = (metallic//3, metallic//2, metallic)
                background.putpixel((x, y), color)
        
        return background
    
    def _create_gradient_blue(self, size, **kwargs):
        """Create gradient blue background"""
        width, height = size
        background = Image.new('RGB', size)
        
        for y in range(height):
            ratio = y / height
            blue_intensity = int(100 + 155 * ratio)
            color = (0, 50, blue_intensity)
            
            for x in range(width):
                background.putpixel((x, y), color)
        
        return background
    
    def _create_geometric(self, size, **kwargs):
        """Create abstract geometric background"""
        width, height = size
        background = Image.new('RGB', size, '#1a1a2e')
        draw = ImageDraw.Draw(background)
        
        # Draw geometric shapes
        for i in range(20):
            x = np.random.randint(0, width)
            y = np.random.randint(0, height)
            size_shape = np.random.randint(20, 100)
            
            color = f"#{np.random.randint(50, 150):02x}{np.random.randint(100, 200):02x}FF"
            
            if i % 2 == 0:
                # Rectangle
                draw.rectangle([x, y, x + size_shape, y + size_shape], fill=color)
            else:
                # Circle
                draw.ellipse([x, y, x + size_shape, y + size_shape], fill=color)
        
        # Apply blur
        background = background.filter(ImageFilter.GaussianBlur(radius=2))
        
        return background
    
    def _create_studio_lighting(self, size, **kwargs):
        """Create studio lighting background"""
        width, height = size
        background = Image.new('RGB', size, '#f0f0f0')
        
        # Create radial gradient for studio lighting
        center_x, center_y = width // 2, height // 2
        max_distance = math.sqrt(center_x**2 + center_y**2)
        
        for y in range(height):
            for x in range(width):
                distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                intensity = int(255 * (1 - distance / max_distance) * 0.5 + 128)
                color = (intensity, intensity, intensity)
                background.putpixel((x, y), color)
        
        return background
    
    def _create_bokeh_effect(self, size, **kwargs):
        """Create bokeh blur background"""
        width, height = size
        background = Image.new('RGB', size, '#0a0a0a')
        draw = ImageDraw.Draw(background)
        
        # Create bokeh circles
        for _ in range(50):
            x = np.random.randint(0, width)
            y = np.random.randint(0, height)
            radius = np.random.randint(10, 80)
            
            # Random color with transparency effect
            r = np.random.randint(50, 255)
            g = np.random.randint(50, 200)
            b = np.random.randint(100, 255)
            
            # Draw circle with gradient effect
            for i in range(radius, 0, -2):
                alpha = 1 - (i / radius)
                color_intensity = int(alpha * 100)
                circle_color = (
                    min(255, r + color_intensity),
                    min(255, g + color_intensity),
                    min(255, b + color_intensity)
                )
                draw.ellipse([x-i, y-i, x+i, y+i], fill=circle_color)
        
        # Apply strong blur
        background = background.filter(ImageFilter.GaussianBlur(radius=8))
        
        return background
    
    def _composite_with_mask(self, foreground, background, mask):
        """Composite foreground and background using mask"""
        # Convert mask to proper format
        if isinstance(mask, np.ndarray):
            mask = Image.fromarray(mask)
        
        # Ensure all images are same size
        background = background.resize(foreground.size)
        mask = mask.resize(foreground.size)
        
        # Convert to RGBA for proper compositing
        if foreground.mode != 'RGBA':
            foreground = foreground.convert('RGBA')
        if background.mode != 'RGBA':
            background = background.convert('RGBA')
        
        # Use mask as alpha channel
        result = Image.composite(foreground, background, mask)
        
        return result.convert('RGB')
    
    def _refine_edges(self, image, mask):
        """Refine edges using feathering"""
        # Apply slight blur to mask for smoother edges
        if isinstance(mask, np.ndarray):
            mask = Image.fromarray(mask)
        
        blurred_mask = mask.filter(ImageFilter.GaussianBlur(radius=1))
        
        # Re-composite with refined mask
        return image  # Simplified for now
