# apps/editor/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Photo(models.Model):
    PROCESSING_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    original_image = models.ImageField(upload_to='originals/')
    processed_image = models.ImageField(upload_to='processed/', null=True, blank=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    
    # Metadata
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    file_size = models.PositiveIntegerField()
    format = models.CharField(max_length=10)
    
    # Processing status
    status = models.CharField(max_length=20, choices=PROCESSING_STATUS, default='pending')
    processing_progress = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

class DetectedSubject(models.Model):
    SUBJECT_TYPES = [
        ('person', 'Person'),
        ('object', 'Object'),
        ('background', 'Background'),
        ('sky', 'Sky'),
        ('water', 'Water'),
    ]
    
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPES)
    mask_data = models.TextField()  # Base64 encoded mask
    confidence = models.FloatField()
    bounding_box = models.JSONField()  # x, y, width, height

class EditingSettings(models.Model):
    photo = models.OneToOneField(Photo, on_delete=models.CASCADE)
    
    # Enhancement settings
    brightness = models.IntegerField(default=0, help_text="-100 to 100")
    contrast = models.IntegerField(default=0, help_text="-100 to 100")
    saturation = models.IntegerField(default=0, help_text="-100 to 100")
    vibrance = models.IntegerField(default=0, help_text="-100 to 100")
    exposure = models.IntegerField(default=0, help_text="-100 to 100")
    
    # Quality settings
    compression_quality = models.IntegerField(default=85, help_text="1 to 100")
    output_format = models.CharField(max_length=10, default='JPEG')
    
    # Background replacement
    background_color = models.CharField(max_length=7, default='#0066FF')
    background_style = models.CharField(max_length=50, default='solid')
    
    updated_at = models.DateTimeField(auto_now=True)
