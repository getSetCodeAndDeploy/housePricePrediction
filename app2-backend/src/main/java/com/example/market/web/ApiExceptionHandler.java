package com.example.market.web;

import com.example.market.model.InvalidRequestException;
import com.example.market.model.ModelException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Same error shape as App 1: {"detail": "...", "errors": [{"field","message"}]}. */
@RestControllerAdvice
public class ApiExceptionHandler {

    public record FieldIssue(String field, String message) {
    }

    public record ApiError(String detail, List<FieldIssue> errors) {
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex) {
        List<FieldIssue> issues = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new FieldIssue(snake(f.getField()), f.getDefaultMessage()))
                .toList();
        return ResponseEntity.unprocessableEntity().body(new ApiError("Validation failed", issues));
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiError> invalid(InvalidRequestException ex) {
        return ResponseEntity.unprocessableEntity().body(new ApiError(ex.getMessage(), null));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError> malformed(Exception ex) {
        return ResponseEntity.badRequest().body(new ApiError("Malformed request", null));
    }

    @ExceptionHandler(ModelException.class)
    public ResponseEntity<ApiError> model(ModelException ex) {
        HttpStatus status = ex.status();
        return ResponseEntity.status(status).body(new ApiError(ex.getMessage(), null));
    }

    /** "squareFootage" -> "square_footage"; nested paths like "base.squareFootage" are handled per segment. */
    private static String snake(String s) {
        return s.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }
}
