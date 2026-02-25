"""
Modèle Car - compatible avec mapDjangoCarToListing (Carindex).
"""
from django.db import models


class Car(models.Model):
    """Listing véhicule - importable vers Supabase via Carindex."""
    link = models.URLField(max_length=3000, unique=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    brand = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    model = models.CharField(max_length=200, blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    mileage = models.CharField(max_length=200, blank=True, null=True)
    year = models.IntegerField(null=True, blank=True)
    first_registration = models.CharField(max_length=100, blank=True, null=True)
    img_link = models.URLField(max_length=3000, blank=True, null=True)
    img_links = models.JSONField(default=list, blank=True, null=True)
    equipment = models.JSONField(default=list, blank=True, null=True)
    organization_phone = models.CharField(max_length=300, blank=True, null=True)
    organization_address = models.CharField(max_length=500, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=10, blank=True, null=True)
    sold = models.BooleanField(default=False)
    status_code = models.IntegerField(null=True, blank=True)
    hu_until_date = models.DateField(null=True, blank=True)
    reg_number = models.CharField(max_length=50, blank=True, null=True)

    source = models.CharField(max_length=50, default='custom', db_index=True)
    status = models.CharField(
        max_length=20,
        default='OK',
        choices=[('Pending', 'Pending'), ('Retry', 'Retry'), ('OK', 'OK'), ('Error', 'Error')],
        db_index=True
    )
    first_seen_at = models.DateTimeField(auto_now_add=True)
    scraped_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title or self.link} [{self.status}]"
