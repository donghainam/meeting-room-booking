package com.practice.booking.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Booking {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long roomId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 100)
	private String organizer;

	@Column(nullable = false)
	private Integer attendees;

	@Column(nullable = false)
	private LocalDateTime startTime;

	@Column(nullable = false)
	private LocalDateTime endTime;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private BookingStatus status = BookingStatus.BOOKED;

	protected Booking() {
	}

	public Booking(Long roomId, String title, String organizer, Integer attendees, LocalDateTime startTime,
			LocalDateTime endTime) {
		this.roomId = roomId;
		this.title = title;
		this.organizer = organizer;
		this.attendees = attendees;
		this.startTime = startTime;
		this.endTime = endTime;
	}

	public Long getId() {
		return id;
	}

	public Long getRoomId() {
		return roomId;
	}

	public String getTitle() {
		return title;
	}

	public String getOrganizer() {
		return organizer;
	}

	public Integer getAttendees() {
		return attendees;
	}

	public LocalDateTime getStartTime() {
		return startTime;
	}

	public LocalDateTime getEndTime() {
		return endTime;
	}

	public BookingStatus getStatus() {
		return status;
	}

}
