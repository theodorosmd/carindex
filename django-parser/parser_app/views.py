from rest_framework import viewsets
from .models import Car
from .serializers import CarSerializer
from .filters import CarFilter


class CarViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Car.objects.all().order_by('-created_at')
    serializer_class = CarSerializer
    filterset_class = CarFilter
