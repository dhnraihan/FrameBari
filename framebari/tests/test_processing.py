# tests/test_processing.py
import pytest
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from PIL import Image
import io
import tempfile
import os

from apps.editor.models import Project, Photo, EditingSettings
from apps.processing.engine import PhotoProcessor
from apps.processing.advanced_filters import AdvancedFiltersEngine
from apps.processing.color_grading import ColorGradingEngine

class PhotoProcessingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            user=self.user,
            name='Test Project'
        )
        
        # Create test image
        self.test_image = self.create_test_image()
        
    def create_test_image(self):
        """Create a test image file"""
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        return SimpleUploadedFile(
            'test_image.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
    
    def test_photo_creation(self):
        """Test photo model creation"""
        photo = Photo.objects.create(
            project=self.project,
            original_image=self.test_image,
            width=100,
            height=100,
            file_size=1024,
            format='JPEG'
        )
        
        self.assertEqual(photo.project, self.project)
        self.assertEqual(photo.width, 100)
        self.assertEqual(photo.height, 100)
        self.assertEqual(photo.status, 'pending')
    
    def test_basic_enhancement(self):
        """Test basic photo enhancement"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            image = Image.new('RGB', (200, 200), color='blue')
            image.save(temp_file.name)
            
            processor = PhotoProcessor(temp_file.name)
            result = processor.enhance_photo(
                brightness=20,
                contrast=10,
                saturation=15
            )
            
            self.assertIsInstance(result, PhotoProcessor)
            
            # Clean up
            os.unlink(temp_file.name)
    
    def test_advanced_filters(self):
        """Test advanced filter application"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            image = Image.new('RGB', (200, 200), color='green')
            image.save(temp_file.name)
            
            filter_engine = AdvancedFiltersEngine()
            
            # Test sepia filter
            sepia_result = filter_engine.apply_filter(image, 'sepia')
            self.assertIsInstance(sepia_result, Image.Image)
            
            # Test vintage filter
            vintage_result = filter_engine.apply_filter(image, 'vintage')
            self.assertIsInstance(vintage_result, Image.Image)
            
            # Clean up
            os.unlink(temp_file.name)
    
    def test_color_grading(self):
        """Test color grading functionality"""
        image = Image.new('RGB', (100, 100), color='white')
        color_engine = ColorGradingEngine()
        
        # Test warm LUT
        warm_result = color_engine.apply_lut(image, 'cinematic_warm')
        self.assertIsInstance(warm_result, Image.Image)
        
        # Test with intensity
        partial_result = color_engine.apply_lut(image, 'cinematic_cool', intensity=0.5)
        self.assertIsInstance(partial_result, Image.Image)

