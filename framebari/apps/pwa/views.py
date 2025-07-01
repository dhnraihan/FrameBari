# apps/pwa/views.py
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings

def manifest(request):
    """Generate PWA manifest"""
    manifest_data = {
        "name": "Photo Editor Pro",
        "short_name": "PhotoEditor",
        "description": "Professional photo editing in your browser",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#007bff",
        "orientation": "portrait-primary",
        "scope": "/",
        "icons": [
            {
                "src": "/static/icons/icon-72x72.png",
                "sizes": "72x72",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-96x96.png",
                "sizes": "96x96",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-128x128.png",
                "sizes": "128x128",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-144x144.png",
                "sizes": "144x144",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-152x152.png",
                "sizes": "152x152",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-384x384.png",
                "sizes": "384x384",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ],
        "shortcuts": [
            {
                "name": "Upload Photo",
                "short_name": "Upload",
                "description": "Quickly upload a new photo",
                "url": "/editor/upload/",
                "icons": [{"src": "/static/icons/upload-96x96.png", "sizes": "96x96"}]
            },
            {
                "name": "Batch Process",
                "short_name": "Batch",
                "description": "Process multiple photos",
                "url": "/editor/batch/",
                "icons": [{"src": "/static/icons/batch-96x96.png", "sizes": "96x96"}]
            }
        ]
    }
    
    return JsonResponse(manifest_data)

def offline(request):
    """Offline fallback page"""
    return render(request, 'pwa/offline.html')
