package com.example.market.data;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Repository;

/** Read-only, in-memory store loaded once from the bundled CSV. */
@Repository
public class HouseRepository {

    private final List<House> houses;

    @Autowired
    public HouseRepository(@Value("classpath:data/house_price_dataset.csv") Resource csv) {
        this.houses = load(csv);
    }

    private HouseRepository(List<House> houses) {
        this.houses = List.copyOf(houses);
    }

    /** For unit tests. */
    public static HouseRepository of(List<House> houses) {
        return new HouseRepository(houses);
    }

    public List<House> findAll() {
        return houses;
    }

    private static List<House> load(Resource csv) {
        List<House> out = new ArrayList<>();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(csv.getInputStream(), StandardCharsets.UTF_8))) {
            String line = r.readLine(); // header
            while ((line = r.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                String[] c = line.split(",");
                out.add(new House(
                        Integer.parseInt(c[0].trim()),
                        Double.parseDouble(c[1].trim()),
                        Integer.parseInt(c[2].trim()),
                        Double.parseDouble(c[3].trim()),
                        Integer.parseInt(c[4].trim()),
                        Double.parseDouble(c[5].trim()),
                        Double.parseDouble(c[6].trim()),
                        Double.parseDouble(c[7].trim()),
                        Double.parseDouble(c[8].trim())));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read housing dataset", e);
        }
        return List.copyOf(out);
    }
}
