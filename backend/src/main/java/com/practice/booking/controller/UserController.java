package com.practice.booking.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practice.booking.dto.ApiResponse;
import com.practice.booking.dto.CreateUserRequest;
import com.practice.booking.dto.UserResponse;
import com.practice.booking.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	@PostMapping
	public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
		return ApiResponse.success(userService.create(request));
	}

	@GetMapping
	public ApiResponse<List<UserResponse>> list() {
		return ApiResponse.success(userService.findAll());
	}

}
