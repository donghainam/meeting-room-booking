package com.practice.booking.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.practice.booking.TestTokens;
import com.practice.booking.entity.Booking;
import com.practice.booking.entity.BookingStatus;
import com.practice.booking.entity.Room;
import com.practice.booking.repository.BookingRepository;
import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class BookingCancelTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

	@Autowired
	private RoomRepository roomRepository;

	@Autowired
	private BookingRepository bookingRepository;

	private Long roomId;

	@BeforeEach
	void setUp() {
		bookingRepository.deleteAll();
		roomRepository.deleteAll();
		roomId = roomRepository.save(new Room("Room A", "room a", 10)).getId();
	}

	// Tạo sẵn một lượt đặt của alice trực tiếp qua repository (kể cả giờ trong quá khứ)
	private Long existingBooking(String start, String end) {
		return bookingRepository.save(new Booking(roomId, "Sync", "alice", 5, LocalDateTime.parse(start),
				LocalDateTime.parse(end))).getId();
	}

	private ResultActions cancel(String userId, Object id) throws Exception {
		var request = post("/api/bookings/" + id + "/cancel").contentType(MediaType.APPLICATION_JSON);
		if (userId != null) {
			request.header("Authorization", tokens.bearer(userId));
		}
		return mockMvc.perform(request);
	}

	@Test
	void a5_cancelBooking_returnsCancelled() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("alice", id)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.id").value(id))
				.andExpect(jsonPath("$.data.status").value("CANCELLED"));
		assertEquals(BookingStatus.CANCELLED, bookingRepository.findById(id).orElseThrow().getStatus());
	}

	@Test
	void a5_cancelFreesTheSlot() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("alice", id).andExpect(status().isOk());
		mockMvc.perform(post("/api/bookings").header("Authorization", tokens.bearer("bob")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"roomId\":" + roomId + ",\"title\":\"Sync\",\"attendees\":5,"
						+ "\"startTime\":\"2099-01-01T09:00:00\",\"endTime\":\"2099-01-01T10:00:00\"}"))
				.andExpect(status().isOk());
	}

	@Test
	void a5_noToken_returns80() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel(null, id).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("80"));
	}

	@Test
	void a5_invalidId_returns90() throws Exception {
		cancel("alice", "abc").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a5_bookingNotFound_returns91() throws Exception {
		cancel("alice", 999999L).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("91"));
	}

	@Test
	void br7_cancelByOtherUser_returns92() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("bob", id).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("92"));
		assertEquals(BookingStatus.BOOKED, bookingRepository.findById(id).orElseThrow().getStatus());
	}

	@Test
	void br8_cancelAlreadyCancelled_returns97() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("alice", id).andExpect(status().isOk());
		cancel("alice", id).andExpect(status().is(422)).andExpect(jsonPath("$.code").value("97"));
	}

	@Test
	void br8_cancelStartedBooking_returns97() throws Exception {
		Long id = existingBooking("2000-01-01T09:00:00", "2000-01-01T10:00:00");
		cancel("alice", id).andExpect(status().is(422)).andExpect(jsonPath("$.code").value("97"));
		assertEquals(BookingStatus.BOOKED, bookingRepository.findById(id).orElseThrow().getStatus());
	}

	@Test
	void br7_adminCanCancelOthersBooking() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("admin", id).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("CANCELLED"));
		assertEquals(BookingStatus.CANCELLED, bookingRepository.findById(id).orElseThrow().getStatus());
	}

	@Test
	void br7_otherUserOnCancelledBooking_returns92NotBr8() throws Exception {
		Long id = existingBooking("2099-01-01T09:00:00", "2099-01-01T10:00:00");
		cancel("alice", id).andExpect(status().isOk());
		cancel("bob", id).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("92"));
	}

}
