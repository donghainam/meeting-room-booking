package com.practice.booking;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import com.practice.booking.entity.Role;
import com.practice.booking.entity.User;
import com.practice.booking.repository.UserRepository;

// Sinh header Authorization cho test: tạo user (nếu chưa có) rồi ký JWT như U0
@Component
public class TestTokens {

	private final JwtEncoder jwtEncoder;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	public TestTokens(JwtEncoder jwtEncoder, UserRepository userRepository, PasswordEncoder passwordEncoder,
			Clock clock) {
		this.jwtEncoder = jwtEncoder;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.clock = clock;
	}

	public String bearer(String username) {
		return bearer(username, "admin".equals(username) ? Role.ADMIN : Role.USER);
	}

	public String bearer(String username, Role role) {
		ensureUser(username, role);
		return "Bearer " + token(username, role.name(), clock.instant().plusSeconds(3600));
	}

	public String expiredBearer(String username) {
		ensureUser(username, Role.USER);
		return "Bearer " + token(username, Role.USER.name(), clock.instant().minusSeconds(3600));
	}

	// Token hợp lệ về chữ ký nhưng user chưa từng được tạo
	public String bearerOfMissingUser(String username) {
		return "Bearer " + token(username, Role.USER.name(), clock.instant().plusSeconds(3600));
	}

	// synchronized vì test đồng thời (BR9) có thể cùng tạo một user
	private synchronized void ensureUser(String username, Role role) {
		String key = username.toLowerCase(Locale.ROOT);
		if (!userRepository.existsByUsernameKey(key)) {
			userRepository.save(new User(username, key, passwordEncoder.encode("password123"), role));
		}
	}

	private String token(String username, String role, Instant expiresAt) {
		JwtClaimsSet claims = JwtClaimsSet.builder().subject(username).claim("role", role)
				.issuedAt(expiresAt.minusSeconds(7200)).expiresAt(expiresAt).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
				.getTokenValue();
	}

}
