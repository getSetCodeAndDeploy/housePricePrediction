package com.example.market.web;

import com.example.market.model.InvalidRequestException;
import com.example.market.stats.Dtos.FeatureRange;
import com.example.market.stats.Dtos.HouseRow;
import com.example.market.stats.Dtos.MarketStats;
import com.example.market.stats.Dtos.PageResult;
import com.example.market.stats.MarketFilter;
import com.example.market.stats.MarketStatsService;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MarketController {

    private final MarketStatsService service;

    public MarketController(MarketStatsService service) {
        this.service = service;
    }

    /** Aggregate statistics for the (optionally filtered) segment. Cached. */
    @GetMapping("/market/stats")
    public MarketStats stats(MarketFilter filter, @RequestParam(defaultValue = "8") int bins) {
        if (bins < 2 || bins > 50) {
            throw new InvalidRequestException("bins must be between 2 and 50");
        }
        return service.stats(filter, bins);
    }

    /** Sortable, filterable, paged listing for the data table. */
    @GetMapping("/houses")
    public PageResult<HouseRow> houses(MarketFilter filter,
                                       @RequestParam(defaultValue = "id") String sortBy,
                                       @RequestParam(defaultValue = "asc") String dir,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return service.houses(filter, sortBy, dir, page, size);
    }

    @GetMapping(value = "/houses/export.csv", produces = "text/csv")
    public ResponseEntity<String> exportCsv(MarketFilter filter) {
        StringBuilder sb = new StringBuilder(
                "id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price,price_per_sqft\n");
        for (HouseRow r : service.allRows(filter)) {
            sb.append(r.id()).append(',').append(r.squareFootage()).append(',').append(r.bedrooms()).append(',')
                    .append(r.bathrooms()).append(',').append(r.yearBuilt()).append(',').append(r.lotSize()).append(',')
                    .append(r.distanceToCityCenter()).append(',').append(r.schoolRating()).append(',')
                    .append(r.price()).append(',').append(r.pricePerSqft()).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"houses.csv\"")
                .contentType(new MediaType("text", "csv"))
                .body(sb.toString());
    }

    /** Min/max of each feature - lets the UI size sliders and filters. */
    @GetMapping("/meta/features")
    public List<FeatureRange> features() {
        return service.featureRanges();
    }
}
