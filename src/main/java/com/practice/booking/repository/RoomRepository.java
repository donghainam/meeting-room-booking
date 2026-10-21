package com.practice.booking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practice.booking.entity.Room;

public interface RoomRepository extends JpaRepository<Room, Long> {

	boolean existsByNameKey(String nameKey);

	List<Room> findAllByOrderByIdAsc();

}
