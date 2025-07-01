# framebari/urls.py (main project URLs)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.accounts.urls')),
    path('editor/', include('apps.editor.urls')),
    path('pwa/', include('apps.pwa.urls')),
    # path('api/', include('apps.api.urls')),
    # path('storage/', include('apps.storage.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

