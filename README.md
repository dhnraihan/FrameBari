# Photo Editor Pro 🎨

A powerful, next-generation photo editing web application built with Django, featuring AI-powered tools, professional-grade enhancements, and real-time collaboration capabilities.

![Photo Editor Pro](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Django](https://img.shields.io/badge/django-4.2.7-green.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🎯 Core Photo Editing
- **Professional Enhancement Tools**: Brightness, contrast, saturation, vibrance, exposure controls
- **Advanced Color Grading**: Built-in cinematic LUTs and custom color presets
- **Smart Quality Optimization**: Automatic compression and format conversion
- **Batch Processing**: Process multiple photos simultaneously
- **Real-time Preview**: Instant visual feedback with optimized rendering

### 🤖 AI-Powered Features
- **Subject Auto-Detection**: Intelligent object and portrait recognition
- **Background Removal**: One-click AI background removal
- **Smart Cropping**: Automatic composition optimization
- **Noise Reduction**: Advanced denoising algorithms

### 🎨 Creative Tools
- **Background Replacement**: Blue screen effects with multiple styles
- **Advanced Filters**: Vintage, sepia, HDR, oil painting, watercolor effects
- **Subject-Specific Editing**: Apply different effects to detected subjects
- **Custom Presets**: Save and share your editing styles

### 📱 Modern Experience
- **Progressive Web App (PWA)**: Install on mobile devices
- **Responsive Design**: Works seamlessly on all screen sizes
- **Touch Gestures**: Intuitive mobile editing experience
- **Offline Support**: Continue working without internet connection

### 🔐 Enterprise Features
- **User Management**: Role-based access control
- **Subscription System**: Stripe integration with multiple plans
- **Analytics Dashboard**: Comprehensive usage analytics
- **API Access**: RESTful API for third-party integrations
- **Cloud Storage**: AWS S3 integration with CDN support

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 16+
- Redis 6+
- PostgreSQL 13+
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/dhnraihan/FrameBari.git
cd FrameBari
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
npm install  # For frontend dependencies
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Set up database**
```bash
python manage.py migrate
python manage.py createsuperuser
```

6. **Install ML models**
```bash
python manage.py download_models
```

7. **Run the application**
```bash
# Start Redis
redis-server

# Start Celery worker
celery -A photo_editor worker --loglevel=info

# Start Django development server
python manage.py runserver
```

Visit `http://localhost:8000` to access the application.

## 🐳 Docker Setup

### Development with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -f Dockerfile.prod -t framebari:latest .

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Project Structure

```
framebari/
├── apps/
│   ├── accounts/           # User authentication & profiles
│   ├── analytics/          # Usage analytics & reporting
│   ├── api/               # REST API endpoints
│   ├── editor/            # Core photo editing functionality
│   ├── monitoring/        # System monitoring & logging
│   ├── notifications/     # Email & push notifications
│   ├── payments/          # Stripe payment integration
│   ├── processing/        # Image processing engine
│   └── storage/           # File storage management
├── static/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   ├── icons/            # PWA icons
│   └── images/           # Static images
├── templates/
│   ├── accounts/         # Authentication templates
│   ├── editor/           # Editor interface templates
│   ├── analytics/        # Analytics dashboard
│   └── base.html         # Base template
├── media/                # User uploaded files
├── ml_models/            # AI/ML model files
├── logs/                 # Application logs
├── docker-compose.yml    # Development Docker setup
├── docker-compose.prod.yml # Production Docker setup
├── Dockerfile            # Development Docker image
├── Dockerfile.prod       # Production Docker image
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
├── manage.py            # Django management script
└── sw.js                # Service Worker for PWA
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Basic Configuration
DEBUG=False
SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgres://user:password@localhost:5432/photo_editor

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS S3 (Optional)
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1

# Stripe Payment
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Django Settings

Key settings can be customized in `framebari/settings.py`:

```python
# Photo Processing Limits
MAX_IMAGE_SIZE = (4000, 4000)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP', 'TIFF']

# Cache Configuration
PHOTO_CACHE_TIMEOUT = 3600  # 1 hour

# Analytics
ANALYTICS_ENABLED = True
TRACK_ANONYMOUS_USERS = True
```

## 🎨 Usage Examples

### Basic Photo Editing

```python
from apps.processing.engine import PhotoProcessor

# Initialize processor
processor = PhotoProcessor('path/to/image.jpg')

# Apply basic enhancements
processor.enhance_photo(
    brightness=20,
    contrast=10,
    saturation=15,
    vibrance=5
)

# Apply color grading
from apps.processing.color_grading import ColorGradingEngine
color_engine = ColorGradingEngine()
processor.working_image = color_engine.apply_lut(
    processor.working_image, 
    'cinematic_warm', 
    intensity=0.8
)

# Save result
processor.save('output.jpg', quality=85)
```

### Background Replacement

```python
from apps.processing.background_engine import AdvancedBackgroundEngine

# Remove background
processor.remove_background()

# Replace with custom background
bg_engine = AdvancedBackgroundEngine()
processor.working_image = bg_engine.replace_background(
    processor.working_image,
    mask=None,
    style='blue_neon'
)
```

### Batch Processing

```python
from apps.processing.batch_processor import BatchProcessor

# Process multiple photos
batch_processor = BatchProcessor()
settings = {
    'brightness': 10,
    'contrast': 5,
    'color_grade': 'vintage'
}

job_id = batch_processor.process_batch(photo_ids, settings)
```

## 🔌 API Documentation

### Authentication

All API endpoints require authentication. Include the token in headers:

```bash
Authorization: Token your-api-token
```

### Endpoints

#### Upload Photo
```bash
POST /api/v1/photos/
Content-Type: multipart/form-data

{
  "project": "project-uuid",
  "original_image": file
}
```

#### Process Photo
```bash
POST /api/v1/photos/{photo_id}/process/
Content-Type: application/json

{
  "brightness": 10,
  "contrast": 5,
  "saturation": 0,
  "replace_background": true,
  "background_style": "blue_neon"
}
```

#### Batch Process
```bash
POST /api/v1/batch-process/
Content-Type: application/json

{
  "photo_ids": ["uuid1", "uuid2", "uuid3"],
  "settings": {
    "brightness": 15,
    "contrast": 10,
    "color_grade": "cinematic_warm"
  }
}
```

#### Get Projects
```bash
GET /api/v1/projects/
```

Response:
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/v1/projects/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "name": "My Project",
      "created_at": "2024-01-01T00:00:00Z",
      "photo_count": 5
    }
  ]
}
```

### Rate Limits

- **Free Plan**: 100 requests/hour
- **Pro Plan**: 1000 requests/hour
- **Premium Plan**: 5000 requests/hour

## 📊 Analytics & Monitoring

### Built-in Analytics

Access analytics dashboard at `/admin/analytics/` (admin required):

- User engagement metrics
- Photo processing statistics
- Conversion funnel analysis
- Feature usage tracking
- Performance monitoring

### Custom Event Tracking

```python
from apps.analytics.services import AnalyticsService

analytics = AnalyticsService()
analytics.track_event(
    event_type='feature_use',
    event_name='background_removal',
    user=request.user,
    properties={
        'processing_time': 2.5,
        'image_size': '1920x1080'
    },
    request=request
)
```

### Health Monitoring

System health endpoints:

- `/health/` - Basic health check
- `/health/detailed/` - Detailed system status
- `/metrics/` - Prometheus metrics (if enabled)

## 🚀 Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in production
- [ ] Configure secure database with SSL
- [ ] Set up Redis cluster for scalability
- [ ] Configure AWS S3 with CloudFront CDN
- [ ] Set up SSL certificates (Let's Encrypt recommended)
- [ ] Configure email service (SendGrid, AWS SES)
- [ ] Set up monitoring (Sentry, New Relic)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Docker Production Deployment

```bash
# Build production image
docker build -f Dockerfile.prod -t FrameBari:latest .

# Tag for registry
docker tag photo-editor-pro:latest dhnraihan/FrameBari:latest

# Push to registry
docker push dhnraihan/FrameBari:latest

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: FrameBari
spec:
  replicas: 3
  selector:
    matchLabels:
      app: FrameBari
  template:
    metadata:
      labels:
        app: FrameBari
    spec:
      containers:
      - name: web
        image: dhnraihan/FrameBari:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
```

### Performance Optimization

#### Database Optimization
```python
# Add indexes for frequently queried fields
class Photo(models.Model):
    # ... fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['project', 'created_at']),
        ]
```

#### Caching Strategy
```python
# Redis caching configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache processed images
CACHE_MIDDLEWARE_SECONDS = 3600
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.editor

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load testing with locust
- **Security Tests**: OWASP security scanning

### Writing Tests

```python
# apps/editor/tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from .models import Project, Photo

class PhotoProcessingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
    def test_photo_enhancement(self):
        """Test basic photo enhancement"""
        # Test implementation
        pass
```

## 🔧 Development

### Development Setup

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install

# Run development server with debug
python manage.py runserver --settings=framebari.settings.development
```

### Code Quality

```bash
# Format code
black .
isort .

# Lint code
flake8 .
pylint apps/

# Type checking
mypy apps/
```

### Database Migrations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset migrations (development only)
python manage.py reset_migrations
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Contributing Process

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow our coding standards
4. **Add tests**: Ensure good test coverage
5. **Commit changes**: Use conventional commit messages
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Create Pull Request**: Describe your changes

### Coding Standards

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add docstrings to all functions and classes
- Write tests for new functionality
- Update documentation as needed

### Commit Message Format

```
type(scope): subject

body

footer
```

Examples:
```
feat(editor): add vintage filter effect
fix(api): resolve upload timeout issue
docs(readme): update installation instructions
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Frame-Bari

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support

### Documentation
- [User Guide](docs/user-guide.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- [GitHub Issues](https://github.com/dhnraihan/FrameBari/issues)
- [Discussions](https://github.com/dhnraihan/FrameBari/discussions)
- [Discord Server](https://discord.gg/photo-editor-pro)

### Commercial Support
For enterprise support, custom development, or consulting:
- Email: hello@raihan.xyz
- Website: https://raihan.xyz

## 🗺️ Roadmap

### Version 1.1 (Coming Soon)
- [ ] Advanced AI upscaling
- [ ] Video processing support
- [ ] Real-time collaboration
- [ ] Mobile app (React Native)

### Version 1.2
- [ ] Plugin system
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Template marketplace

### Version 2.0
- [ ] AI-powered auto-editing
- [ ] 3D photo effects
- [ ] Enterprise SSO integration
- [ ] Advanced workflow automation

## 🙏 Acknowledgments

- [Django](https://djangoproject.com/) - Web framework
- [OpenCV](https://opencv.org/) - Computer vision library
- [PIL/Pillow](https://pillow.readthedocs.io/) - Image processing
- [Celery](https://celeryproject.org/) - Distributed task queue
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Stripe](https://stripe.com/) - Payment processing

## 📈 Statistics

![GitHub stars](https://img.shields.io/github/stars/dhnraihan/FrameBari)
![GitHub forks](https://img.shields.io/github/forks/dhnraihan/FrameBari)
![GitHub issues](https://img.shields.io/github/issues/dhnraihan/FrameBari)
![GitHub pull requests](https://img.shields.io/github/issues-pr/dhnraihan/FrameBari)

---

**Raihan Built with ❤️ by the Photo Editor Pro team**

*Transform your photos with professional-grade editing tools, powered by AI and built for the modern web.*