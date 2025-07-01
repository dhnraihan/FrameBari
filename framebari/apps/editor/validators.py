# apps/editor/validators.py
from django.core.exceptions import ValidationError
import re

def validate_hex_color(value):
    """Validate hex color format"""
    if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
        raise ValidationError('Invalid hex color format')

def validate_image_settings(settings):
    """Validate image processing settings"""
    ranges = {
        'brightness': (-100, 100),
        'contrast': (-100, 100),
        'saturation': (-100, 100),
        'vibrance': (-100, 100),
        'exposure': (-100, 100)
    }
    
    for key, value in settings.items():
        if key in ranges:
            min_val, max_val = ranges[key]
            if not (min_val <= int(value) <= max_val):
                raise ValidationError(f'{key} must be between {min_val} and {max_val}')
