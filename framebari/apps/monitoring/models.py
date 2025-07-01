# apps/monitoring/models.py
from django.db import models
from django.contrib.auth.models import User
import json

class SystemMetrics(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    cpu_usage = models.FloatField()
    memory_usage = models.FloatField()
    disk_usage = models.FloatField()
    active_users = models.PositiveIntegerField()
    processing_queue_size = models.PositiveIntegerField()

class UserActivity(models.Model):
    ACTION_CHOICES = [
        ('upload', 'Photo Upload'),
        ('process', 'Photo Process'),
        ('download', 'Photo Download'),
        ('login', 'User Login'),
        ('logout', 'User Logout'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    details = models.JSONField(default=dict)

class ErrorLog(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    error_type = models.CharField(max_length=100)
    message = models.TextField()
    stack_trace = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    resolved = models.BooleanField(default=False)
