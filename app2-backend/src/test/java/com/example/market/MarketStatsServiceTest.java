package com.example.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.market.data.House;
import com.example.market.data.HouseRepository;
import com.example.market.model.InvalidRequestException;
import com.example.market.stats.Dtos.HistogramBin;
import com.example.market.stats.Dtos.MarketStats;
import com.example.market.stats.MarketFilter;
import com.example.market.stats.MarketStatsService;
import java.util.List;
import org.junit.jupiter.api.Test;

class MarketStatsServiceTest {

    private static final MarketFilter ALL = new MarketFilter(null, null, null, null, null, null, null, null);

    private final MarketStatsService service = new MarketStatsService(HouseRepository.of(List.of(
            new House(1, 1000, 2, 1, 1980, 5000, 3, 7, 100_000),
            new House(2, 1500, 3, 2, 1995, 6500, 4, 8, 200_000),
            new House(3, 2000, 4, 2, 2005, 8000, 6, 9, 300_000),
            new House(4, 2500, 4, 3, 2010, 9000, 8, 9, 400_000))));

    @Test
    void summaryIsComputedCorrectly() {
        MarketStats s = service.stats(ALL, 4);
        assertEquals(4, s.summary().count());
        assertEquals(250_000.0, s.summary().avgPrice());
        assertEquals(250_000.0, s.summary().medianPrice());
        assertEquals(100_000.0, s.summary().minPrice());
        assertEquals(400_000.0, s.summary().maxPrice());
    }

    @Test
    void filtersNarrowTheSegment() {
        MarketFilter fourBeds = new MarketFilter(null, null, 4, null, null, null, null, null);
        assertEquals(2, service.stats(fourBeds, 4).summary().count());
        MarketFilter priceBand = new MarketFilter(150_000.0, 350_000.0, null, null, null, null, null, null);
        assertEquals(2, service.stats(priceBand, 4).summary().count());
    }

    @Test
    void histogramCoversEveryHouseExactlyOnce() {
        int total = service.stats(ALL, 3).priceHistogram().stream().mapToInt(HistogramBin::count).sum();
        assertEquals(4, total);
    }

    @Test
    void emptySegmentReturnsZerosNotNaN() {
        MarketFilter none = new MarketFilter(1e9, null, null, null, null, null, null, null);
        MarketStats s = service.stats(none, 4);
        assertEquals(0, s.summary().count());
        assertEquals(0.0, s.summary().avgPrice());
        assertEquals(0, s.priceHistogram().size());
    }

    @Test
    void pagingAndSorting() {
        var page = service.houses(ALL, "price", "desc", 0, 3);
        assertEquals(4, page.total());
        assertEquals(3, page.items().size());
        assertEquals(400_000.0, page.items().get(0).price());
        assertEquals(1, service.houses(ALL, "price", "desc", 1, 3).items().size());
    }

    @Test
    void rejectsUnknownSortColumn() {
        assertThrows(InvalidRequestException.class, () -> service.houses(ALL, "nope", "asc", 0, 10));
    }
}
