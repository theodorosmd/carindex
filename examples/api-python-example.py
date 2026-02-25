"""
Carindex API - Python Example
==============================

This example demonstrates how to use the Carindex API with Python.
Requires: pip install requests
"""

import requests
import json
from typing import Optional, Dict, List

class CarindexAPI:
    """Carindex API client for Python"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.carindex.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_market_price(
        self,
        brand: str,
        model: str,
        year: int,
        mileage: int,
        country: str = "FR",
        fuel_type: Optional[str] = None,
        transmission: Optional[str] = None
    ) -> Dict:
        """
        Get market price and confidence index for a vehicle.
        
        Args:
            brand: Vehicle brand (e.g., "BMW")
            model: Vehicle model (e.g., "320d")
            year: Manufacturing year
            mileage: Mileage in km
            country: Country code (default: "FR")
            fuel_type: Optional fuel type
            transmission: Optional transmission type
            
        Returns:
            Dictionary with market price data
        """
        params = {
            "brand": brand,
            "model": model,
            "year": year,
            "mileage": mileage,
            "country": country
        }
        
        if fuel_type:
            params["fuel_type"] = fuel_type
        if transmission:
            params["transmission"] = transmission
        
        response = requests.get(
            f"{self.base_url}/market-price",
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def search_listings(
        self,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        country: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        """
        Search for vehicle listings.
        
        Returns:
            Dictionary with search results
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if brand:
            params["brand"] = brand
        if model:
            params["model"] = model
        if min_price:
            params["min_price"] = min_price
        if max_price:
            params["max_price"] = max_price
        if country:
            params["country"] = country
        
        response = requests.get(
            f"{self.base_url}/listings/search",
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def get_trends(
        self,
        brand: str,
        model: str,
        country: str = "FR",
        period: str = "30m"
    ) -> Dict:
        """
        Get market trends for a specific model.
        
        Args:
            brand: Vehicle brand
            model: Vehicle model
            country: Country code
            period: Time period ("30d", "90d", "6m", "12m", "30m")
            
        Returns:
            Dictionary with trend data
        """
        params = {
            "brand": brand,
            "model": model,
            "country": country,
            "period": period
        }
        
        response = requests.get(
            f"{self.base_url}/trends",
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def analyze_stock(self, vehicles: List[Dict]) -> Dict:
        """
        Analyze vehicle inventory against market data.
        
        Args:
            vehicles: List of vehicle dictionaries with:
                - id: Vehicle identifier
                - brand: Vehicle brand
                - model: Vehicle model
                - year: Manufacturing year
                - mileage: Mileage in km
                - asking_price: Current asking price
                - country: Country code
                
        Returns:
            Dictionary with stock analysis
        """
        payload = {"vehicles": vehicles}
        
        response = requests.post(
            f"{self.base_url}/stock/analyze",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def create_alert(
        self,
        name: str,
        alert_type: str,
        criteria: Dict,
        threshold: Optional[Dict] = None,
        webhook_url: Optional[str] = None
    ) -> Dict:
        """
        Create a custom alert.
        
        Args:
            name: Alert name
            alert_type: Type of alert ("price_drop", "new_listing", etc.)
            criteria: Search criteria dictionary
            threshold: Optional threshold configuration
            webhook_url: Optional webhook URL for notifications
            
        Returns:
            Dictionary with alert information
        """
        payload = {
            "name": name,
            "type": alert_type,
            "criteria": criteria
        }
        
        if threshold:
            payload["threshold"] = threshold
        if webhook_url:
            payload["webhook_url"] = webhook_url
        
        response = requests.post(
            f"{self.base_url}/alerts",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()


# Example Usage
if __name__ == "__main__":
    # Initialize API client
    api = CarindexAPI(api_key="YOUR_API_KEY_HERE")
    
    # Example 1: Get market price
    print("=== Example 1: Get Market Price ===")
    try:
        result = api.get_market_price(
            brand="BMW",
            model="320d",
            year=2020,
            mileage=50000,
            country="FR"
        )
        print(f"Market Price: €{result['market_price']:,.2f}")
        print(f"Confidence Index: {result['confidence_index']}%")
        print(f"Comparables: {result['comparables_count']}")
        print(f"Average Sales Time: {result['average_sales_time_days']} days")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 2: Search listings
    print("\n=== Example 2: Search Listings ===")
    try:
        results = api.search_listings(
            brand="BMW",
            model="320d",
            min_price=20000,
            max_price=30000,
            country="FR",
            limit=10
        )
        print(f"Total Results: {results['total']}")
        print(f"Returned: {len(results['listings'])} listings")
        for listing in results['listings'][:3]:
            print(f"  - {listing['year']} {listing['brand']} {listing['model']}: "
                  f"€{listing['price']:,.2f} ({listing['mileage']:,} km)")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 3: Analyze stock
    print("\n=== Example 3: Analyze Stock ===")
    try:
        my_stock = [
            {
                "id": "vehicle_001",
                "brand": "BMW",
                "model": "320d",
                "year": 2020,
                "mileage": 50000,
                "asking_price": 28000,
                "country": "FR"
            },
            {
                "id": "vehicle_002",
                "brand": "Mercedes-Benz",
                "model": "C-Class",
                "year": 2019,
                "mileage": 65000,
                "asking_price": 26500,
                "country": "FR"
            }
        ]
        
        analysis = api.analyze_stock(my_stock)
        print(f"Total Stock Value: €{analysis['total_stock_value']:,.2f}")
        print(f"Total Market Value: €{analysis['total_market_value']:,.2f}")
        print(f"\nVehicle Analysis:")
        for vehicle in analysis['vehicles']:
            status = vehicle['status']
            diff = vehicle['price_difference']
            print(f"  {vehicle['id']}: {status} (€{diff:+,.2f})")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 4: Get trends
    print("\n=== Example 4: Get Market Trends ===")
    try:
        trends = api.get_trends(
            brand="BMW",
            model="320d",
            country="FR",
            period="12m"
        )
        print(f"Trend Direction: {trends['insights']['trend_direction']}")
        print(f"Market Volume: {trends['insights']['market_volume']}")
        print(f"\nRecent Trends (last 3 months):")
        for trend in trends['trends'][-3:]:
            print(f"  {trend['month']}: €{trend['average_price']:,.2f} "
                  f"({trend['listings_count']} listings)")
    except Exception as e:
        print(f"Error: {e}")









