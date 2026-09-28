package com.example.market.stats;

import com.example.market.data.House;
import com.example.market.data.HouseRepository;
import com.example.market.model.Feature;
import com.example.market.model.InvalidRequestException;
import com.example.market.stats.Dtos.Correlation;
import com.example.market.stats.Dtos.FeatureRange;
import com.example.market.stats.Dtos.GroupStat;
import com.example.market.stats.Dtos.HistogramBin;
import com.example.market.stats.Dtos.HouseRow;
import com.example.market.stats.Dtos.MarketStats;
import com.example.market.stats.Dtos.PageResult;
import com.example.market.stats.Dtos.Summary;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class MarketStatsService {

    private static final Logger log = LoggerFactory.getLogger(MarketStatsService.class);

    private static final Map<String, Comparator<House>> SORTS = Map.ofEntries(
            Map.entry("id", Comparator.comparingInt(House::id)),
            Map.entry("square_footage", Comparator.comparingDouble(House::squareFootage)),
            Map.entry("bedrooms", Comparator.comparingInt(House::bedrooms)),
            Map.entry("bathrooms", Comparator.comparingDouble(House::bathrooms)),
            Map.entry("year_built", Comparator.comparingInt(House::yearBuilt)),
            Map.entry("lot_size", Comparator.comparingDouble(House::lotSize)),
            Map.entry("distance_to_city_center", Comparator.comparingDouble(House::distanceToCityCenter)),
            Map.entry("school_rating", Comparator.comparingDouble(House::schoolRating)),
            Map.entry("price", Comparator.comparingDouble(House::price)),
            Map.entry("price_per_sqft", Comparator.comparingDouble(House::pricePerSqft)));

    private final HouseRepository repository;

    public MarketStatsService(HouseRepository repository) {
        this.repository = repository;
    }

    /** Cached per (filter, bins). The log line only appears on a cache miss - handy to demo caching. */
    @Cacheable(cacheNames = "marketStats", key = "#filter.toString() + '|' + #bins")
    public MarketStats stats(MarketFilter filter, int bins) {
        log.info("Computing market stats (cache miss) filter={} bins={}", filter, bins);
        List<House> hs = filtered(filter);
        if (hs.isEmpty()) {
            return MarketStats.empty();
        }
        double[] prices = hs.stream().mapToDouble(House::price).toArray();
        return new MarketStats(
                summary(hs, prices),
                group(hs, House::bedrooms, k -> String.valueOf(k)),
                group(hs, h -> h.yearBuilt() / 10 * 10, k -> k + "s"),
                histogram(prices, bins),
                correlations(hs, prices));
    }

    public List<House> filtered(MarketFilter filter) {
        return repository.findAll().stream().filter(filter::matches).toList();
    }

    public PageResult<HouseRow> houses(MarketFilter filter, String sortBy, String dir, int page, int size) {
        Comparator<House> cmp = SORTS.get(sortBy);
        if (cmp == null) {
            throw new InvalidRequestException("Unknown sortBy '" + sortBy + "'. Valid: " + new TreeMap<>(SORTS).keySet());
        }
        if (!dir.equalsIgnoreCase("asc") && !dir.equalsIgnoreCase("desc")) {
            throw new InvalidRequestException("dir must be 'asc' or 'desc'");
        }
        if (page < 0 || size < 1 || size > 200) {
            throw new InvalidRequestException("page must be >= 0 and size between 1 and 200");
        }
        if (dir.equalsIgnoreCase("desc")) {
            cmp = cmp.reversed();
        }
        List<House> all = filtered(filter).stream().sorted(cmp).toList();
        int from = (int) Math.min((long) page * size, all.size());
        int to = Math.min(from + size, all.size());
        List<HouseRow> items = all.subList(from, to).stream().map(MarketStatsService::toRow).toList();
        return new PageResult<>(items, all.size(), page, size);
    }

    public List<HouseRow> allRows(MarketFilter filter) {
        return filtered(filter).stream().map(MarketStatsService::toRow).toList();
    }

    public List<FeatureRange> featureRanges() {
        List<FeatureRange> out = new ArrayList<>();
        for (Feature f : Feature.values()) {
            double min = repository.findAll().stream().mapToDouble(h -> h.value(f)).min().orElse(0);
            double max = repository.findAll().stream().mapToDouble(h -> h.value(f)).max().orElse(0);
            out.add(new FeatureRange(f.key(), min, max));
        }
        return out;
    }

    // ---- calculations -------------------------------------------------------------------------

    private static HouseRow toRow(House h) {
        return new HouseRow(h.id(), h.squareFootage(), h.bedrooms(), h.bathrooms(), h.yearBuilt(), h.lotSize(),
                h.distanceToCityCenter(), h.schoolRating(), h.price(), round2(h.pricePerSqft()));
    }

    private static Summary summary(List<House> hs, double[] prices) {
        int n = prices.length;
        double mean = Arrays.stream(prices).average().orElse(0);
        double[] sorted = prices.clone();
        Arrays.sort(sorted);
        double median = n % 2 == 1 ? sorted[n / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0;
        double variance = n > 1 ? Arrays.stream(prices).map(p -> (p - mean) * (p - mean)).sum() / (n - 1) : 0;
        return new Summary(n, round2(mean), round2(median), sorted[0], sorted[n - 1], round2(Math.sqrt(variance)),
                round2(hs.stream().mapToDouble(House::pricePerSqft).average().orElse(0)),
                round2(hs.stream().mapToDouble(House::squareFootage).average().orElse(0)));
    }

    private static <K extends Comparable<K>> List<GroupStat> group(List<House> hs, Function<House, K> keyFn,
                                                                    Function<K, String> label) {
        Map<K, List<House>> groups = hs.stream().collect(Collectors.groupingBy(keyFn, TreeMap::new, Collectors.toList()));
        List<GroupStat> out = new ArrayList<>();
        groups.forEach((k, list) -> out.add(new GroupStat(label.apply(k), list.size(),
                round2(list.stream().mapToDouble(House::price).average().orElse(0)),
                round2(list.stream().mapToDouble(House::pricePerSqft).average().orElse(0)))));
        return out;
    }

    private static List<HistogramBin> histogram(double[] prices, int bins) {
        double min = Arrays.stream(prices).min().orElse(0);
        double max = Arrays.stream(prices).max().orElse(0);
        if (max == min) {
            return List.of(new HistogramBin(min, max, prices.length));
        }
        double width = (max - min) / bins;
        int[] counts = new int[bins];
        for (double p : prices) {
            counts[Math.min(bins - 1, (int) ((p - min) / width))]++;
        }
        List<HistogramBin> out = new ArrayList<>();
        for (int i = 0; i < bins; i++) {
            out.add(new HistogramBin(round2(min + i * width), round2(min + (i + 1) * width), counts[i]));
        }
        return out;
    }

    private static List<Correlation> correlations(List<House> hs, double[] prices) {
        List<Correlation> out = new ArrayList<>();
        for (Feature f : Feature.values()) {
            double[] xs = hs.stream().mapToDouble(h -> h.value(f)).toArray();
            out.add(new Correlation(f.key(), Math.round(pearson(xs, prices) * 1000.0) / 1000.0));
        }
        return out;
    }

    static double pearson(double[] x, double[] y) {
        int n = x.length;
        double mx = Arrays.stream(x).average().orElse(0);
        double my = Arrays.stream(y).average().orElse(0);
        double sxy = 0;
        double sxx = 0;
        double syy = 0;
        for (int i = 0; i < n; i++) {
            sxy += (x[i] - mx) * (y[i] - my);
            sxx += (x[i] - mx) * (x[i] - mx);
            syy += (y[i] - my) * (y[i] - my);
        }
        return sxx == 0 || syy == 0 ? 0 : sxy / Math.sqrt(sxx * syy);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
