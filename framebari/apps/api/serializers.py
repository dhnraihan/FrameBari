# apps/api/serializers.py
from rest_framework import serializers
from apps.editor.models import Project, Photo, EditingSettings, DetectedSubject
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class ProjectSerializer(serializers.ModelSerializer):
    photo_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'created_at', 'updated_at', 'photo_count']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_photo_count(self, obj):
        return obj.photo_set.count()

class DetectedSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetectedSubject
        fields = ['id', 'subject_type', 'confidence', 'bounding_box']

class EditingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditingSettings
        fields = '__all__'

class PhotoSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    detected_subjects = DetectedSubjectSerializer(many=True, read_only=True, source='detectedsubject_set')
    editing_settings = EditingSettingsSerializer(read_only=True)
    
    class Meta:
        model = Photo
        fields = [
            'id', 'project', 'project_name', 'original_image', 'processed_image', 
            'thumbnail', 'width', 'height', 'file_size', 'format', 'status', 
            'processing_progress', 'created_at', 'detected_subjects', 'editing_settings'
        ]
        read_only_fields = ['id', 'width', 'height', 'file_size', 'format', 'created_at']
    
    def get_project_name(self, obj):
        return obj.project.name

