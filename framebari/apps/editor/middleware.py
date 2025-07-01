# apps/editor/middleware.py
from django.utils.cache import patch_cache_control
from django.http import HttpResponse

class CacheMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Cache static assets
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            patch_cache_control(response, max_age=3600)  # 1 hour
        
        # Cache API responses
        if request.path.startswith('/api/') and request.method == 'GET':
            patch_cache_control(response, max_age=300)  # 5 minutes
        
        return response
