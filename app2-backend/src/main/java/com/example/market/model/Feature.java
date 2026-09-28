package com.example.market.model;

import java.util.Arrays;

/** The seven model features: JSON key + whether the value must be a whole number. */
public enum Feature {
    SQUARE_FOOTAGE("square_footage", false),
    BEDROOMS("bedrooms", true),
    BATHROOMS("bathrooms", false),
    YEAR_BUILT("year_built", true),
    LOT_SIZE("lot_size", false),
    DISTANCE_TO_CITY_CENTER("distance_to_city_center", false),
    SCHOOL_RATING("school_rating", false);

    private final String key;
    private final boolean integer;

    Feature(String key, boolean integer) {
        this.key = key;
        this.integer = integer;
    }

    public String key() {
        return key;
    }

    public boolean isInteger() {
        return integer;
    }

    public static Feature fromKey(String key) {
        return Arrays.stream(values())
                .filter(f -> f.key.equals(key))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException(
                        "Unknown feature '" + key + "'. Valid: "
                                + Arrays.stream(values()).map(Feature::key).toList()));
    }
}
