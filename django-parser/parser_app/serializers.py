"""
Serializers API - format compatible Carindex mapDjangoCarToListing.
"""
from rest_framework import serializers
from .models import Car


class CarSerializer(serializers.ModelSerializer):
    source_id = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            'id', 'source', 'source_id', 'title', 'brand', 'model', 'price',
            'mileage', 'year', 'first_registration', 'first_seen_at', 'scraped_at',
            'sold', 'link', 'img_link', 'img_links', 'equipment', 'organization_phone',
            'organization_address', 'city', 'country', 'status_code',
            'hu_until_date', 'reg_number'
        ]

    def get_source_id(self, obj):
        return str(obj.id)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['url'] = data.get('link')
        data['price_amount'] = float(data['price']) if data.get('price') else None
        data['first_seen_at'] = instance.first_seen_at.isoformat() if instance.first_seen_at else None
        data['last_seen_at'] = instance.scraped_at.isoformat() if instance.scraped_at else data.get('first_seen_at')
        data['images'] = data.pop('img_links', None) or ([data.get('img_link')] if data.get('img_link') else [])
        data['dealer_phones'] = [data.pop('organization_phone')] if data.get('organization_phone') else []
        data['dealer_address'] = data.pop('organization_address', None)
        data['features'] = data.pop('equipment', None) or []
        return data
