package com.practice.booking.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.practice.booking.entity.Role;
import com.practice.booking.entity.User;
import com.practice.booking.repository.UserRepository;

// Tài khoản admin mặc định: dữ liệu nằm trong H2 in-memory nên mỗi lần khởi động đều tạo lại (D5)
@Component
public class AdminInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

	private static final String ADMIN_USERNAME = "admin";
	private static final String DEFAULT_PASSWORD = "admin";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final String adminPassword;

	public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder,
			@Value("${app.admin.password}") String adminPassword) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.adminPassword = adminPassword;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (userRepository.existsByUsernameKey(ADMIN_USERNAME)) {
			return;
		}
		// Mật khẩu admin mặc định không áp luật 8–72 ký tự của U1
		userRepository.save(new User(ADMIN_USERNAME, ADMIN_USERNAME, passwordEncoder.encode(adminPassword), Role.ADMIN));
		if (DEFAULT_PASSWORD.equals(adminPassword)) {
			log.warn("Default admin password in use");
		}
	}

}
