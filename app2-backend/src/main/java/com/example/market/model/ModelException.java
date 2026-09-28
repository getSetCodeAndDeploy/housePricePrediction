package com.example.market.model;

import org.springframework.http.HttpStatus;

/** Failure talking to the model container; carries the HTTP status we return to our caller. */
public class ModelException extends RuntimeException {
    private final HttpStatus status;

    public ModelException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public ModelException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
