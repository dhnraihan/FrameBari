# tests/test_views.py
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='viewuser',
            email='view@example.com',
            password='viewpass123'
        )
        self.client.login(username='viewuser', password='viewpass123')
    
    def test_dashboard_view(self):
        """Test dashboard view"""
        response = self.client.get(reverse('editor:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Welcome back')
    
    def test_upload_view(self):
        """Test photo upload view"""
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        uploaded_file = SimpleUploadedFile(
            'upload_test.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        response = self.client.post(reverse('editor:upload'), {
            'photo': uploaded_file
        })
        
        self.assertEqual(response.status_code, 200)
    
    def test_editor_view_requires_auth(self):
        """Test that editor view requires authentication"""
        self.client.logout()
        response = self.client.get('/editor/some-uuid/')
        self.assertEqual(response.status_code, 302)  # Redirect to login

# Run tests with: python manage.py test
