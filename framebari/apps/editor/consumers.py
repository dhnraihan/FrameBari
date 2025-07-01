# apps/editor/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Photo

class EditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.photo_id = self.scope['url_route']['kwargs']['photo_id']
        self.room_group_name = f'editor_{self.photo_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data['type']
        
        if message_type == 'processing_update':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'processing_update',
                    'progress': data['progress'],
                    'status': data['status']
                }
            )
    
    async def processing_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'processing_update',
            'progress': event['progress'],
            'status': event['status']
        }))

class BatchConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.room_group_name = f'batch_{self.job_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def batch_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'batch_update',
            'completed': event['completed'],
            'total': event['total'],
            'status': event['status']
        }))
