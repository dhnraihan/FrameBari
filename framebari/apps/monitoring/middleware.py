# apps/monitoring/middleware.py
from .logger import ActivityLogger
import time

class MonitoringMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = ActivityLogger()
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Log slow requests
        duration = time.time() - start_time
        if duration > 5:  # 5 seconds
            self.logger.logger.warning(f'Slow request: {request.path} took {duration:.2f}s')
        
        return response
    
    def process_exception(self, request, exception):
        """Log exceptions"""
        user = request.user if request.user.is_authenticated else None
        self.logger.log_error(exception, severity='high', user=user, request=request)
