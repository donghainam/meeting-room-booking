package com.practice.booking.config;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

import com.practice.booking.dto.ApiResponse;
import com.practice.booking.exception.ErrorCode;

// Lỗi 80/92 phát sinh ở tầng Spring Security (trước khi tới controller) vẫn phải trả đúng khung D2
@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

	private static final Logger log = LoggerFactory.getLogger(SecurityErrorHandler.class);

	private final JsonMapper jsonMapper;

	public SecurityErrorHandler(JsonMapper jsonMapper) {
		this.jsonMapper = jsonMapper;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authException) throws IOException {
		// Không log message của exception vì có thể chứa nguyên token client gửi lên
		write(request, response, ErrorCode.UNAUTHORIZED, "Missing, invalid or expired token");
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response,
			AccessDeniedException accessDeniedException) throws IOException {
		write(request, response, ErrorCode.PERMISSION_DENIED, "Role is not allowed to call this API");
	}

	private void write(HttpServletRequest request, HttpServletResponse response, ErrorCode errorCode, String reason)
			throws IOException {
		log.warn("Error {} {} - {}", errorCode.getCode(), request.getRequestURI(), reason);
		response.setStatus(errorCode.getHttpStatus().value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		jsonMapper.writeValue(response.getOutputStream(),
				ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
	}

}
