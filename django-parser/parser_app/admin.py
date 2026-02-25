from django.contrib import admin
from .models import Car


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'brand', 'model', 'price', 'status', 'source', 'created_at']
    list_filter = ['status', 'source', 'sold']
    search_fields = ['title', 'brand', 'model']
    readonly_fields = ['created_at', 'first_seen_at']
