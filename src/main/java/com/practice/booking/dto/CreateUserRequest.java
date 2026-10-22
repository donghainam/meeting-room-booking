package com.practice.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.practice.booking.entity.Role;

public record CreateUserRequest(
		@NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "[a-zA-Z0-9._-]*") String username,
		@NotNull @Size(min = 8, max = 72) String password,
		Role role) {

	// username bỏ khoảng trắng đầu/cuối trước khi kiểm tra; password giữ nguyên
	public CreateUserRequest {
		username = username == null ? null : username.trim();
	}

}
