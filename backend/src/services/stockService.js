import { calculateMarketPrice } from './marketPriceService.js';

export async function analyzeStockService(vehicles) {
  const analyzedVehicles = await Promise.all(
    vehicles.map(async (vehicle) => {
      const marketPrice = await calculateMarketPrice({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        country: vehicle.country || 'FR'
      });

      const priceDifference = vehicle.asking_price - (marketPrice.market_price || 0);
      const priceDifferencePercent = marketPrice.market_price
        ? (priceDifference / marketPrice.market_price) * 100
        : 0;

      let status = 'optimally_priced';
      let recommendation = 'maintain_price';

      if (priceDifferencePercent < -5) {
        status = 'underpriced';
        recommendation = 'increase_price';
      } else if (priceDifferencePercent > 5) {
        status = 'overpriced';
        recommendation = 'decrease_price';
      }

      return {
        id: vehicle.id,
        market_price: marketPrice.market_price,
        asking_price: vehicle.asking_price,
        price_difference: Math.round(priceDifference),
        price_difference_percent: Math.round(priceDifferencePercent * 100) / 100,
        status,
        confidence_index: marketPrice.confidence_index,
        average_sales_time_days: marketPrice.average_sales_time_days,
        recommendation
      };
    })
  );

  const totalStockValue = vehicles.reduce((sum, v) => sum + v.asking_price, 0);
  const totalMarketValue = analyzedVehicles.reduce(
    (sum, v) => sum + (v.market_price || 0),
    0
  );

  const summary = {
    underpriced_count: analyzedVehicles.filter(v => v.status === 'underpriced').length,
    overpriced_count: analyzedVehicles.filter(v => v.status === 'overpriced').length,
    optimally_priced_count: analyzedVehicles.filter(v => v.status === 'optimally_priced').length,
    average_days_on_market: Math.round(
      analyzedVehicles.reduce((sum, v) => sum + v.average_sales_time_days, 0) / analyzedVehicles.length
    ),
    market_day_supply: Math.round(
      analyzedVehicles.reduce((sum, v) => sum + v.average_sales_time_days, 0) / analyzedVehicles.length
    )
  };

  return {
    total_stock_value: Math.round(totalStockValue),
    total_market_value: Math.round(totalMarketValue),
    vehicles: analyzedVehicles,
    summary
  };
}









