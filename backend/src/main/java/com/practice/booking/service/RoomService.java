package com.practice.booking.service;

import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.practice.booking.dto.CreateRoomRequest;
import com.practice.booking.dto.RoomResponse;
import com.practice.booking.entity.Room;
import com.practice.booking.exception.BusinessException;
import com.practice.booking.exception.ErrorCode;
import com.practice.booking.repository.RoomRepository;

@Service
public class RoomService {

	private static final Logger log = LoggerFactory.getLogger(RoomService.class);

	private final RoomRepository roomRepository;

	public RoomService(RoomRepository roomRepository) {
		this.roomRepository = roomRepository;
	}

	public RoomResponse create(CreateRoomRequest request) {
		String name = request.name().trim();
		String nameKey = name.toLowerCase(Locale.ROOT);
		if (roomRepository.existsByNameKey(nameKey)) {
			throw new BusinessException(ErrorCode.ROOM_NAME_EXISTS, "Room name '" + name + "' already exists");
		}
		try {
			return RoomResponse.from(roomRepository.saveAndFlush(new Room(name, nameKey, request.capacity())));
		} catch (DataIntegrityViolationException ex) {
			// hai request cùng tên chạy đồng thời: unique constraint chặn request sau
			log.warn("Cannot save room '{}': {}", name, ex.getMostSpecificCause().getMessage());
			throw new BusinessException(ErrorCode.ROOM_NAME_EXISTS);
		}
	}

	public List<RoomResponse> findAll() {
		return roomRepository.findAllByOrderByIdAsc().stream().map(RoomResponse::from).toList();
	}

}
