# apps/editor/views.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.core.files.storage import default_storage
import json
from .models import Project, Photo, EditingSettings
from apps.accounts.models import UserProfile
from apps.processing.engine import PhotoProcessor
from .tasks import process_photo_async

@login_required
def editor_view(request, photo_id):
    photo = get_object_or_404(Photo, id=photo_id, project__user=request.user)
    settings, created = EditingSettings.objects.get_or_create(photo=photo)
    
    context = {
        'photo': photo,
        'settings': settings,
    }
    return render(request, 'editor/editor.html', context)

@csrf_exempt
@login_required
def upload_photo(request):
    if request.method == 'POST' and request.FILES.get('photo'):
        photo_file = request.FILES['photo']
        
        # Create project if needed
        project, created = Project.objects.get_or_create(
            user=request.user,
            name=f"Project {request.user.projects.count() + 1}"
        )
        
        # Create photo record
        photo = Photo.objects.create(
            project=project,
            original_image=photo_file,
            width=0,  # Will be updated after processing
            height=0,
            file_size=photo_file.size,
            format=photo_file.content_type.split('/')[-1].upper()
        )
        
        # Start async processing
        process_photo_async.delay(photo.id)
        
        return JsonResponse({
            'success': True,
            'photo_id': str(photo.id),
            'redirect_url': f'/editor/{photo.id}/'
        })
    
    return JsonResponse({'success': False, 'error': 'No photo provided'})

@csrf_exempt
@login_required
def apply_effects(request, photo_id):
    if request.method == 'POST':
        photo = get_object_or_404(Photo, id=photo_id, project__user=request.user)
        settings = photo.editingsettings
        
        data = json.loads(request.body)
        
        # Update settings
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        settings.save()
        
        # Process image
        processor = PhotoProcessor(photo.original_image.path)
        processor.enhance_photo(
            brightness=settings.brightness,
            contrast=settings.contrast,
            saturation=settings.saturation,
            vibrance=settings.vibrance,
            exposure=settings.exposure
        )
        
        # Apply background replacement if requested
        if data.get('replace_background'):
            processor.remove_background()
            processor.replace_background(
                color=settings.background_color,
                style=settings.background_style
            )
        
        # Save processed image
        output_path = f"processed/{photo.id}_processed.{settings.output_format.lower()}"
        full_output_path = default_storage.path(output_path)
        processor.save(full_output_path, quality=settings.compression_quality)
        
        photo.processed_image = output_path
        photo.status = 'completed'
        photo.save()
        
        return JsonResponse({
            'success': True,
            'processed_url': photo.processed_image.url,
            'thumbnail_url': photo.thumbnail.url if photo.thumbnail else None
        })
    
    return JsonResponse({'success': False})

@login_required
def detect_subjects(request, photo_id):
    photo = get_object_or_404(Photo, id=photo_id, project__user=request.user)
    
    processor = PhotoProcessor(photo.original_image.path)
    subjects = processor.detect_subjects()
    
    # Save detected subjects
    for subject_data in subjects:
        DetectedSubject.objects.create(
            photo=photo,
            subject_type=subject_data['type'],
            mask_data=subject_data['mask'],
            confidence=subject_data['confidence'],
            bounding_box=subject_data['bbox']
        )
    
    return JsonResponse({'subjects': subjects})

# apps/editor/views.py (additional views)

@csrf_exempt
@login_required
def generate_preview(request, photo_id):
    """Generate real-time preview"""
    if request.method == 'POST':
        photo = get_object_or_404(Photo, id=photo_id, project__user=request.user)
        settings = json.loads(request.body)
        
        # Generate preview (smaller size for speed)
        processor = PhotoProcessor(photo.original_image.path)
        
        # Resize for faster processing
        processor.working_image.thumbnail((800, 600), Image.Resampling.LANCZOS)
        
        # Apply settings
        processor.enhance_photo(
            brightness=int(settings.get('brightness', 0)),
            contrast=int(settings.get('contrast', 0)),
            saturation=int(settings.get('saturation', 0))
        )
        
        # Apply color grading
        if settings.get('colorGrade'):
            color_engine = ColorGradingEngine()
            processor.working_image = color_engine.apply_lut(
                processor.working_image,
                settings['colorGrade'],
                float(settings.get('gradeIntensity', 100)) / 100
            )
        
        # Save preview
        preview_path = f"previews/{photo.id}_preview.jpg"
        full_path = default_storage.path(preview_path)
        processor.save(full_path, quality=70)
        
        return JsonResponse({
            'success': True,
            'preview_url': default_storage.url(preview_path)
        })
    
    return JsonResponse({'success': False})

@login_required
def batch_process_view(request):
    """Handle batch processing"""
    if request.method == 'POST':
        photo_ids = request.POST.getlist('photo_ids')
        settings = {
            'brightness': int(request.POST.get('brightness', 0)),
            'contrast': int(request.POST.get('contrast', 0)),
            'color_grade': request.POST.get('color_grade', ''),
            'background_style': request.POST.get('background_style', ''),
            'replace_background': bool(request.POST.get('replace_background')),
            'quality': int(request.POST.get('quality', 85))
        }
        
        batch_processor = BatchProcessor()
        job_id = batch_processor.process_batch(photo_ids, settings)
        
        return JsonResponse({
            'success': True,
            'job_id': job_id,
            'status_url': f'/batch/status/{job_id}/'
        })
    
    # Show batch processing interface
    user_photos = Photo.objects.filter(project__user=request.user, status='completed')
    return render(request, 'editor/batch_process.html', {
        'photos': user_photos
    })

@login_required
def download_batch(request, job_id):
    """Download processed batch as ZIP"""
    # Check job status and create download
    processed_photos = Photo.objects.filter(
        project__user=request.user,
        status='completed'
    )
    
    batch_processor = BatchProcessor()
    zip_path = batch_processor.create_download_zip(processed_photos)
    
    # Serve ZIP file
    response = FileResponse(open(zip_path, 'rb'), as_attachment=True, filename='processed_photos.zip')
    return response


# apps/editor/views.py (additional views)
@login_required
def dashboard(request):
    """Main dashboard showing user's projects and recent photos"""
    user = request.user
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Get user's projects
    projects = Project.objects.filter(user=user).order_by('-updated_at')[:6]
    
    # Get recent photos
    recent_photos = Photo.objects.filter(
        project__user=user
    ).order_by('-created_at')[:12]
    
    # Usage statistics
    total_photos = Photo.objects.filter(project__user=user).count()
    completed_photos = Photo.objects.filter(
        project__user=user,
        status='completed'
    ).count()
    
    storage_percentage = (profile.storage_used / profile.max_storage) * 100
    usage_percentage = (profile.photos_processed_this_month / profile.max_photos_per_month) * 100
    
    context = {
        'projects': projects,
        'recent_photos': recent_photos,
        'total_photos': total_photos,
        'completed_photos': completed_photos,
        'storage_percentage': storage_percentage,
        'usage_percentage': usage_percentage,
        'profile': profile,
    }
    return render(request, 'editor/dashboard.html', context)

@login_required
def project_list(request):
    """List all user projects"""
    projects = Project.objects.filter(user=request.user).order_by('-updated_at')
    
    # Add pagination
    from django.core.paginator import Paginator
    paginator = Paginator(projects, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'editor/project_list.html', {
        'page_obj': page_obj
    })

@login_required
def project_detail(request, project_id):
    """Project detail view with all photos"""
    project = get_object_or_404(Project, id=project_id, user=request.user)
    photos = project.photo_set.all().order_by('-created_at')
    
    # Add pagination
    from django.core.paginator import Paginator
    paginator = Paginator(photos, 24)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'editor/project_detail.html', {
        'project': project,
        'page_obj': page_obj
    })

@csrf_exempt
@login_required
def delete_project(request, project_id):
    """Delete project and all associated photos"""
    if request.method == 'POST':
        project = get_object_or_404(Project, id=project_id, user=request.user)
        
        # Delete all associated files
        for photo in project.photo_set.all():
            if photo.original_image:
                photo.original_image.delete()
            if photo.processed_image:
                photo.processed_image.delete()
            if photo.thumbnail:
                photo.thumbnail.delete()
        
        project.delete()
        messages.success(request, 'Project deleted successfully!')
        return redirect('editor:projects')
    
    return JsonResponse({'success': False})

@login_required
def batch_status(request, job_id):
    """Get batch processing status"""
    from celery.result import AsyncResult
    
    result = AsyncResult(job_id)
    
    return JsonResponse({
        'status': result.status,
        'progress': result.info.get('progress', 0) if result.info else 0,
        'completed': result.info.get('completed', 0) if result.info else 0,
        'total': result.info.get('total', 0) if result.info else 0,
    })
