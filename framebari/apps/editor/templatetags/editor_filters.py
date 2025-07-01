from django import template

register = template.Library()

@register.filter
def status_color(status):
    """Return Bootstrap color class based on status"""
    status_colors = {
        'pending': 'warning',
        'processing': 'info', 
        'completed': 'success',
        'failed': 'danger',
        'uploaded': 'secondary',
    }
    return status_colors.get(status, 'secondary')

@register.filter  
def pluralize_bangla(value):
    """Simple pluralize filter"""
    return 's' if value != 1 else ''
