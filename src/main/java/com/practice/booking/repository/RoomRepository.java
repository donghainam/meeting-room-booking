package com.practice.booking.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.practice.booking.entity.Room;

public interface RoomRepository extends JpaRepository<Room, Long> {

	boolean existsByNameKey(String nameKey);

	List<Room> findAllByOrderByIdAsc();

	// SELECT ... FOR UPDATE: khóa bản ghi phòng cho đến hết transaction, dùng để tránh
	// hai request đặt cùng phòng, cùng giờ chạy song song và cùng thành công
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select r from Room r where r.id = :id")
	Optional<Room> findByIdForUpdate(@Param("id") Long id);

}
