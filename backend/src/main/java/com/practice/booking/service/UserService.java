package com.practice.booking.service;

import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.practice.booking.dto.CreateUserRequest;
import com.practice.booking.dto.UserResponse;
import com.practice.booking.entity.Role;
import com.practice.booking.entity.User;
import com.practice.booking.exception.BusinessException;
import com.practice.booking.exception.ErrorCode;
import com.practice.booking.repository.UserRepository;

@Service
public class UserService {

	private static final Logger log = LoggerFactory.getLogger(UserService.class);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public UserResponse create(CreateUserRequest request) {
		String username = request.username();
		String usernameKey = username.toLowerCase(Locale.ROOT);
		if (userRepository.existsByUsernameKey(usernameKey)) {
			throw new BusinessException(ErrorCode.USERNAME_EXISTS, "Username '" + username + "' already exists");
		}
		Role role = request.role() == null ? Role.USER : request.role();
		User user = new User(username, usernameKey, passwordEncoder.encode(request.password()), role);
		try {
			return UserResponse.from(userRepository.saveAndFlush(user));
		} catch (DataIntegrityViolationException ex) {
			// hai request cùng username chạy đồng thời: unique constraint chặn request sau
			log.warn("Cannot save user '{}': {}", username, ex.getMostSpecificCause().getMessage());
			throw new BusinessException(ErrorCode.USERNAME_EXISTS);
		}
	}

	public List<UserResponse> findAll() {
		return userRepository.findAllByOrderByIdAsc().stream().map(UserResponse::from).toList();
	}

}
