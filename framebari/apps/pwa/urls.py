from django.urls import path
from . import views

urlpatterns = [
    path('manifest.json', views.manifest, name='pwa_manifest'),
    path('offline/', views.offline, name='pwa_offline'),
]
