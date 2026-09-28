package com.example.market.web;

import com.github.benmanes.caffeine.cache.stats.CacheStats;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes cache hit/miss counters - useful to show the caching working during the demo. */
@RestController
@RequestMapping("/api/cache")
public class CacheController {

    public record CacheView(long hitCount, long missCount, double hitRate, long size) {
    }

    private final CacheManager cacheManager;

    public CacheController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @GetMapping("/stats")
    public Map<String, CacheView> stats() {
        Map<String, CacheView> out = new LinkedHashMap<>();
        for (String name : cacheManager.getCacheNames()) {
            if (cacheManager.getCache(name) instanceof CaffeineCache cc) {
                CacheStats s = cc.getNativeCache().stats();
                out.put(name, new CacheView(s.hitCount(), s.missCount(), s.hitRate(), cc.getNativeCache().estimatedSize()));
            }
        }
        return out;
    }
}
