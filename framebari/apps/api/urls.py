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
