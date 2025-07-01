from django.urls import path
from . import views

app_name = 'editor'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('upload/', views.upload_photo, name='upload'),
    path('<str:photo_id>/', views.editor_view, name='editor'),
    path('<str:photo_id>/preview/', views.generate_preview, name='preview'),
    path('<str:photo_id>/apply/', views.apply_effects, name='apply'),
    path('<str:photo_id>/detect-subjects/', views.detect_subjects, name='detect_subjects'),
    path('<str:photo_id>/export/', views.export_photo, name='export'),
    path('<str:photo_id>/download/', views.download_photo, name='download'),
    path('<str:photo_id>/delete/', views.delete_photo, name='delete_photo'),
    path('batch/', views.batch_process_view, name='batch_process'),
    path('batch/status/<str:job_id>/', views.batch_status, name='batch_status'),
    path('batch/download/<str:job_id>/', views.download_batch, name='download_batch'),
    path('projects/', views.project_list, name='projects'),
    path('projects/<str:project_id>/', views.project_detail, name='project_detail'),
    path('projects/<str:project_id>/delete/', views.delete_project, name='delete_project'),
    
    # API endpoints
    path('api/photo/<str:photo_id>/', views.api_photo_info, name='api_photo_info'),
    path('api/project/<str:project_id>/', views.api_project_info, name='api_project_info'),
]
