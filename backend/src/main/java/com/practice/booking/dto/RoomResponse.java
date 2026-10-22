package com.practice.booking.dto;

import com.practice.booking.entity.Room;

public record RoomResponse(Long id, String name, Integer capacity, Boolean active) {

	public static RoomResponse from(Room room) {
		return new RoomResponse(room.getId(), room.getName(), room.getCapacity(), room.getActive());
	}

}
