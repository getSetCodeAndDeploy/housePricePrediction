package com.example.market.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(ModelProperties.class)
public class AppConfig implements WebMvcConfigurer {

    /**
     * HTTP client for the Task 1 model container, with explicit timeouts.
     *
     * Uses SimpleClientHttpRequestFactory (HttpURLConnection-based) rather than
     * JdkClientHttpRequestFactory (java.net.http.HttpClient-based): the latter was found, in
     * practice, to sometimes send POST requests with an empty body under this synchronous
     * RestClient usage - the model API would then see a missing request body and reject the
     * call with a 422, even though the code correctly built and attached a body. Swapping the
     * request factory fixed it; SimpleClientHttpRequestFactory is the long-established,
     * reliable option for small synchronous JSON POSTs like this one.
     */
    @Bean
    public RestClient modelRestClient(RestClient.Builder builder, ModelProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) props.connectTimeout().toMillis());
        factory.setReadTimeout((int) props.readTimeout().toMillis());
        return builder.baseUrl(props.apiUrl()).requestFactory(factory).build();
    }

    /**
     * Caffeine caches: the dataset is static and the model is deterministic, so results for a given
     * input can be reused. TTL bounds staleness if the model container is retrained/redeployed.
     */
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("marketStats", "whatIf", "sweep");
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats());
        return manager;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins("*").allowedMethods("GET", "POST");
    }
}
