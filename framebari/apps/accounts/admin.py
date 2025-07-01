# apps/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ['username', 'email', 'first_name', 'last_name', 
                   'subscription_type', 'photos_processed', 'is_active']
    list_filter = ['is_active', 'userprofile__subscription_type']
    
    def subscription_type(self, obj):
        return obj.userprofile.subscription_type
    subscription_type.short_description = 'Subscription'
    
    def photos_processed(self, obj):
        return obj.userprofile.photos_processed_this_month
    photos_processed.short_description = 'Photos This Month'

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

