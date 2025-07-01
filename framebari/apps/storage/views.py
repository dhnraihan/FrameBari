#  apps/storage/views.py
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.db.models import Sum, Count
import json

from .models import FileStorage, StorageQuota, StorageProvider
from .services import StorageService, StorageError, QuotaExceededError

@login_required
def storage_dashboard(request):
    """Storage management dashboard"""
    quota = StorageService().get_or_create_quota(request.user)
    
    # Get user's files
    files = FileStorage.objects.filter(
        user=request.user,
        status='stored'
    ).order_by('-created_at')
    
    # Pagination
    paginator = Paginator(files, 24)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Statistics
    stats = {
        'total_files': files.count(),
        'total_size': files.aggregate(total=Sum('file_size'))['total'] or 0,
        'usage_percentage': quota.usage_percentage,
        'available_storage': quota.available_storage,
    }
    
    return render(request, 'storage/dashboard.html', {
        'page_obj': page_obj,
        'quota': quota,
        'stats': stats,
    })

@csrf_exempt
@login_required
@require_POST
def upload_file(request):
    """Upload file endpoint"""
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'success': False, 'error': 'No file provided'})
        
        file = request.FILES['file']
        provider_name = request.POST.get('provider')
        
        storage_service = StorageService()
        file_storage = storage_service.upload_file(request.user, file, provider_name)
        
        return JsonResponse({
            'success': True,
            'file_id': str(file_storage.id),
            'filename': file_storage.original_filename,
            'size': file_storage.file_size,
            'url': file_storage.url,
        })
        
    except QuotaExceededError as e:
        return JsonResponse({
            'success': False,
            'error': 'Storage quota exceeded',
            'error_type': 'quota_exceeded'
        }, status=413)
        
    except StorageError as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'Upload failed'
        }, status=500)

@login_required
def download_file(request, file_id):
    """Download file"""
    try:
        file_storage = get_object_or_404(
            FileStorage,
            id=file_id,
            user=request.user,
            status='stored'
        )
        
        storage_service = StorageService()
        download_url = storage_service.get_file_url(file_storage)
        
        if download_url:
            # Update bandwidth usage
            quota = storage_service.get_or_create_quota(request.user)
            quota.monthly_bandwidth_used += file_storage.file_size
            quota.save(update_fields=['monthly_bandwidth_used'])
            
            # Redirect to the actual file URL
            from django.shortcuts import redirect
            return redirect(download_url)
        else:
            raise Http404("File not found")
            
    except Exception as e:
        raise Http404("File not found")

@csrf_exempt
@login_required
@require_POST
def delete_file(request, file_id):
    """Delete file"""
    try:
        file_storage = get_object_or_404(
            FileStorage,
            id=file_id,
            user=request.user
        )
        
        storage_service = StorageService()
        storage_service.delete_file(file_storage)
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@login_required
def file_details(request, file_id):
    """Get file details"""
    file_storage = get_object_or_404(
        FileStorage,
        id=file_id,
        user=request.user
    )
    
    # Get file versions
    versions = file_storage.versions.all()
    
    data = {
        'id': str(file_storage.id),
        'filename': file_storage.original_filename,
        'size': file_storage.file_size,
        'content_type': file_storage.content_type,
        'created_at': file_storage.created_at.isoformat(),
        'accessed_at': file_storage.accessed_at.isoformat(),
        'status': file_storage.status,
        'metadata': file_storage.metadata,
        'versions': [
            {
                'version': version.version_number,
                'size': version.file_size,
                'created_at': version.created_at.isoformat(),
                'operation': version.created_by_operation,
                'settings': version.processing_settings,
            }
            for version in versions
        ]
    }
    
    return JsonResponse(data)

@login_required
def quota_info(request):
    """Get user's quota information"""
    quota = StorageService().get_or_create_quota(request.user)
    quota.reset_bandwidth_if_needed()
    
    data = {
        'total_quota': quota.total_quota,
        'used_storage': quota.used_storage,
        'available_storage': quota.available_storage,
        'usage_percentage': quota.usage_percentage,
        'file_count': quota.file_count,
        'max_files': quota.max_files,
        'monthly_bandwidth_limit': quota.monthly_bandwidth_limit,
        'monthly_bandwidth_used': quota.monthly_bandwidth_used,
        'bandwidth_usage_percentage': quota.bandwidth_usage_percentage,
    }
    
    return JsonResponse(data)

@csrf_exempt
@login_required
@require_POST
def cleanup_files(request):
    """Clean up old files"""
    try:
        data = json.loads(request.body)
        days_old = data.get('days_old', 30)
        
        storage_service = StorageService()
        storage_service.cleanup_user_files(request.user, days_old)
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@login_required
def storage_providers(request):
    """Get available storage providers"""
    providers = StorageProvider.objects.filter(is_active=True)
    
    data = [
        {
            'name': provider.name,
            'provider_type': provider.provider_type,
            'is_primary': provider.is_primary,
            'max_file_size': provider.max_file_size,
            'allowed_formats': provider.allowed_formats,
        }
        for provider in providers
    ]
    
    return JsonResponse({'providers': data})
