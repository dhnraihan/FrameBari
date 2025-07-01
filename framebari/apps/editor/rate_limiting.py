# apps/editor/rate_limiting.py
from django.core.cache import cache
from django.http import HttpResponseTooManyRequests
from django.utils import timezone
import json

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.limits = {
            'upload': {'requests': 10, 'window': 3600},  # 10 uploads per hour
            'process': {'requests': 50, 'window': 3600},  # 50 processes per hour
            'api': {'requests': 1000, 'window': 3600}     # 1000 API calls per hour
        }
    
    def __call__(self, request):
        # Check rate limits
        if self._is_rate_limited(request):
            return HttpResponseTooManyRequests(
                json.dumps({'error': 'Rate limit exceeded'}),
                content_type='application/json'
            )
        
        response = self.get_response(request)
        return response
    
    def _is_rate_limited(self, request):
        """Check if request should be rate limited"""
        user_id = getattr(request.user, 'id', request.META.get('REMOTE_ADDR'))
        
        # Determine limit type
        limit_type = 'api'
        if '/upload/' in request.path:
            limit_type = 'upload'
        elif '/process/' in request.path or '/apply/' in request.path:
            limit_type = 'process'
        
        limit_config = self.limits[limit_type]
        cache_key = f"rate_limit:{limit_type}:{user_id}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit_config['requests']:
            return True
        
        # Increment count
        cache.set(cache_key, current_count + 1, limit_config['window'])
        return False

