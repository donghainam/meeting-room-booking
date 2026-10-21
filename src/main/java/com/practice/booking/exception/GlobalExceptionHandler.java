package com.practice.booking.exception;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.practice.booking.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex, HttpServletRequest request) {
		return clientError(ex.getErrorCode(), request, ex.getMessage());
	}

	@ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
			MissingRequestHeaderException.class, MethodArgumentTypeMismatchException.class })
	public ResponseEntity<ApiResponse<Void>> handleInvalidInput(Exception ex, HttpServletRequest request) {
		return clientError(ErrorCode.INVALID_INPUT, request, ex.getClass().getSimpleName());
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
