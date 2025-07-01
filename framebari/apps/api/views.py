# apps/api/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from apps.editor.models import Project, Photo
from .serializers import ProjectSerializer, PhotoSerializer
from apps.processing.engine import PhotoProcessor
from apps.editor.tasks import process_photo_async
import json

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def photos(self, request, pk=None):
        """Get all photos in a project"""
        project = self.get_object()
        photos = project.photo_set.all()
        serializer = PhotoSerializer(photos, many=True)
        return Response(serializer.data)

class PhotoViewSet(viewsets.ModelViewSet):
    serializer_class = PhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Photo.objects.filter(project__user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process photo with given settings"""
        photo = self.get_object()
        settings = request.data
        
        # Start async processing
        process_photo_async.delay(str(photo.id), settings)
        
        return Response({
            'message': 'Processing started',
            'photo_id': str(photo.id)
        })
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download processed photo"""
        photo = self.get_object()
        
        if not photo.processed_image:
            return Response(
                {'error': 'Photo not processed yet'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'download_url': photo.processed_image.url,
            'filename': f"{photo.id}_processed.{photo.format.lower()}"
        })

class ProcessPhotoAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Process single photo with custom settings"""
        photo_id = request.data.get('photo_id')
        settings = request.data.get('settings', {})
        
        photo = get_object_or_404(Photo, id=photo_id, project__user=request.user)
        
        try:
            processor = PhotoProcessor(photo.original_image.path)
            
            # Apply settings
            processor.enhance_photo(
                brightness=settings.get('brightness', 0),
                contrast=settings.get('contrast', 0),
                saturation=settings.get('saturation', 0),
                vibrance=settings.get('vibrance', 0),
                exposure=settings.get('exposure', 0)
            )
            
            # Background replacement if requested
            if settings.get('replace_background'):
                processor.remove_background()
                processor.replace_background(
                    color=settings.get('background_color', '#0066FF'),
                    style=settings.get('background_style', 'solid')
                )
            
            # Save processed image
            output_path = f"api_processed/{photo.id}_api.jpg"
            processor.save(output_path, quality=settings.get('quality', 85))
            
            photo.processed_image = output_path
            photo.status = 'completed'
            photo.save()
            
            serializer = PhotoSerializer(photo)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class BatchProcessAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Process multiple photos with same settings"""
        photo_ids = request.data.get('photo_ids', [])
        settings = request.data.get('settings', {})
        
        # Validate photos belong to user
        photos = Photo.objects.filter(
            id__in=photo_ids,
            project__user=request.user
        )
        
        if len(photos) != len(photo_ids):
            return Response(
                {'error': 'Some photos not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start batch processing
        from apps.processing.batch_processor import BatchProcessor
        batch_processor = BatchProcessor()
        job_id = batch_processor.process_batch(photo_ids, settings)
        
        return Response({
            'job_id': job_id,
            'status': 'started',
            'photo_count': len(photo_ids)
        })
