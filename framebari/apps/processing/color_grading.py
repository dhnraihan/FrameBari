# apps/processing/color_grading.py
import numpy as np
from PIL import Image
import cv2

class ColorGradingEngine:
    def __init__(self):
        self.luts = self._load_luts()
    
    def _load_luts(self):
        """Load predefined LUTs for different styles"""
        return {
            'cinematic_warm': self._create_warm_lut(),
            'cinematic_cool': self._create_cool_lut(),
            'vintage': self._create_vintage_lut(),
            'dramatic': self._create_dramatic_lut(),
            'mono_blue': self._create_mono_blue_lut(),
            'neon': self._create_neon_lut()
        }
    
    def _create_warm_lut(self):
        """Create warm cinematic LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        # Warm tone adjustments
        red_curve = np.clip(lut * 1.1 + 10, 0, 255)
        green_curve = np.clip(lut * 1.05 + 5, 0, 255)
        blue_curve = np.clip(lut * 0.95 - 5, 0, 255)
        
        return np.stack([red_curve, green_curve, blue_curve], axis=-1).astype(np.uint8)
    
    def _create_cool_lut(self):
        """Create cool cinematic LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        red_curve = np.clip(lut * 0.95 - 5, 0, 255)
        green_curve = np.clip(lut * 1.02, 0, 255)
        blue_curve = np.clip(lut * 1.1 + 10, 0, 255)
        
        return np.stack([red_curve, green_curve, blue_curve], axis=-1).astype(np.uint8)
    
    def _create_vintage_lut(self):
        """Create vintage film LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        # S-curve for contrast
        normalized = lut / 255.0
        s_curve = 255 * (normalized ** 0.8)
        
        red_curve = np.clip(s_curve * 1.05 + 15, 0, 255)
        green_curve = np.clip(s_curve * 1.02 + 8, 0, 255)
        blue_curve = np.clip(s_curve * 0.9, 0, 255)
        
        return np.stack([red_curve, green_curve, blue_curve], axis=-1).astype(np.uint8)
    
    def _create_dramatic_lut(self):
        """Create dramatic high-contrast LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        # High contrast S-curve
        normalized = lut / 255.0
        dramatic_curve = 255 * np.power(normalized, 0.6)
        
        return np.stack([dramatic_curve, dramatic_curve, dramatic_curve], axis=-1).astype(np.uint8)
    
    def _create_mono_blue_lut(self):
        """Create monochromatic blue LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        # Convert to grayscale then tint blue
        gray_curve = lut * 0.299 + lut * 0.587 + lut * 0.114
        
        red_curve = gray_curve * 0.2
        green_curve = gray_curve * 0.4
        blue_curve = gray_curve * 1.2
        
        return np.stack([red_curve, green_curve, blue_curve], axis=-1).astype(np.uint8)
    
    def _create_neon_lut(self):
        """Create neon/cyberpunk LUT"""
        lut = np.arange(256, dtype=np.float32)
        
        # Boost highlights, crush shadows
        enhanced = np.where(lut > 128, lut * 1.3, lut * 0.7)
        
        red_curve = np.clip(enhanced + 20, 0, 255)
        green_curve = np.clip(enhanced, 0, 255)
        blue_curve = np.clip(enhanced + 40, 0, 255)
        
        return np.stack([red_curve, green_curve, blue_curve], axis=-1).astype(np.uint8)
    
    def apply_lut(self, image, lut_name, intensity=1.0):
        """Apply LUT to image with specified intensity"""
        if lut_name not in self.luts:
            return image
        
        lut = self.luts[lut_name]
        img_array = np.array(image)
        
        # Apply LUT
        result = cv2.LUT(img_array, lut)
        
        # Blend with original based on intensity
        if intensity < 1.0:
            result = cv2.addWeighted(img_array, 1 - intensity, result, intensity, 0)
        
        return Image.fromarray(result)
    
    def apply_subject_specific_grading(self, image, subject_mask, lut_name, intensity=1.0):
        """Apply color grading only to specific subject"""
        if lut_name not in self.luts:
            return image
        
        img_array = np.array(image)
        mask_array = np.array(subject_mask) / 255.0
        
        # Apply LUT to entire image
        graded = cv2.LUT(img_array, self.luts[lut_name])
        
        # Blend only where mask is present
        result = img_array.copy()
        for c in range(3):
            result[:, :, c] = (img_array[:, :, c] * (1 - mask_array * intensity) + 
                             graded[:, :, c] * mask_array * intensity)
        
        return Image.fromarray(result.astype(np.uint8))
