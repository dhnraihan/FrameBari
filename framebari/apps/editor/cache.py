# apps/editor/cache.py
from django.core.cache import cache
from django.conf import settings
import hashlib
import pickle

class PhotoCache:
    def __init__(self):
        self.timeout = getattr(settings, 'PHOTO_CACHE_TIMEOUT', 3600)  # 1 hour
    
    def get_cache_key(self, photo_id, settings_dict):
        """Generate cache key based on photo and settings"""
        settings_str = str(sorted(settings_dict.items()))
        key_data = f"{photo_id}:{settings_str}"
        return f"photo_preview:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def get_preview(self, photo_id, settings_dict):
        """Get cached preview if available"""
        cache_key = self.get_cache_key(photo_id, settings_dict)
        return cache.get(cache_key)
    
    def set_preview(self, photo_id, settings_dict, preview_url):
        """Cache preview URL"""
        cache_key = self.get_cache_key(photo_id, settings_dict)
        cache.set(cache_key, preview_url, self.timeout)
    
    def invalidate_photo(self, photo_id):
        """Invalidate all cached previews for a photo"""
        # Since we can't wildcard delete in most cache backends,
        # we'll use a version-based approach
        version_key = f"photo_version:{photo_id}"
        current_version = cache.get(version_key, 0)
        cache.set(version_key, current_version + 1, None)  # Never expires

