from django.contrib import admin
from .models import Contact

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'product', 'quantity', 'date_submitted')
    list_filter = ('product', 'date_submitted')
    search_fields = ('name', 'email', 'phone', 'message')
    readonly_fields = ('date_submitted',)
    list_per_page = 20
