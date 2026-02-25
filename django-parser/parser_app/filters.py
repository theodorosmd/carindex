from django_filters import rest_framework as filters
from .models import Car


class CarFilter(filters.FilterSet):
    class Meta:
        model = Car
        fields = ['brand', 'model', 'status', 'sold', 'source']
