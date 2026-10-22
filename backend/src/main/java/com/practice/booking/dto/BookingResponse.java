package com.practice.booking.dto;

import java.time.LocalDateTime;

import com.practice.booking.entity.Booking;
import com.practice.booking.entity.BookingStatus;

public record BookingResponse(Long id, Long roomId, String title, String organizer, Integer attendees,
		LocalDateTime startTime, LocalDateTime endTime, BookingStatus status) {

	public static BookingResponse from(Booking booking) {
		return new BookingResponse(booking.getId(), booking.getRoomId(), booking.getTitle(), booking.getOrganizer(),
				booking.getAttendees(), booking.getStartTime(), booking.getEndTime(), booking.getStatus());
	}

}
