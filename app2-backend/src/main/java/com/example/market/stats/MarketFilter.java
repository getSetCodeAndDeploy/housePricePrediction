package com.example.market.stats;

import com.example.market.data.House;

/** Optional filters; null means "no limit". Bound from query params (minPrice, maxBedrooms, ...). */
public record MarketFilter(Double minPrice, Double maxPrice,
                           Integer minBedrooms, Integer maxBedrooms,
                           Integer minYear, Integer maxYear,
                           Double minSqft, Double maxSqft) {

    public boolean matches(House h) {
        return inRange(h.price(), minPrice, maxPrice)
                && inRange(h.bedrooms(), minBedrooms, maxBedrooms)
                && inRange(h.yearBuilt(), minYear, maxYear)
                && inRange(h.squareFootage(), minSqft, maxSqft);
    }

    private static boolean inRange(double value, Number min, Number max) {
        return (min == null || value >= min.doubleValue()) && (max == null || value <= max.doubleValue());
    }
}
