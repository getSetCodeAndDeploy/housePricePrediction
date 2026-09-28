package com.example.market.whatif;

import com.example.market.model.PropertyInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

public final class WhatIfDtos {
    private WhatIfDtos() {
    }

    /** `changes` maps feature key -> new value, e.g. {"bedrooms": 4, "school_rating": 9}. */
    public record WhatIfRequest(@NotNull @Valid PropertyInput base, @NotEmpty Map<String, Double> changes) {
    }

    public record WhatIfResult(PropertyInput baseline, PropertyInput scenario, double baselinePrice,
                               double scenarioPrice, double delta, double deltaPct, List<String> warnings) {
    }

    /** Vary one feature from..to in `steps` points, holding the rest of `base` fixed. */
    public record SweepRequest(@NotNull @Valid PropertyInput base, @NotBlank String feature,
                               @NotNull Double from, @NotNull Double to,
                               @NotNull @Min(2) @Max(50) Integer steps) {
    }

    public record SweepPoint(double value, double predictedPrice) {
    }

    public record SweepResult(String feature, List<SweepPoint> points) {
    }
}
