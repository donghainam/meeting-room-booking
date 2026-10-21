package com.practice.booking.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.practice.booking.entity.Booking;
import com.practice.booking.entity.BookingStatus;

public interface BookingRepository extends JpaRepository<Booking, Long> {

	// [s1, e1) và [s2, e2) chồng nhau khi s1 < e2 AND s2 < e1
	@Query("select count(b) > 0 from Booking b where b.roomId = :roomId and b.status = :status"
			+ " and b.startTime < :endTime and :startTime < b.endTime")
	boolean existsOverlap(@Param("roomId") Long roomId, @Param("status") BookingStatus status,
			@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

}
