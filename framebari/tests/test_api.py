# tests/test_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

class APITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@example.com',
            password='apipass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def create_test_image(self):
        image = Image.new('RGB', (100, 100), color='blue')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        return SimpleUploadedFile(
            'api_test.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
    
    def test_project_creation_api(self):
        """Test project creation via API"""
        data = {'name': 'API Test Project'}
        response = self.client.post('/api/v1/projects/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'API Test Project')
    
    def test_photo_upload_api(self):
        """Test photo upload via API"""
        # First create a project
        project_response = self.client.post('/api/v1/projects/', {'name': 'Upload Test'})
        project_id = project_response.data['id']
        
        # Upload photo
        test_image = self.create_test_image()
        data = {
            'project': project_id,
            'original_image': test_image
        }
        response = self.client.post('/api/v1/photos/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_batch_processing_api(self):
        """Test batch processing API endpoint"""
        # Create project and photos first
        project_response = self.client.post('/api/v1/projects/', {'name': 'Batch Test'})
        project_id = project_response.data['id']
        
        # Create test photos
        photo_ids = []
        for i in range(3):
            test_image = self.create_test_image()
            photo_response = self.client.post('/api/v1/photos/', {
                'project': project_id,
                'original_image': test_image
            }, format='multipart')
            photo_ids.append(photo_response.data['id'])
        
        # Test batch processing
        batch_data = {
            'photo_ids': photo_ids,
            'settings': {
                'brightness': 10,
                'contrast': 5,
                'replace_background': True
            }
        }
        response = self.client.post('/api/v1/batch-process/', batch_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('job_id', response.data)

