package com.example.market.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Client for the Task 1 model container (POST /predict). */
@Component
public class ModelClient {

    public record Prediction(@JsonProperty("predicted_price") double predictedPrice, List<String> warnings) {
    }

    public record PredictRequest(List<Map<String, Object>> instances) {
    }

    public record PredictResponse(int count, List<Prediction> predictions) {
    }

    private final RestClient http;

    public ModelClient(RestClient modelRestClient) {
        this.http = modelRestClient;
    }

    /** Batch prediction; result order matches input order. */
    public List<Prediction> predict(List<PropertyInput> inputs) {
        try {
            PredictResponse response = http.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new PredictRequest(inputs.stream().map(PropertyInput::toModelMap).toList()))
                    .retrieve()
                    .body(PredictResponse.class);
            if (response == null || response.predictions() == null || response.predictions().size() != inputs.size()) {
                throw new ModelException("Model service returned an unexpected response", HttpStatus.BAD_GATEWAY);
            }
            return response.predictions();
        } catch (HttpClientErrorException e) {
            throw new ModelException("Model service rejected the input (" + e.getStatusCode().value() + ")",
                    HttpStatus.UNPROCESSABLE_ENTITY, e);
        } catch (RestClientResponseException e) {
            throw new ModelException("Model service error (" + e.getStatusCode().value() + ")",
                    HttpStatus.BAD_GATEWAY, e);
        } catch (ResourceAccessException e) {
            throw new ModelException("Model service is unreachable or timed out",
                    HttpStatus.SERVICE_UNAVAILABLE, e);
        }
    }
}
