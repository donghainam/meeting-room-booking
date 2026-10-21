package com.practice.booking.service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.practice.booking.dto.BookingResponse;
import com.practice.booking.dto.CreateBookingRequest;
import com.practice.booking.dto.UpdateBookingRequest;
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
		String organizer = requireOrganizer(userId);
		validateTimeRange(request.startTime(), request.endTime());
		Room room = lockRoom(request.roomId());
		validateAgainstRoom(room, request.attendees(), request.startTime(), request.endTime(), null);
		Booking booking = new Booking(room.getId(), request.title().trim(), organizer, request.attendees(),
				request.startTime(), request.endTime());
		return BookingResponse.from(bookingRepository.save(booking));
	}

	@Transactional
	public BookingResponse update(String userId, Long id, UpdateBookingRequest request) {
		String organizer = requireOrganizer(userId);
		validateTimeRange(request.startTime(), request.endTime());
		Booking booking = loadModifiableBooking(id, organizer);
		Room room = lockRoom(booking.getRoomId());
		validateAgainstRoom(room, request.attendees(), request.startTime(), request.endTime(), booking.getId());
		booking.update(request.title().trim(), request.attendees(), request.startTime(), request.endTime());
		return BookingResponse.from(booking);
	}

	@Transactional
	public BookingResponse cancel(String userId, Long id) {
		String organizer = requireOrganizer(userId);
		Booking booking = loadModifiableBooking(id, organizer);
		booking.cancel();
		return BookingResponse.from(booking);
	}

	// Người đặt lấy từ header X-User-Id: bắt buộc có và không quá dài
	private String requireOrganizer(String userId) {
		String organizer = userId == null ? "" : userId.trim();
		if (organizer.isEmpty() || organizer.length() > MAX_ORGANIZER_LENGTH) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"X-User-Id is blank or longer than " + MAX_ORGANIZER_LENGTH + " characters");
		}
		return organizer;
	}

	private void validateTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
		// Giờ kết thúc phải sau giờ bắt đầu (BR1)
		if (!endTime.isAfter(startTime)) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"endTime " + endTime + " is not after startTime " + startTime);
		}
		// Mỗi lượt đặt dài tối đa 4 giờ (BR3)
		Duration duration = Duration.between(startTime, endTime);
		if (duration.compareTo(MAX_DURATION) > 0) {
			throw new BusinessException(ErrorCode.INVALID_INPUT,
					"Booking duration " + duration + " exceeds max " + MAX_DURATION);
		}
	}

	// Khóa bản ghi phòng cho đến hết transaction: các request đặt/sửa cùng phòng phải xếp hàng,
	// nhờ đó request sau luôn thấy lượt đặt của request trước khi kiểm tra trùng giờ (BR9)
	private Room lockRoom(Long roomId) {
		return roomRepository.findByIdForUpdate(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Room " + roomId + " does not exist"));
	}

	// Lấy lượt đặt (đã khóa dòng) để sửa/hủy: chỉ người đặt mới được sửa/hủy (BR7),
	// và không sửa/hủy lượt đã hủy hoặc đã bắt đầu (BR8)
	private Booking loadModifiableBooking(Long id, String organizer) {
		Booking booking = bookingRepository.findByIdForUpdate(id)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Booking " + id + " does not exist"));
		if (!booking.getOrganizer().equals(organizer)) {
			throw new BusinessException(ErrorCode.PERMISSION_DENIED,
					"User '" + organizer + "' is not the organizer of booking " + id);
		}
		if (booking.getStatus() == BookingStatus.CANCELLED) {
			throw new BusinessException(ErrorCode.BOOKING_NOT_MODIFIABLE, "Booking " + id + " is already cancelled");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		if (!booking.getStartTime().isAfter(now)) {
			throw new BusinessException(ErrorCode.BOOKING_NOT_MODIFIABLE,
					"Booking " + id + " already started at " + booking.getStartTime() + " (now " + now + ")");
		}
		return booking;
	}

	// Các luật phụ thuộc vào phòng, dùng chung cho đặt mới và sửa.
	// excludeId: lượt đặt đang sửa, không tính là trùng với chính nó (null khi đặt mới)
	private void validateAgainstRoom(Room room, Integer attendees, LocalDateTime startTime, LocalDateTime endTime,
			Long excludeId) {
		// Phòng đã ngừng hoạt động thì không cho đặt (BR6)
		if (!room.getActive()) {
			throw new BusinessException(ErrorCode.ROOM_NOT_AVAILABLE, "Room " + room.getId() + " is inactive");
		}
		// Không đặt vào thời điểm đã qua hoặc đang diễn ra; "hiện tại" lấy từ Clock (BR2)
		LocalDateTime now = LocalDateTime.now(clock);
		if (!startTime.isAfter(now)) {
			throw new BusinessException(ErrorCode.TIME_IN_PAST,
					"startTime " + startTime + " is not after current time " + now);
		}
		// Số người tham dự không được vượt sức chứa của phòng (BR5)
		if (attendees > room.getCapacity()) {
			throw new BusinessException(ErrorCode.EXCEEDS_CAPACITY,
					"Attendees " + attendees + " exceed capacity " + room.getCapacity() + " of room " + room.getId());
		}
		// Phòng đã có lượt đặt khác chồng giờ thì từ chối (BR4)
		if (bookingRepository.existsOverlap(room.getId(), BookingStatus.BOOKED, startTime, endTime, excludeId)) {
			throw new BusinessException(ErrorCode.ROOM_ALREADY_BOOKED, "Room " + room.getId()
					+ " already has a booking overlapping " + startTime + " - " + endTime);
		}
	}

}
