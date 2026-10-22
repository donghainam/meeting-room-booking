package com.practice.booking.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn) {
}
