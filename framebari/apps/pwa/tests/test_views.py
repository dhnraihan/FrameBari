from django.test import TestCase, Client
from django.urls import reverse
from django.http import JsonResponse
import json

class PWAViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_manifest_view(self):
        """Test PWA manifest generation"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        
        # Check response status
        self.assertEqual(response.status_code, 200)
        
        # Check content type
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Parse JSON response
        manifest_data = json.loads(response.content)
        
        # Check required manifest fields
        self.assertIn('name', manifest_data)
        self.assertIn('short_name', manifest_data)
        self.assertIn('start_url', manifest_data)
        self.assertIn('display', manifest_data)
        self.assertIn('icons', manifest_data)
        
        # Check specific values
        self.assertEqual(manifest_data['name'], 'Photo Editor Pro')
        self.assertEqual(manifest_data['short_name'], 'PhotoEditor')
        self.assertEqual(manifest_data['start_url'], '/')
        self.assertEqual(manifest_data['display'], 'standalone')
        
        # Check icons array
        self.assertIsInstance(manifest_data['icons'], list)
        self.assertGreater(len(manifest_data['icons']), 0)
        
        # Check icon structure
        for icon in manifest_data['icons']:
            self.assertIn('src', icon)
            self.assertIn('sizes', icon)
            self.assertIn('type', icon)
            
        # Check shortcuts
        self.assertIn('shortcuts', manifest_data)
        self.assertIsInstance(manifest_data['shortcuts'], list)
        
    def test_manifest_icon_formats(self):
        """Test that manifest icons have correct formats"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        manifest_data = json.loads(response.content)
        
        expected_sizes = ['72x72', '96x96', '128x128', '144x144', 
                         '152x152', '192x192', '384x384', '512x512']
        
        actual_sizes = [icon['sizes'] for icon in manifest_data['icons']]
        
        for size in expected_sizes:
            self.assertIn(size, actual_sizes)
            
    def test_manifest_shortcuts(self):
        """Test PWA shortcuts configuration"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        manifest_data = json.loads(response.content)
        
        shortcuts = manifest_data['shortcuts']
        
        # Check shortcuts structure
        for shortcut in shortcuts:
            self.assertIn('name', shortcut)
            self.assertIn('short_name', shortcut)
            self.assertIn('description', shortcut)
            self.assertIn('url', shortcut)
            self.assertIn('icons', shortcut)
            
        # Check specific shortcuts
        shortcut_names = [shortcut['name'] for shortcut in shortcuts]
        self.assertIn('Upload Photo', shortcut_names)
        self.assertIn('Batch Process', shortcut_names)

    def test_offline_view(self):
        """Test offline fallback page"""
        url = reverse('pwa_offline')
        response = self.client.get(url)
        
        # Check response status
        self.assertEqual(response.status_code, 200)
        
        # Check template used
        self.assertTemplateUsed(response, 'pwa/offline.html')
        
        # Check content type
        self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')
        
    def test_offline_page_content(self):
        """Test offline page contains expected content"""
        url = reverse('pwa_offline')
        response = self.client.get(url)
        content = response.content.decode('utf-8')
        
        # Check for expected text
        self.assertIn('offline', content.lower())
        self.assertIn('framebari', content.lower())
        self.assertIn('photo', content.lower())
        
    def test_manifest_theme_colors(self):
        """Test PWA theme and background colors"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        manifest_data = json.loads(response.content)
        
        # Check color fields
        self.assertIn('background_color', manifest_data)
        self.assertIn('theme_color', manifest_data)
        
        # Check color formats (should be hex colors)
        bg_color = manifest_data['background_color']
        theme_color = manifest_data['theme_color']
        
        self.assertTrue(bg_color.startswith('#'))
        self.assertTrue(theme_color.startswith('#'))
        self.assertEqual(len(bg_color), 7)  # #ffffff format
        self.assertEqual(len(theme_color), 7)  # #007bff format
        
    def test_manifest_orientation(self):
        """Test PWA orientation setting"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        manifest_data = json.loads(response.content)
        
        self.assertIn('orientation', manifest_data)
        valid_orientations = ['any', 'natural', 'landscape', 'portrait', 
                            'portrait-primary', 'portrait-secondary',
                            'landscape-primary', 'landscape-secondary']
        self.assertIn(manifest_data['orientation'], valid_orientations)
        
    def test_manifest_scope(self):
        """Test PWA scope configuration"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        manifest_data = json.loads(response.content)
        
        self.assertIn('scope', manifest_data)
        self.assertEqual(manifest_data['scope'], '/')
        
class PWAIntegrationTestCase(TestCase):
    def test_manifest_accessibility(self):
        """Test that manifest is accessible from root"""
        # Test direct access
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
    def test_offline_fallback_accessibility(self):
        """Test offline page accessibility"""
        url = reverse('pwa_offline')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
class PWASecurityTestCase(TestCase):
    def test_manifest_no_sensitive_data(self):
        """Ensure manifest doesn't contain sensitive information"""
        url = reverse('pwa_manifest')
        response = self.client.get(url)
        content = response.content.decode('utf-8')
        
        # Check that no sensitive data is exposed
        sensitive_terms = ['password', 'secret', 'key', 'token', 'api_key']
        
        for term in sensitive_terms:
            self.assertNotIn(term.lower(), content.lower())
