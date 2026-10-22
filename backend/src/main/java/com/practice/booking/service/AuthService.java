package com.practice.booking.service;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.practice.booking.dto.LoginRequest;
import com.practice.booking.dto.LoginResponse;
import com.practice.booking.entity.User;
import com.practice.booking.exception.BusinessException;
import com.practice.booking.exception.ErrorCode;
import com.practice.booking.repository.UserRepository;

@Service
public class AuthService {

	private static final String TOKEN_TYPE = "Bearer";
	private static final int MAX_BCRYPT_BYTES = 72;

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtEncoder jwtEncoder;
	private final Clock clock;
	private final long expiresIn;
	// Hash giả để username không tồn tại cũng tốn thời gian so khớp như username đúng, tránh lộ qua độ trễ
	private final String dummyHash;

	public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
			Clock clock, @Value("${app.jwt.expires-in}") long expiresIn) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtEncoder = jwtEncoder;
		this.clock = clock;
		this.expiresIn = expiresIn;
		this.dummyHash = passwordEncoder.encode("dummy-password");
	}

	// Mọi trường hợp thất bại (thiếu, trống, sai username, sai password) đều trả 80, không lộ sai trường nào
	public LoginResponse login(LoginRequest request) {
		String username = request.username() == null ? "" : request.username().trim();
		String password = request.password() == null ? "" : request.password();
		User user = username.isEmpty() ? null
				: userRepository.findByUsernameKey(username.toLowerCase(Locale.ROOT)).orElse(null);
		boolean passwordOk = !password.isEmpty() && password.getBytes(StandardCharsets.UTF_8).length <= MAX_BCRYPT_BYTES
				&& passwordEncoder.matches(password, user == null ? dummyHash : user.getPasswordHash());
		if (user == null || !passwordOk) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "Invalid username or password");
		}
		Instant now = clock.instant();
		JwtClaimsSet claims = JwtClaimsSet.builder().subject(user.getUsername()).claim("role", user.getRole().name())
				.issuedAt(now).expiresAt(now.plusSeconds(expiresIn)).build();
		String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
				.getTokenValue();
		return new LoginResponse(token, TOKEN_TYPE, expiresIn);
	}

}
