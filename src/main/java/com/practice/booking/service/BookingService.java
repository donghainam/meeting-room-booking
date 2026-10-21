package com.practice.booking.service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.practice.booking.dto.BookingResponse;
import com.practice.booking.dto.CreateBookingRequest;
import com.practice.booking.entity.Booking;
import com.practice.booking.entity.BookingStatus;
import com.practice.booking.entity.Room;
import com.practice.booking.exception.BusinessException;
import com.practice.booking.exception.ErrorCode;
import com.practice.booking.repository.BookingRepository;
import com.practice.booking.repository.RoomRepository;

@Service
public class BookingService {

	private static final Duration MAX_DURATION = Duration.ofHours(4);
	private static final int MAX_ORGANIZER_LENGTH = 100;

	private final BookingRepository bookingRepository;
	private final RoomRepository roomRepository;
	private final Clock clock;

	public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository, Clock clock) {
		this.bookingRepository = bookingRepository;
		this.roomRepository = roomRepository;
		this.clock = clock;
	}

	@Transactional
	public BookingResponse create(String userId, CreateBookingRequest request) {
		// Người đặt lấy từ header X-User-Id: bắt buộc có và không quá dài
		String organizer = userId == null ? "" : userId.trim();
		if (organizer.isEmpty() || organizer.length() > MAX_ORGANIZER_LENGTH) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"X-User-Id is blank or longer than " + MAX_ORGANIZER_LENGTH + " characters");
		}
		// Giờ kết thúc phải sau giờ bắt đầu (BR1)
		if (!request.endTime().isAfter(request.startTime())) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"endTime " + request.endTime() + " is not after startTime " + request.startTime());
		}
		// Mỗi lượt đặt dài tối đa 4 giờ (BR3)
		Duration duration = Duration.between(request.startTime(), request.endTime());
		if (duration.compareTo(MAX_DURATION) > 0) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"Booking duration " + duration + " exceeds max " + MAX_DURATION);
		}
		// Khóa bản ghi phòng cho đến hết transaction: các request đặt cùng phòng phải xếp hàng,
		// nhờ đó request sau luôn thấy lượt đặt của request trước khi kiểm tra trùng giờ (BR9)
		Room room = roomRepository.findByIdForUpdate(request.roomId())
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
						"Room " + request.roomId() + " does not exist"));
		// Phòng đã ngừng hoạt động thì không cho đặt (BR6)
		if (!room.getActive()) {
			throw new BusinessException(ErrorCode.ROOM_NOT_AVAILABLE, "Room " + room.getId() + " is inactive");
		}
		// Không đặt vào thời điểm đã qua hoặc đang diễn ra; "hiện tại" lấy từ Clock (BR2)
		LocalDateTime now = LocalDateTime.now(clock);
		if (!request.startTime().isAfter(now)) {
			throw new BusinessException(ErrorCode.TIME_IN_PAST,
					"startTime " + request.startTime() + " is not after current time " + now);
		}
		// Số người tham dự không được vượt sức chứa của phòng (BR5)
		if (request.attendees() > room.getCapacity()) {
			throw new BusinessException(ErrorCode.EXCEEDS_CAPACITY, "Attendees " + request.attendees()
					+ " exceed capacity " + room.getCapacity() + " of room " + room.getId());
		}
		// Phòng đã có lượt đặt khác chồng giờ thì từ chối (BR4)
		if (bookingRepository.existsOverlap(room.getId(), BookingStatus.BOOKED, request.startTime(),
				request.endTime())) {
			throw new BusinessException(ErrorCode.ROOM_ALREADY_BOOKED, "Room " + room.getId()
					+ " already has a booking overlapping " + request.startTime() + " - " + request.endTime());
		}
		Booking booking = new Booking(room.getId(), request.title().trim(), organizer, request.attendees(),
				request.startTime(), request.endTime());
		return BookingResponse.from(bookingRepository.save(booking));
	}

}
