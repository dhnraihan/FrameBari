# apps/processing/advanced_filters.py
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage
import math

class AdvancedFiltersEngine:
    def __init__(self):
        self.filters = {
            'blur': self._apply_blur,
            'sharpen': self._apply_sharpen,
            'emboss': self._apply_emboss,
            'edge_detect': self._apply_edge_detection,
            'vintage': self._apply_vintage,
            'sepia': self._apply_sepia,
            'black_white': self._apply_black_white,
            'cross_process': self._apply_cross_process,
            'lomography': self._apply_lomography,
            'orton': self._apply_orton_effect,
            'hdr': self._apply_hdr_effect,
            'oil_painting': self._apply_oil_painting,
            'watercolor': self._apply_watercolor,
            'pencil_sketch': self._apply_pencil_sketch,
            'cartoon': self._apply_cartoon,
            'pop_art': self._apply_pop_art
        }
    
    def apply_filter(self, image, filter_name, intensity=1.0, **kwargs):
        """Apply specified filter to image"""
        if filter_name not in self.filters:
            return image
        
        filtered = self.filters[filter_name](image, **kwargs)
        
        # Blend with original based on intensity
        if intensity < 1.0:
            filtered = Image.blend(image, filtered, intensity)
        
        return filtered
    
    def _apply_blur(self, image, radius=2):
        """Apply Gaussian blur"""
        return image.filter(ImageFilter.GaussianBlur(radius=radius))
    
    def _apply_sharpen(self, image, factor=1.0):
        """Apply sharpening filter"""
        enhancer = ImageEnhance.Sharpness(image)
        return enhancer.enhance(1 + factor)
    
    def _apply_emboss(self, image):
        """Apply emboss effect"""
        return image.filter(ImageFilter.EMBOSS)
    
    def _apply_edge_detection(self, image):
        """Apply edge detection filter"""
        gray = image.convert('L')
        edges = gray.filter(ImageFilter.FIND_EDGES)
        return edges.convert('RGB')
    
    def _apply_vintage(self, image):
        """Apply vintage film effect"""
        # Convert to array
        img_array = np.array(image)
        
        # Add vignette
        h, w = img_array.shape[:2]
        center_x, center_y = w // 2, h // 2
        max_distance = math.sqrt(center_x**2 + center_y**2)
        
        for y in range(h):
            for x in range(w):
                distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                vignette = 1 - (distance / max_distance) * 0.5
                img_array[y, x] = img_array[y, x] * vignette
        
        # Add warm tone
        img_array[:, :, 0] = np.clip(img_array[:, :, 0] * 1.1, 0, 255)  # Red
        img_array[:, :, 2] = np.clip(img_array[:, :, 2] * 0.9, 0, 255)  # Blue
        
        # Add grain
        noise = np.random.normal(0, 10, img_array.shape)
        img_array = np.clip(img_array + noise, 0, 255)
        
        return Image.fromarray(img_array.astype(np.uint8))
    
    def _apply_sepia(self, image):
        """Apply sepia tone effect"""
        img_array = np.array(image)
        
        # Sepia transformation matrix
        sepia_filter = np.array([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131]
        ])
        
        sepia_img = img_array.dot(sepia_filter.T)
        sepia_img = np.clip(sepia_img, 0, 255)
        
        return Image.fromarray(sepia_img.astype(np.uint8))
    
    def _apply_black_white(self, image):
        """Convert to black and white with enhanced contrast"""
        bw = image.convert('L')
        enhancer = ImageEnhance.Contrast(bw)
        bw = enhancer.enhance(1.2)
        return bw.convert('RGB')
    
    def _apply_cross_process(self, image):
        """Apply cross-processing effect"""
        img_array = np.array(image)
        
        # Create S-curves for each channel
        def s_curve(x, steepness=2):
            return 255 * (1 / (1 + np.exp(-steepness * (x / 255 - 0.5))))
        
        # Apply different curves to each channel
        img_array[:, :, 0] = s_curve(img_array[:, :, 0], 2.5)  # Red
        img_array[:, :, 1] = s_curve(img_array[:, :, 1], 2.0)  # Green
        img_array[:, :, 2] = s_curve(img_array[:, :, 2], 1.5)  # Blue
        
        return Image.fromarray(img_array.astype(np.uint8))
    
    def _apply_lomography(self, image):
        """Apply lomography effect"""
        img_array = np.array(image)
        h, w = img_array.shape[:2]
        
        # Create radial gradient for vignette
        center_x, center_y = w // 2, h // 2
        Y, X = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((X - center_x)**2 + (Y - center_y)**2)
        max_dist = np.sqrt(center_x**2 + center_y**2)
        
        # Strong vignette
        vignette = 1 - (dist_from_center / max_dist) * 0.8
        vignette = np.clip(vignette, 0.2, 1)
        
        # Apply vignette
        for c in range(3):
            img_array[:, :, c] = img_array[:, :, c] * vignette
        
        # Increase saturation
        pil_img = Image.fromarray(img_array.astype(np.uint8))
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(1.5)
        
        return pil_img
    
    def _apply_orton_effect(self, image):
        """Apply Orton effect (dreamy glow)"""
        # Create blurred copy
        blurred = image.filter(ImageFilter.GaussianBlur(radius=10))
        
        # Increase contrast on blurred image
        enhancer = ImageEnhance.Contrast(blurred)
        blurred = enhancer.enhance(1.5)
        
        # Blend with original using screen mode
        result = Image.blend(image, blurred, 0.5)
        
        return result
    
    def _apply_hdr_effect(self, image):
        """Apply HDR-like effect"""
        img_array = np.array(image).astype(np.float32)
        
        # Convert to LAB color space for luminance processing
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        
        # Apply tone mapping to luminance channel
        l_channel = lab[:, :, 0]
        l_channel = l_channel / 255.0
        
        # Apply gamma correction
        l_channel = np.power(l_channel, 0.6)
        
        # Enhance local contrast
        kernel = np.ones((15, 15), np.float32) / 225
        local_mean = cv2.filter2D(l_channel, -1, kernel)
        l_channel = l_channel + 0.5 * (l_channel - local_mean)
        
        lab[:, :, 0] = np.clip(l_channel * 255, 0, 255)
        
        # Convert back to RGB
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        
        return Image.fromarray(result.astype(np.uint8))
    
    def _apply_oil_painting(self, image):
        """Apply oil painting effect"""
        img_array = np.array(image)
        
        # Use OpenCV's oil painting effect
        oil_painted = cv2.xphoto.oilPainting(img_array, 7, 1)
        
        return Image.fromarray(oil_painted)
    
    def _apply_watercolor(self, image):
        """Apply watercolor effect"""
        img_array = np.array(image)
        
        # Bilateral filter for smoothing
        smooth = cv2.bilateralFilter(img_array, 15, 80, 80)
        
        # Edge detection
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                    cv2.THRESH_BINARY, 7, 7)
        edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
        
        # Combine smooth image with edges
        watercolor = cv2.bitwise_and(smooth, edges)
        
        return Image.fromarray(watercolor)
    
    def _apply_pencil_sketch(self, image):
        """Apply pencil sketch effect"""
        img_array = np.array(image)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Create pencil sketch
        gray_blur = cv2.medianBlur(gray, 5)
        edges = cv2.adaptiveThreshold(gray_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                    cv2.THRESH_BINARY, 7, 7)
        
        return Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB))
    
    def _apply_cartoon(self, image):
        """Apply cartoon effect"""
        img_array = np.array(image)
        
        # Bilateral filter for smoothing
        smooth = cv2.bilateralFilter(img_array, 15, 80, 80)
        
        # Edge detection
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        gray_blur = cv2.medianBlur(gray, 5)
        edges = cv2.adaptiveThreshold(gray_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                    cv2.THRESH_BINARY, 7, 7)
        edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
        
        # Combine
        cartoon = cv2.bitwise_and(smooth, edges)
        
        return Image.fromarray(cartoon)
    
    def _apply_pop_art(self, image):
        """Apply pop art effect"""
        img_array = np.array(image)
        
        # Quantize colors
        data = img_array.reshape((-1, 3))
        data = np.float32(data)
        
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
        _, labels, centers = cv2.kmeans(data, 8, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        
        centers = np.uint8(centers)
        quantized = centers[labels.flatten()]
        quantized = quantized.reshape(img_array.shape)
        
        # Increase saturation
        pil_img = Image.fromarray(quantized)
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(2.0)
        
        return pil_img
