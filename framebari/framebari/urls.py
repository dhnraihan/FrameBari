# photo_editor/urls.py (main project URLs)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.accounts.urls')),
    path('editor/', include('apps.editor.urls')),
    path('api/', include('apps.api.urls')),
    path('storage/', include('apps.storage.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# apps/editor/urls.py
from django.urls import path
from . import views

app_name = 'editor'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('upload/', views.upload_photo, name='upload'),
    path('<uuid:photo_id>/', views.editor_view, name='editor'),
    path('<uuid:photo_id>/preview/', views.generate_preview, name='preview'),
    path('<uuid:photo_id>/apply/', views.apply_effects, name='apply'),
    path('<uuid:photo_id>/detect-subjects/', views.detect_subjects, name='detect_subjects'),
    path('<uuid:photo_id>/export/', views.export_photo, name='export'),
    path('<uuid:photo_id>/download/', views.download_photo, name='download'),
    path('batch/', views.batch_process_view, name='batch_process'),
    path('batch/status/<str:job_id>/', views.batch_status, name='batch_status'),
    path('batch/download/<str:job_id>/', views.download_batch, name='download_batch'),
    path('projects/', views.project_list, name='projects'),
    path('projects/<uuid:project_id>/', views.project_detail, name='project_detail'),
    path('projects/<uuid:project_id>/delete/', views.delete_project, name='delete_project'),
]

# apps/accounts/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'accounts'

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(template_name='accounts/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('profile/', views.profile, name='profile'),
    path('subscription/', views.subscription, name='subscription'),
]

# apps/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('photos', views.PhotoViewSet)
router.register('projects', views.ProjectViewSet)

urlpatterns = [
    path('v1/', include(router.urls)),
    path('v1/process/', views.ProcessPhotoAPI.as_view(), name='process_api'),
    path('v1/batch-process/', views.BatchProcessAPI.as_view(), name='batch_process_api'),
]
