# apps/storage/services.py
import os
import hashlib
import mimetypes
from datetime import timedelta
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image
import boto3
from botocore.exceptions import ClientError
import requests

from .models import StorageProvider, FileStorage, StorageQuota, FileVersion

class StorageService:
    def __init__(self):
        self.providers = {
            'local': LocalStorageProvider(),
            's3': S3StorageProvider(),
            'gcs': GCSStorageProvider(),
            'azure': AzureStorageProvider(),
        }
    
    def upload_file(self, user, file, provider_name=None):
        """Upload file to storage provider"""
        try:
            # Get storage provider
            if provider_name:
                provider = StorageProvider.objects.get(
                    name=provider_name, 
                    is_active=True
                )
            else:
                provider = StorageProvider.objects.filter(
                    is_primary=True, 
                    is_active=True
                ).first()
                
            if not provider:
                raise StorageError("No active storage provider found")
            
            # Check quota
            quota = self.get_or_create_quota(user)
            if not quota.can_upload_file(file.size):
                raise QuotaExceededError("Storage quota exceeded")
            
            # Check file type
            if not self.is_allowed_file_type(file, provider):
                raise StorageError("File type not allowed")
            
            # Generate file hash
            file_hash = self.calculate_file_hash(file)
            
            # Check for duplicate
            existing_file = FileStorage.objects.filter(
                user=user,
                file_hash=file_hash,
                status='stored'
            ).first()
            
            if existing_file:
                existing_file.mark_accessed()
                return existing_file
            
            # Create file storage record
            stored_filename = self.generate_filename(file.name, file_hash)
            file_storage = FileStorage.objects.create(
                user=user,
                provider=provider,
                original_filename=file.name,
                stored_filename=stored_filename,
                file_size=file.size,
                content_type=file.content_type or mimetypes.guess_type(file.name)[0],
                file_hash=file_hash,
                status='uploading'
            )
            
            # Get storage provider instance
            storage_provider = self.providers[provider.provider_type]
            
            # Upload file
            file_path = storage_provider.upload(file, stored_filename, provider.config)
            
            # Update file storage record
            file_storage.file_path = file_path
            file_storage.status = 'stored'
            file_storage.upload_progress = 100
            
            # Extract metadata for images
            if file.content_type and file.content_type.startswith('image/'):
                metadata = self.extract_image_metadata(file)
                file_storage.width = metadata.get('width')
                file_storage.height = metadata.get('height')
                file_storage.metadata = metadata
            
            file_storage.save()
            
            # Update quota
            quota.update_usage(file.size, 1)
            
            return file_storage
            
        except Exception as e:
            if 'file_storage' in locals():
                file_storage.status = 'failed'
                file_storage.error_message = str(e)
                file_storage.save()
            raise StorageError(f"Upload failed: {str(e)}")
    
    def delete_file(self, file_storage):
        """Delete file from storage"""
        try:
            provider = file_storage.provider
            storage_provider = self.providers[provider.provider_type]
            
            # Delete from storage provider
            storage_provider.delete(file_storage.file_path, provider.config)
            
            # Update file record
            file_storage.status = 'deleted'
            file_storage.save()
            
            # Update quota
            quota = self.get_or_create_quota(file_storage.user)
            quota.update_usage(-file_storage.file_size, -1)
            
            return True
            
        except Exception as e:
            raise StorageError(f"Delete failed: {str(e)}")
    
    def get_file_url(self, file_storage, expires_in=3600):
        """Get download URL for file"""
        if file_storage.status != 'stored':
            return None
        
        provider = file_storage.provider
        storage_provider = self.providers[provider.provider_type]
        
        # Mark as accessed
        file_storage.mark_accessed()
        
        return storage_provider.get_url(file_storage.file_path, provider.config, expires_in)
    
    def create_file_version(self, file_storage, processed_file, settings, operation):
        """Create a new version of a file"""
        try:
            # Calculate version number
            last_version = FileVersion.objects.filter(
                file_storage=file_storage
            ).order_by('-version_number').first()
            
            version_number = (last_version.version_number + 1) if last_version else 1
            
            # Generate filename for version
            file_hash = self.calculate_file_hash(processed_file)
            stored_filename = self.generate_filename(
                f"{file_storage.original_filename}_v{version_number}",
                file_hash
            )
            
            # Upload processed file
            provider = file_storage.provider
            storage_provider = self.providers[provider.provider_type]
            file_path = storage_provider.upload(processed_file, stored_filename, provider.config)
            
            # Create version record
            version = FileVersion.objects.create(
                file_storage=file_storage,
                version_number=version_number,
                stored_filename=stored_filename,
                file_path=file_path,
                file_size=processed_file.size,
                file_hash=file_hash,
                processing_settings=settings,
                created_by_operation=operation
            )
            
            return version
            
        except Exception as e:
            raise StorageError(f"Version creation failed: {str(e)}")
    
    def cleanup_expired_files(self):
        """Clean up expired files"""
        expired_files = FileStorage.objects.filter(
            expires_at__lt=timezone.now(),
            status='stored'
        )
        
        for file_storage in expired_files:
            try:
                self.delete_file(file_storage)
            except Exception as e:
                print(f"Failed to delete expired file {file_storage.id}: {e}")
    
    def cleanup_user_files(self, user, days_old=30):
        """Clean up old files for a user"""
        cutoff_date = timezone.now() - timedelta(days=days_old)
        old_files = FileStorage.objects.filter(
            user=user,
            accessed_at__lt=cutoff_date,
            status='stored'
        )
        
        for file_storage in old_files:
            try:
                self.delete_file(file_storage)
            except Exception as e:
                print(f"Failed to delete old file {file_storage.id}: {e}")
    
    def get_or_create_quota(self, user):
        """Get or create storage quota for user"""
        quota, created = StorageQuota.objects.get_or_create(
            user=user,
            defaults={
                'total_quota': getattr(settings, 'DEFAULT_STORAGE_QUOTA', 1024 * 1024 * 1024),
                'max_files': getattr(settings, 'DEFAULT_MAX_FILES', 1000),
            }
        )
        return quota
    
    def calculate_file_hash(self, file):
        """Calculate SHA-256 hash of file"""
        hash_sha256 = hashlib.sha256()
        for chunk in file.chunks():
            hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def generate_filename(self, original_name, file_hash):
        """Generate unique filename"""
        name, ext = os.path.splitext(original_name)
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        return f"{timestamp}_{file_hash[:8]}{ext}"
    
    def extract_image_metadata(self, file):
        """Extract metadata from image file"""
        try:
            with Image.open(file) as img:
                metadata = {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                }
                
                # Extract EXIF data if available
                if hasattr(img, '_getexif') and img._getexif():
                    exif = img._getexif()
                    metadata['exif'] = {k: v for k, v in exif.items() if isinstance(v, (str, int, float))}
                
                return metadata
        except Exception:
            return {}
    
    def is_allowed_file_type(self, file, provider):
        """Check if file type is allowed"""
        if not provider.allowed_formats:
            return True
        
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        return content_type in provider.allowed_formats

class LocalStorageProvider:
    """Local file system storage provider"""
    
    def upload(self, file, filename, config):
        """Upload file to local storage"""
        file_path = default_storage.save(filename, file)
        return file_path
    
    def delete(self, file_path, config):
        """Delete file from local storage"""
        if default_storage.exists(file_path):
            default_storage.delete(file_path)
    
    def get_url(self, file_path, config, expires_in=3600):
        """Get URL for local file"""
        return default_storage.url(file_path)

class S3StorageProvider:
    """Amazon S3 storage provider"""
    
    def __init__(self):
        self.s3_client = None
    
    def _get_client(self, config):
        """Get S3 client with configuration"""
        if not self.s3_client:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=config.get('access_key_id'),
                aws_secret_access_key=config.get('secret_access_key'),
                region_name=config.get('region', 'us-east-1')
            )
        return self.s3_client
    
    def upload(self, file, filename, config):
        """Upload file to S3"""
        s3_client = self._get_client(config)
        bucket_name = config['bucket_name']
        key = f"{config.get('prefix', '')}{filename}"
        
        try:
            s3_client.upload_fileobj(file, bucket_name, key)
            return key
        except ClientError as e:
            raise StorageError(f"S3 upload failed: {e}")
    
    def delete(self, file_path, config):
        """Delete file from S3"""
        s3_client = self._get_client(config)
        bucket_name = config['bucket_name']
        
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=file_path)
        except ClientError as e:
            raise StorageError(f"S3 delete failed: {e}")
    
    def get_url(self, file_path, config, expires_in=3600):
        """Get presigned URL for S3 file"""
        s3_client = self._get_client(config)
        bucket_name = config['bucket_name']
        
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': file_path},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            raise StorageError(f"S3 URL generation failed: {e}")

class GCSStorageProvider:
    """Google Cloud Storage provider"""
    
    def upload(self, file, filename, config):
        # Implementation for Google Cloud Storage
        raise NotImplementedError("GCS provider not implemented")
    
    def delete(self, file_path, config):
        raise NotImplementedError("GCS provider not implemented")
    
    def get_url(self, file_path, config, expires_in=3600):
        raise NotImplementedError("GCS provider not implemented")

class AzureStorageProvider:
    """Azure Blob Storage provider"""
    
    def upload(self, file, filename, config):
        # Implementation for Azure Blob Storage
        raise NotImplementedError("Azure provider not implemented")
    
    def delete(self, file_path, config):
        raise NotImplementedError("Azure provider not implemented")
    
    def get_url(self, file_path, config, expires_in=3600):
        raise NotImplementedError("Azure provider not implemented")

class StorageError(Exception):
    """General storage error"""
    pass

class QuotaExceededError(StorageError):
    """Storage quota exceeded error"""
    pass
