package com.practice.booking.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practice.booking.dto.ApiResponse;
import com.practice.booking.dto.BookingResponse;
import com.practice.booking.dto.CreateBookingRequest;
import com.practice.booking.service.BookingService;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

	private final BookingService bookingService;

	public BookingController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	public ApiResponse<BookingResponse> create(@RequestHeader("X-User-Id") String userId,
			@Valid @RequestBody CreateBookingRequest request) {
		return ApiResponse.success(bookingService.create(userId, request));
	}

}
