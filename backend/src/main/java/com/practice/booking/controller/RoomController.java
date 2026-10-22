package com.practice.booking.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practice.booking.dto.ApiResponse;
import com.practice.booking.dto.CreateRoomRequest;
import com.practice.booking.dto.RoomResponse;
import com.practice.booking.service.RoomService;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

	private final RoomService roomService;

	public RoomController(RoomService roomService) {
		this.roomService = roomService;
	}

	@PostMapping
	public ApiResponse<RoomResponse> create(@Valid @RequestBody CreateRoomRequest request) {
		return ApiResponse.success(roomService.create(request));
	}

	@GetMapping
	public ApiResponse<List<RoomResponse>> list() {
		return ApiResponse.success(roomService.findAll());
	}

}
