# apps/accounts/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    SUBSCRIPTION_TYPES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('premium', 'Premium'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_TYPES, default='free')
    photos_processed_this_month = models.PositiveIntegerField(default=0)
    max_photos_per_month = models.PositiveIntegerField(default=10)
    storage_used = models.BigIntegerField(default=0)  # in bytes
    max_storage = models.BigIntegerField(default=100 * 1024 * 1024)  # 100MB
    created_at = models.DateTimeField(auto_now_add=True)
    
    def can_process_photo(self):
        return self.photos_processed_this_month < self.max_photos_per_month
    
    def can_upload_file(self, file_size):
        return (self.storage_used + file_size) <= self.max_storage

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
