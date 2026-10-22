package com.practice.booking.config;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import com.practice.booking.repository.UserRepository;

@Configuration
public class SecurityConfig {

	private static final int MIN_SECRET_BYTES = 32;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityErrorHandler errorHandler,
			JwtDecoder jwtDecoder, UserRepository userRepository) throws Exception {
		http.csrf(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
						.requestMatchers("/api/users").hasRole("ADMIN")
						.requestMatchers(HttpMethod.POST, "/api/rooms").hasRole("ADMIN")
						// A2–A6 cho cả ADMIN và USER; BR7 của A4, A5 do service kiểm tra
						.anyRequest().authenticated())
				.exceptionHandling(handling -> handling.authenticationEntryPoint(errorHandler)
						.accessDeniedHandler(errorHandler))
				.oauth2ResourceServer(resourceServer -> resourceServer
						.authenticationEntryPoint(errorHandler)
						.accessDeniedHandler(errorHandler)
						.jwt(jwtConfigurer -> jwtConfigurer.decoder(jwtDecoder)
								.jwtAuthenticationConverter(token -> toAuthentication(token, userRepository))));
		return http.build();
	}

	// Quyền lấy từ claim `role` của token; token còn hạn nhưng user không còn tồn tại thì coi như sai token (D6)
	private AbstractAuthenticationToken toAuthentication(Jwt jwt,
			UserRepository userRepository) {
		String subject = jwt.getSubject();
		if (subject == null || !userRepository.existsByUsernameKey(subject.toLowerCase(Locale.ROOT))) {
			throw new InvalidBearerTokenException("Token subject does not exist");
		}
		String role = jwt.getClaimAsString("role");
		return new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)), subject);
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecretKey jwtSecretKey(@Value("${app.jwt.secret}") String secret) {
		byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < MIN_SECRET_BYTES) {
			throw new IllegalStateException("app.jwt.secret must be at least " + MIN_SECRET_BYTES + " bytes");
		}
		return new SecretKeySpec(bytes, "HmacSHA256");
	}

	@Bean
	public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
		return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
	}

	@Bean
	public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
		return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
	}

}
