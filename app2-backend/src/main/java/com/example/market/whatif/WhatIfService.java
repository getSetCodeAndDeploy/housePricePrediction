package com.example.market.whatif;

import com.example.market.model.Feature;
import com.example.market.model.InvalidRequestException;
import com.example.market.model.ModelClient;
import com.example.market.model.ModelClient.Prediction;
import com.example.market.model.PropertyInput;
import com.example.market.whatif.WhatIfDtos.SweepPoint;
import com.example.market.whatif.WhatIfDtos.SweepRequest;
import com.example.market.whatif.WhatIfDtos.SweepResult;
import com.example.market.whatif.WhatIfDtos.WhatIfRequest;
import com.example.market.whatif.WhatIfDtos.WhatIfResult;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class WhatIfService {

    private final ModelClient model;
    private final Validator validator;

    public WhatIfService(ModelClient model, Validator validator) {
        this.model = model;
        this.validator = validator;
    }

    /** Predict the baseline and the changed scenario in ONE model call. */
    @Cacheable(cacheNames = "whatIf", key = "#req.toString()")
    public WhatIfResult compare(WhatIfRequest req) {
        PropertyInput scenario = req.base();
        for (Map.Entry<String, Double> e : req.changes().entrySet()) {
            if (e.getValue() == null) {
                throw new InvalidRequestException("Change for '" + e.getKey() + "' has no value");
            }
            scenario = scenario.with(Feature.fromKey(e.getKey()), e.getValue());
        }
        requireValid(scenario);

        List<Prediction> p = model.predict(List.of(req.base(), scenario));
        double base = p.get(0).predictedPrice();
        double scen = p.get(1).predictedPrice();
        double delta = round2(scen - base);
        double pct = base == 0 ? 0 : round2((scen - base) / base * 100.0);
        List<String> warnings = p.get(1).warnings() == null ? List.of() : p.get(1).warnings();
        return new WhatIfResult(req.base(), scenario, base, scen, delta, pct, warnings);
    }

    /** Price curve for one feature - one batch call to the model. */
    @Cacheable(cacheNames = "sweep", key = "#req.toString()")
    public SweepResult sweep(SweepRequest req) {
        Feature feature = Feature.fromKey(req.feature());
        if (req.from() >= req.to()) {
            throw new InvalidRequestException("'from' must be less than 'to'");
        }
        Set<Double> values = new LinkedHashSet<>();
        for (int i = 0; i < req.steps(); i++) {
            double v = req.from() + i * (req.to() - req.from()) / (req.steps() - 1);
            values.add(feature.isInteger() ? (double) Math.round(v) : Math.round(v * 10000.0) / 10000.0);
        }
        List<Double> xs = new ArrayList<>(values);
        List<PropertyInput> inputs = new ArrayList<>();
        for (double x : xs) {
            PropertyInput in = req.base().with(feature, x);
            requireValid(in);
            inputs.add(in);
        }
        List<Prediction> preds = model.predict(inputs);
        List<SweepPoint> points = new ArrayList<>();
        for (int i = 0; i < xs.size(); i++) {
            points.add(new SweepPoint(xs.get(i), preds.get(i).predictedPrice()));
        }
        return new SweepResult(feature.key(), points);
    }

    private void requireValid(PropertyInput input) {
        Set<ConstraintViolation<PropertyInput>> violations = validator.validate(input);
        if (!violations.isEmpty()) {
            throw new InvalidRequestException("Scenario is invalid: " + violations.stream()
                    .map(v -> toSnakeCase(v.getPropertyPath().toString()) + " " + v.getMessage())
                    .sorted()
                    .collect(Collectors.joining("; ")));
        }
    }

    /**
     * Bean Validation reports the Java field name (e.g. "schoolRating"). The rest of the API -
     * request/response JSON and the portal - uses snake_case feature keys (e.g. "school_rating"),
     * so error messages are converted to match instead of leaking the Java-side name.
     */
    private static String toSnakeCase(String camel) {
        return camel.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
