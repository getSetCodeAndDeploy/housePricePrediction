package com.example.market.web;

import com.example.market.whatif.WhatIfDtos.SweepRequest;
import com.example.market.whatif.WhatIfDtos.SweepResult;
import com.example.market.whatif.WhatIfDtos.WhatIfRequest;
import com.example.market.whatif.WhatIfDtos.WhatIfResult;
import com.example.market.whatif.WhatIfService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/what-if")
public class WhatIfController {

    private final WhatIfService service;

    public WhatIfController(WhatIfService service) {
        this.service = service;
    }

    @PostMapping
    public WhatIfResult compare(@Valid @RequestBody WhatIfRequest request) {
        return service.compare(request);
    }

    @PostMapping("/sweep")
    public SweepResult sweep(@Valid @RequestBody SweepRequest request) {
        return service.sweep(request);
    }
}
