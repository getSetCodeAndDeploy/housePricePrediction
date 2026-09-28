package com.example.market.data;

import com.example.market.model.Feature;

/** One row of the housing dataset. */
public record House(int id, double squareFootage, int bedrooms, double bathrooms, int yearBuilt,
                    double lotSize, double distanceToCityCenter, double schoolRating, double price) {

    public double pricePerSqft() {
        return price / squareFootage;
    }

    public double value(Feature f) {
        return switch (f) {
            case SQUARE_FOOTAGE -> squareFootage;
            case BEDROOMS -> bedrooms;
            case BATHROOMS -> bathrooms;
            case YEAR_BUILT -> yearBuilt;
            case LOT_SIZE -> lotSize;
            case DISTANCE_TO_CITY_CENTER -> distanceToCityCenter;
            case SCHOOL_RATING -> schoolRating;
        };
    }
}
