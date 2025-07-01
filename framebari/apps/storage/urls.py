# apps/storage/urls.py
from django.urls import path
from . import views

app_name = 'storage'

urlpatterns = [
    path('', views.storage_dashboard, name='dashboard'),
    path('upload/', views.upload_file, name='upload'),
    path('files/<uuid:file_id>/', views.file_details, name='file_details'),
    path('files/<uuid:file_id>/download/', views.download_file, name='download'),
    path('files/<uuid:file_id>/delete/', views.delete_file, name='delete'),
    path('quota/', views.quota_info, name='quota'),
    path('cleanup/', views.cleanup_files, name='cleanup'),
    path('providers/', views.storage_providers, name='providers'),
]
