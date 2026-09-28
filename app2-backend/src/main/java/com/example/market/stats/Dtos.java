package com.example.market.stats;

import java.util.List;

/** Response shapes for the market analysis endpoints (serialised as snake_case). */
public final class Dtos {
    private Dtos() {
    }

    public record Summary(int count, double avgPrice, double medianPrice, double minPrice, double maxPrice,
                          double stdDevPrice, double avgPricePerSqft, double avgSquareFootage) {
        static Summary empty() {
            return new Summary(0, 0, 0, 0, 0, 0, 0, 0);
        }
    }

    public record GroupStat(String key, int count, double avgPrice, double avgPricePerSqft) {
    }

    public record HistogramBin(double from, double to, int count) {
    }

    public record Correlation(String feature, double r) {
    }

    public record MarketStats(Summary summary, List<GroupStat> byBedrooms, List<GroupStat> byDecadeBuilt,
                              List<HistogramBin> priceHistogram, List<Correlation> priceCorrelations) {
        static MarketStats empty() {
            return new MarketStats(Summary.empty(), List.of(), List.of(), List.of(), List.of());
        }
    }

    public record HouseRow(int id, double squareFootage, int bedrooms, double bathrooms, int yearBuilt,
                           double lotSize, double distanceToCityCenter, double schoolRating,
                           double price, double pricePerSqft) {
    }

    public record PageResult<T>(List<T> items, long total, int page, int size) {
    }

    public record FeatureRange(String feature, double min, double max) {
    }
}
