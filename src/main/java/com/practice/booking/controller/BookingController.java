package com.practice.booking.controller;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.practice.booking.dto.ApiResponse;
import com.practice.booking.dto.BookingResponse;
import com.practice.booking.dto.CreateBookingRequest;
import com.practice.booking.dto.UpdateBookingRequest;
import com.practice.booking.entity.Role;
import com.practice.booking.service.BookingService;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

	private final BookingService bookingService;

	public BookingController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	public ApiResponse<BookingResponse> create(Authentication authentication,
			@Valid @RequestBody CreateBookingRequest request) {
		return ApiResponse.success(bookingService.create(authentication.getName(), request));
	}

	@GetMapping
	public ApiResponse<List<BookingResponse>> schedule(@RequestParam Long roomId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return ApiResponse.success(bookingService.findSchedule(roomId, date));
	}

	@PostMapping("/{id}/cancel")
	public ApiResponse<BookingResponse> cancel(Authentication authentication, @PathVariable Long id) {
		return ApiResponse.success(bookingService.cancel(authentication.getName(), isAdmin(authentication), id));
	}

	@PutMapping("/{id}")
	public ApiResponse<BookingResponse> update(Authentication authentication, @PathVariable Long id,
			@Valid @RequestBody UpdateBookingRequest request) {
		return ApiResponse.success(bookingService.update(authentication.getName(), isAdmin(authentication), id, request));
	}

	private boolean isAdmin(Authentication authentication) {
		return authentication.getAuthorities().stream()
				.anyMatch(authority -> authority.getAuthority().equals("ROLE_" + Role.ADMIN.name()));
	}

}
