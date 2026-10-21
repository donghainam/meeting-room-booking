package com.practice.booking.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateBookingRequest(
		@NotBlank @Size(max = 200) String title,
		@NotNull @Min(1) Integer attendees,
		@NotNull LocalDateTime startTime,
		@NotNull LocalDateTime endTime) {
}
