package com.practice.booking.dto;

import com.practice.booking.entity.Role;
import com.practice.booking.entity.User;

public record UserResponse(Long id, String username, Role role) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getUsername(), user.getRole());
	}

}
