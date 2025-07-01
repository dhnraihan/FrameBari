# apps/editor/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/editor/(?P<photo_id>\w+)/$', consumers.EditorConsumer.as_asgi()),
    re_path(r'ws/batch/(?P<job_id>\w+)/$', consumers.BatchConsumer.as_asgi()),
]
