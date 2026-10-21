package com.practice.booking.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.practice.booking.entity.Booking;
import com.practice.booking.entity.BookingStatus;

public interface BookingRepository extends JpaRepository<Booking, Long> {

	// [s1, e1) và [s2, e2) chồng nhau khi s1 < e2 AND s2 < e1.
	// excludeId: bỏ qua một lượt đặt (dùng khi sửa, để không so sánh lượt đặt với chính nó); null thì không bỏ qua.
	@Query("select count(b) > 0 from Booking b where b.roomId = :roomId and b.status = :status"
			+ " and b.startTime < :endTime and :startTime < b.endTime"
			+ " and (:excludeId is null or b.id <> :excludeId)")
	boolean existsOverlap(@Param("roomId") Long roomId, @Param("status") BookingStatus status,
			@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime,
			@Param("excludeId") Long excludeId);

	// Khóa dòng lượt đặt cho đến hết transaction, để sửa/hủy cùng một lượt đặt không chạy song song
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select b from Booking b where b.id = :id")
	Optional<Booking> findByIdForUpdate(@Param("id") Long id);

}
