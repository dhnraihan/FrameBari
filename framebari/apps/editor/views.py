from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
import json
import uuid
import tempfile
import zipfile
import os

# Mock data to simulate database records
MOCK_PROJECTS = {}
MOCK_PHOTOS = {}

@login_required
def dashboard(request):
    """Main dashboard showing user's projects and recent photos"""
    user = request.user
    
    # Mock data
    user_projects = [p for p in MOCK_PROJECTS.values() if p.get('user_id') == user.id]
    user_photos = [p for p in MOCK_PHOTOS.values() if p.get('user_id') == user.id]
    
    context = {
        'projects': user_projects[:6],
        'recent_photos': user_photos[:12],
        'total_photos': len(user_photos),
        'completed_photos': len([p for p in user_photos if p.get('status') == 'completed']),
        'storage_percentage': 25.5,  # Mock percentage
        'usage_percentage': 30.0,   # Mock percentage
        'profile': {
            'photos_processed_this_month': 3,
            'max_photos_per_month': 10,
            'storage_used': 256 * 1024 * 1024,  # 256MB
            'max_storage': 1024 * 1024 * 1024,  # 1GB
        },
    }
    return render(request, 'editor/dashboard.html', context)

@csrf_exempt
@login_required
def upload_photo(request):
    """Handle photo upload"""
    if request.method == 'POST':
        files = request.FILES.getlist('photos') or [request.FILES.get('photo')]
        uploaded_files = [f for f in files if f]
        
        if uploaded_files:
            # Create mock project if needed
            project_id = str(uuid.uuid4())
            if not any(p.get('user_id') == request.user.id for p in MOCK_PROJECTS.values()):
                MOCK_PROJECTS[project_id] = {
                    'id': project_id,
                    'name': f"Project {len(MOCK_PROJECTS) + 1}",
                    'user_id': request.user.id,
                    'created_at': '2024-01-01',
                    'updated_at': '2024-01-01',
                    'description': 'Auto-created project',
                    'photo_count': 0
                }
            
            # Create mock photos
            photo_ids = []
            for file in uploaded_files:
                photo_id = str(uuid.uuid4())
                MOCK_PHOTOS[photo_id] = {
                    'id': photo_id,
                    'project_id': project_id,
                    'user_id': request.user.id,
                    'filename': file.name,
                    'size': file.size,
                    'status': 'uploaded',
                    'thumbnail': f'https://via.placeholder.com/200x200?text={file.name[:10]}',
                    'original_image': f'https://via.placeholder.com/800x600?text={file.name[:10]}',
                    'processed_image': None,
                    'created_at': '2024-01-01'
                }
                photo_ids.append(photo_id)
                MOCK_PROJECTS[project_id]['photo_count'] += 1
            
            # For AJAX requests
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Uploaded {len(uploaded_files)} file(s) successfully!',
                    'photo_ids': photo_ids,
                    'redirect_url': '/editor/'
                })
            
            messages.success(request, f'Uploaded {len(uploaded_files)} file(s) successfully!')
            return redirect('editor:dashboard')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'No files provided'})
            messages.error(request, 'No files provided')
            return redirect('editor:dashboard')
    
    context = {'page_title': 'Upload Photo'}
    return render(request, 'editor/upload.html', context)

@login_required
def editor_view(request, photo_id):
    """Photo editor interface"""
    # Get mock photo data
    photo = MOCK_PHOTOS.get(photo_id)
    if not photo or photo.get('user_id') != request.user.id:
        messages.error(request, 'Photo not found')
        return redirect('editor:dashboard')
    
    context = {
        'photo': {
            'id': photo_id,
            'original_image': {'url': photo.get('original_image', 'https://via.placeholder.com/800x600')},
            'processed_image': {'url': photo.get('processed_image')} if photo.get('processed_image') else None,
            'status': photo.get('status', 'uploaded'),
        },
        'settings': {
            'brightness': 0,
            'contrast': 0,
            'saturation': 0,
            'vibrance': 0,
            'exposure': 0,
        }
    }
    return render(request, 'editor/editor.html', context)

@csrf_exempt
@login_required
def apply_effects(request, photo_id):
    """Apply effects to photo"""
    if request.method == 'POST':
        photo = MOCK_PHOTOS.get(photo_id)
        if not photo or photo.get('user_id') != request.user.id:
            return JsonResponse({'success': False, 'error': 'Photo not found'})
        
        try:
            data = json.loads(request.body)
            
            # Update mock photo with processed version
            MOCK_PHOTOS[photo_id]['processed_image'] = f'https://via.placeholder.com/800x600?text=Processed+{photo_id[:8]}'
            MOCK_PHOTOS[photo_id]['status'] = 'completed'
            
            return JsonResponse({
                'success': True,
                'processed_url': MOCK_PHOTOS[photo_id]['processed_image'],
                'thumbnail_url': f'https://via.placeholder.com/200x200?text=Thumb+{photo_id[:8]}'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
@login_required
def generate_preview(request, photo_id):
    """Generate real-time preview"""
    if request.method == 'POST':
        photo = MOCK_PHOTOS.get(photo_id)
        if not photo or photo.get('user_id') != request.user.id:
            return JsonResponse({'success': False, 'error': 'Photo not found'})
        
        try:
            settings = json.loads(request.body)
            
            # Generate mock preview URL with settings
            preview_params = []
            for key, value in settings.items():
                if value != 0:
                    preview_params.append(f"{key}={value}")
            
            preview_text = f"Preview+{photo_id[:8]}"
            if preview_params:
                preview_text += f"+{'+'.join(preview_params[:2])}"  # Limit for URL length
            
            return JsonResponse({
                'success': True,
                'preview_url': f'https://via.placeholder.com/800x600?text={preview_text}'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@login_required
def detect_subjects(request, photo_id):
    """Detect subjects in photo"""
    photo = MOCK_PHOTOS.get(photo_id)
    if not photo or photo.get('user_id') != request.user.id:
        return JsonResponse({'success': False, 'error': 'Photo not found'})
    
    # Mock subject detection results
    mock_subjects = [
        {
            'type': 'person',
            'confidence': 0.95,
            'bbox': [100, 100, 200, 300],
            'mask': 'base64_encoded_mask_data'
        },
        {
            'type': 'object',
            'confidence': 0.87,
            'bbox': [300, 150, 100, 100],
            'mask': 'base64_encoded_mask_data'
        }
    ]
    
    return JsonResponse({'subjects': mock_subjects})

@login_required
def export_photo(request, photo_id):
    """Export photo"""
    photo = MOCK_PHOTOS.get(photo_id)
    if not photo or photo.get('user_id') != request.user.id:
        return JsonResponse({'success': False, 'error': 'Photo not found'})
    
    return JsonResponse({
        'success': True,
        'download_url': f'/editor/{photo_id}/download/'
    })

@login_required
def download_photo(request, photo_id):
    """Download photo"""
    photo = MOCK_PHOTOS.get(photo_id)
    if not photo or photo.get('user_id') != request.user.id:
        messages.error(request, 'Photo not found')
        return redirect('editor:dashboard')
    
    # Create a mock image file for download
    response = HttpResponse(content_type='image/jpeg')
    response['Content-Disposition'] = f'attachment; filename="photo_{photo_id[:8]}.jpg"'
    response.write(b'Mock image data - this would be the actual processed image')
    return response

@login_required
def project_list(request):
    """List all user projects"""
    user_projects = [p for p in MOCK_PROJECTS.values() if p.get('user_id') == request.user.id]
    
    # Add pagination
    paginator = Paginator(user_projects, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'editor/project_list.html', {
        'page_obj': page_obj,
        'page_title': 'Projects'
    })

@login_required
def project_detail(request, project_id):
    """Project detail view with all photos"""
    project = MOCK_PROJECTS.get(project_id)
    if not project or project.get('user_id') != request.user.id:
        messages.error(request, 'Project not found')
        return redirect('editor:projects')
    
    # Get photos for this project
    project_photos = [p for p in MOCK_PHOTOS.values() 
                     if p.get('project_id') == project_id and p.get('user_id') == request.user.id]
    
    # Add pagination
    paginator = Paginator(project_photos, 24)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'editor/project_detail.html', {
        'project': project,
        'page_obj': page_obj,
        'page_title': f"Project: {project.get('name', 'Untitled')}"
    })

@login_required
def batch_process_view(request):
    """Handle batch processing"""
    if request.method == 'POST':
        photo_ids = request.POST.getlist('photo_ids')
        
        if not photo_ids:
            return JsonResponse({'success': False, 'error': 'No photos selected'})
        
        # Mock batch processing
        job_id = str(uuid.uuid4())
        
        # Update selected photos status
        for photo_id in photo_ids:
            if photo_id in MOCK_PHOTOS and MOCK_PHOTOS[photo_id].get('user_id') == request.user.id:
                MOCK_PHOTOS[photo_id]['status'] = 'processing'
        
        return JsonResponse({
            'success': True,
            'job_id': job_id,
            'status_url': f'/editor/batch/status/{job_id}/',
            'message': f'Started batch processing {len(photo_ids)} photos'
        })
    
    # Show batch processing interface
    user_photos = [p for p in MOCK_PHOTOS.values() 
                  if p.get('user_id') == request.user.id and p.get('status') in ['uploaded', 'completed']]
    
    return render(request, 'editor/batch_process.html', {
        'photos': user_photos,
        'page_title': 'Batch Processing'
    })

@login_required
def batch_status(request, job_id):
    """Get batch processing status"""
    # Mock batch processing status
    import random
    import time
    
    # Simulate processing progress
    progress = min(100, int(time.time()) % 100)
    
    return JsonResponse({
        'status': 'completed' if progress >= 95 else 'processing',
        'progress': progress,
        'completed': max(0, progress - 10),
        'total': 100,
        'message': 'Processing photos...' if progress < 95 else 'Batch processing completed!'
    })

@login_required
def download_batch(request, job_id):
    """Download processed batch as ZIP"""
    # Create a mock ZIP file
    response = HttpResponse(content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="batch_{job_id[:8]}.zip"'
    
    # Create a mock ZIP in memory
    import io
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
        zip_file.writestr('readme.txt', 'This is a mock batch download.\nReal implementation would contain processed photos.')
        zip_file.writestr('photo1.jpg', b'Mock image data 1')
        zip_file.writestr('photo2.jpg', b'Mock image data 2')
    
    response.write(zip_buffer.getvalue())
    return response

@csrf_exempt
@login_required
def delete_project(request, project_id):
    """Delete project and all associated photos"""
    if request.method == 'POST':
        project = MOCK_PROJECTS.get(project_id)
        if not project or project.get('user_id') != request.user.id:
            return JsonResponse({'success': False, 'error': 'Project not found'})
        
        # Delete associated photos
        photos_to_delete = [pid for pid, photo in MOCK_PHOTOS.items() 
                           if photo.get('project_id') == project_id]
        for photo_id in photos_to_delete:
            del MOCK_PHOTOS[photo_id]
        
        # Delete project
        del MOCK_PROJECTS[project_id]
        
        messages.success(request, 'Project deleted successfully!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'Project deleted successfully!'})
        
        return redirect('editor:projects')
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

# Additional utility views
@login_required
def photo_list(request):
    """List all user photos"""
    user_photos = [p for p in MOCK_PHOTOS.values() if p.get('user_id') == request.user.id]
    
    # Add pagination
    paginator = Paginator(user_photos, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'editor/photo_list.html', {
        'page_obj': page_obj,
        'page_title': 'All Photos'
    })

@csrf_exempt
@login_required
def delete_photo(request, photo_id):
    """Delete a single photo"""
    if request.method == 'POST':
        photo = MOCK_PHOTOS.get(photo_id)
        if not photo or photo.get('user_id') != request.user.id:
            return JsonResponse({'success': False, 'error': 'Photo not found'})
        
        # Update project photo count
        project_id = photo.get('project_id')
        if project_id in MOCK_PROJECTS:
            MOCK_PROJECTS[project_id]['photo_count'] = max(0, MOCK_PROJECTS[project_id]['photo_count'] - 1)
        
        # Delete photo
        del MOCK_PHOTOS[photo_id]
        
        messages.success(request, 'Photo deleted successfully!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'Photo deleted successfully!'})
        
        return redirect('editor:dashboard')
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

# API endpoints for frontend
@csrf_exempt
@login_required
def api_photo_info(request, photo_id):
    """Get photo information via API"""
    photo = MOCK_PHOTOS.get(photo_id)
    if not photo or photo.get('user_id') != request.user.id:
        return JsonResponse({'success': False, 'error': 'Photo not found'})
    
    return JsonResponse({
        'success': True,
        'photo': photo
    })

@csrf_exempt
@login_required  
def api_project_info(request, project_id):
    """Get project information via API"""
    project = MOCK_PROJECTS.get(project_id)
    if not project or project.get('user_id') != request.user.id:
        return JsonResponse({'success': False, 'error': 'Project not found'})
    
    # Get project photos
    project_photos = [p for p in MOCK_PHOTOS.values() 
                     if p.get('project_id') == project_id]
    
    project_data = project.copy()
    project_data['photos'] = project_photos
    
    return JsonResponse({
        'success': True,
        'project': project_data
    })
