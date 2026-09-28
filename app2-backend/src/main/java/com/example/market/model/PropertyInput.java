package com.example.market.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.Map;

/** Features of one property. Limits mirror the model API so bad input fails fast here. */
public record PropertyInput(
        @NotNull @DecimalMin(value = "200", inclusive = false) @DecimalMax("20000") Double squareFootage,
        @NotNull @Min(0) @Max(20) Integer bedrooms,
        @NotNull @DecimalMin("0.5") @DecimalMax("20") Double bathrooms,
        @NotNull @Min(1800) @Max(2100) Integer yearBuilt,
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000000") Double lotSize,
        @NotNull @DecimalMin("0") @DecimalMax("200") Double distanceToCityCenter,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double schoolRating) {

    /** Copy of this property with one feature changed (whole-number features are rounded). */
    public PropertyInput with(Feature f, double v) {
        return switch (f) {
            case SQUARE_FOOTAGE -> new PropertyInput(v, bedrooms, bathrooms, yearBuilt, lotSize, distanceToCityCenter, schoolRating);
            case BEDROOMS -> new PropertyInput(squareFootage, (int) Math.round(v), bathrooms, yearBuilt, lotSize, distanceToCityCenter, schoolRating);
            case BATHROOMS -> new PropertyInput(squareFootage, bedrooms, v, yearBuilt, lotSize, distanceToCityCenter, schoolRating);
            case YEAR_BUILT -> new PropertyInput(squareFootage, bedrooms, bathrooms, (int) Math.round(v), lotSize, distanceToCityCenter, schoolRating);
            case LOT_SIZE -> new PropertyInput(squareFootage, bedrooms, bathrooms, yearBuilt, v, distanceToCityCenter, schoolRating);
            case DISTANCE_TO_CITY_CENTER -> new PropertyInput(squareFootage, bedrooms, bathrooms, yearBuilt, lotSize, v, schoolRating);
            case SCHOOL_RATING -> new PropertyInput(squareFootage, bedrooms, bathrooms, yearBuilt, lotSize, distanceToCityCenter, v);
        };
    }

    /** Body for the model API (snake_case keys, explicit so it never depends on Jackson config). */
    public Map<String, Object> toModelMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(Feature.SQUARE_FOOTAGE.key(), squareFootage);
        m.put(Feature.BEDROOMS.key(), bedrooms);
        m.put(Feature.BATHROOMS.key(), bathrooms);
        m.put(Feature.YEAR_BUILT.key(), yearBuilt);
        m.put(Feature.LOT_SIZE.key(), lotSize);
        m.put(Feature.DISTANCE_TO_CITY_CENTER.key(), distanceToCityCenter);
        m.put(Feature.SCHOOL_RATING.key(), schoolRating);
        return m;
    }
}
