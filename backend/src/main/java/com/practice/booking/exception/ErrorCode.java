package com.practice.booking.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	UNAUTHORIZED("80", "Unauthorized", HttpStatus.UNAUTHORIZED),
	USERNAME_EXISTS("81", "Username already exists", HttpStatus.CONFLICT),
	INVALID_INPUT("90", "Invalid data input. Please try again", HttpStatus.BAD_REQUEST),
	NOT_FOUND("91", "Resource not found", HttpStatus.NOT_FOUND),
	PERMISSION_DENIED("92", "Permission denied", HttpStatus.FORBIDDEN),
	ROOM_ALREADY_BOOKED("93", "Room is already booked for this time", HttpStatus.CONFLICT),
	TIME_IN_PAST("94", "Booking time must be in the future", HttpStatus.UNPROCESSABLE_ENTITY),
	EXCEEDS_CAPACITY("95", "Attendees exceed room capacity", HttpStatus.UNPROCESSABLE_ENTITY),
	ROOM_NOT_AVAILABLE("96", "Room is not available", HttpStatus.UNPROCESSABLE_ENTITY),
	BOOKING_NOT_MODIFIABLE("97", "Booking can no longer be modified", HttpStatus.UNPROCESSABLE_ENTITY),
	ROOM_NAME_EXISTS("98", "Room name already exists", HttpStatus.CONFLICT),
	SYSTEM_ERROR("99", "System error. Please try again later", HttpStatus.INTERNAL_SERVER_ERROR);

	private final String code;
	private final String message;
	private final HttpStatus httpStatus;

	ErrorCode(String code, String message, HttpStatus httpStatus) {
		this.code = code;
		this.message = message;
		this.httpStatus = httpStatus;
	}

	public String getCode() {
		return code;
	}

	public String getMessage() {
		return message;
	}

	public HttpStatus getHttpStatus() {
		return httpStatus;
	}

}
