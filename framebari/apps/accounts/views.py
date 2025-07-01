# apps/accounts/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from .models import UserProfile
from apps.editor.models import Project, Photo

def home(request):
    if request.user.is_authenticated:
        return redirect('editor:dashboard')
    return render(request, 'accounts/home.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('editor:dashboard')
    else:
        form = UserCreationForm()
    return render(request, 'accounts/register.html', {'form': form})

@login_required
def profile(request):
    profile = request.user.userprofile
    projects = Project.objects.filter(user=request.user)
    photos = Photo.objects.filter(project__user=request.user)
    
    context = {
        'profile': profile,
        'projects_count': projects.count(),
        'photos_count': photos.count(),
        'photos_processed_this_month': profile.photos_processed_this_month,
        'storage_used_mb': profile.storage_used / (1024 * 1024),
        'max_storage_mb': profile.max_storage / (1024 * 1024),
    }
    return render(request, 'accounts/profile.html', context)

@login_required
def subscription(request):
    profile = request.user.userprofile
    return render(request, 'accounts/subscription.html', {'profile': profile})
