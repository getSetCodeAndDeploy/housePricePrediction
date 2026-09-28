package com.example.market;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.market.model.ModelClient;
import com.example.market.model.ModelClient.Prediction;
import com.example.market.model.ModelException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MarketApiIntegrationTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    ModelClient model;

    private static String body(double sqft, String changes) {
        return """
                {"base": {"square_footage": %s, "bedrooms": 3, "bathrooms": 2, "year_built": 1997,
                          "lot_size": 6800, "distance_to_city_center": 4.1, "school_rating": 7.6},
                 "changes": %s}""".formatted(sqft, changes);
    }

    @Test
    void statsForWholeDataset() throws Exception {
        mvc.perform(get("/api/market/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(50))
                .andExpect(jsonPath("$.summary.avg_price").value(264600.0))
                .andExpect(jsonPath("$.price_histogram", hasSize(8)));
    }

    @Test
    void statsRespectFilters() throws Exception {
        mvc.perform(get("/api/market/stats").param("minBedrooms", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(15));
    }

    @Test
    void repeatedStatsRequestsHitTheCache() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/api/market/stats").param("bins", "5")).andExpect(status().isOk());
        }
        mvc.perform(get("/api/cache/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.marketStats.hit_count", greaterThanOrEqualTo(1)));
    }

    @Test
    void housesArePagedAndSorted() throws Exception {
        mvc.perform(get("/api/houses").param("size", "5").param("sortBy", "price").param("dir", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(50))
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.items[0].price").value(410000.0));
    }

    @Test
    void badSortColumnIs422() throws Exception {
        mvc.perform(get("/api/houses").param("sortBy", "nope")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void csvExport() throws Exception {
        mvc.perform(get("/api/houses/export.csv").param("minBedrooms", "4"))
                .andExpect(status().isOk())
                .andExpect(content().string(startsWith("id,square_footage")));
    }

    @Test
    void whatIfReturnsDelta() throws Exception {
        when(model.predict(anyList())).thenReturn(List.of(new Prediction(250_000, List.of()), new Prediction(260_000, List.of())));
        mvc.perform(post("/api/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content(body(1500, "{\"bedrooms\": 4}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.delta").value(10000.0))
                .andExpect(jsonPath("$.delta_pct").value(4.0))
                .andExpect(jsonPath("$.scenario.bedrooms").value(4));
    }

    @Test
    void whatIfRejectsOutOfRangeChangeWithoutCallingModel() throws Exception {
        mvc.perform(post("/api/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content(body(1510, "{\"school_rating\": 15}")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail", containsString("school_rating")));
        verifyNoInteractions(model);
    }

    @Test
    void whatIfRejectsInvalidBody() throws Exception {
        mvc.perform(post("/api/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base\": {\"square_footage\": 1500}, \"changes\": {\"bedrooms\": 4}}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors").isNotEmpty());
    }

    @Test
    void modelDownIs503() throws Exception {
        when(model.predict(anyList())).thenThrow(new ModelException("Model service is unreachable", HttpStatus.SERVICE_UNAVAILABLE));
        mvc.perform(post("/api/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content(body(1520, "{\"bedrooms\": 5}")))
                .andExpect(status().isServiceUnavailable());
    }
}
