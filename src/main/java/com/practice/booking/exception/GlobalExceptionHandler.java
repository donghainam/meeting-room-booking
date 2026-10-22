package com.practice.booking.exception;

import java.util.Objects;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import tools.jackson.core.JacksonException;

import com.practice.booking.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex, HttpServletRequest request) {
		return clientError(ex.getErrorCode(), request, ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex,
			HttpServletRequest request) {
		String reason = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + " " + error.getDefaultMessage())
				.collect(Collectors.joining(", ", "Validation failed: ", ""));
		return clientError(ErrorCode.INVALID_INPUT, request, reason);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiResponse<Void>> handleNotReadable(HttpMessageNotReadableException ex,
			HttpServletRequest request) {
		// Không log message gốc của Jackson vì có thể chứa nguyên giá trị client gửi lên
		String reason = "Malformed request body";
		if (ex.getCause() instanceof JacksonException jacksonException && !jacksonException.getPath().isEmpty()) {
			String path = jacksonException.getPath().stream().map(JacksonException.Reference::getPropertyName)
					.filter(Objects::nonNull).collect(Collectors.joining("."));
			reason = "Unreadable value for field: " + path;
		}
		return clientError(ErrorCode.INVALID_INPUT, request, reason);
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex,
			HttpServletRequest request) {
		return clientError(ErrorCode.INVALID_INPUT, request, "Missing parameter: " + ex.getParameterName());
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
			HttpServletRequest request) {
		return clientError(ErrorCode.INVALID_INPUT, request, "Invalid value for parameter: " + ex.getName());
	}

	// URL không tồn tại: giữ HTTP 404 mặc định, không để rơi vào handler lỗi hệ thống (99)
	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<Void> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
		log.warn("No endpoint {} {}", request.getMethod(), request.getRequestURI());
		return ResponseEntity.notFound().build();
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Error {} {}", ErrorCode.SYSTEM_ERROR.getCode(), request.getRequestURI(), ex);
		return response(ErrorCode.SYSTEM_ERROR);
	}

	private ResponseEntity<ApiResponse<Void>> clientError(ErrorCode errorCode, HttpServletRequest request,
			String reason) {
		log.warn("Error {} {} - {}", errorCode.getCode(), request.getRequestURI(), reason);
		return response(errorCode);
	}

	private ResponseEntity<ApiResponse<Void>> response(ErrorCode errorCode) {
		return ResponseEntity.status(errorCode.getHttpStatus())
				.body(ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
	}

}
