package com.practice.booking.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.practice.booking.entity.Booking;
import com.practice.booking.entity.Room;
import com.practice.booking.repository.BookingRepository;
import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class BookingUpdateTest {

	private static final String DAY = "2099-01-01";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private RoomRepository roomRepository;

	@Autowired
	private BookingRepository bookingRepository;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private Long roomId;

	@BeforeEach
	void setUp() {
		bookingRepository.deleteAll();
		roomRepository.deleteAll();
		roomId = roomRepository.save(new Room("Room A", "room a", 10)).getId();
	}

	private String at(String time) {
		return DAY + "T" + time;
	}

	// Tạo sẵn một lượt đặt của alice trực tiếp qua repository (kể cả giờ trong quá khứ)
	private Long existingBooking(String start, String end) {
		return bookingRepository.save(new Booking(roomId, "Sync", "alice", 5, LocalDateTime.parse(start),
				LocalDateTime.parse(end))).getId();
	}

	private String body(String title, Integer attendees, String start, String end) {
		return "{\"title\":\"" + title + "\",\"attendees\":" + attendees + ",\"startTime\":\"" + start
				+ "\",\"endTime\":\"" + end + "\"}";
	}

	private ResultActions update(String userId, Long id, String json) throws Exception {
		var request = put("/api/bookings/" + id).contentType(MediaType.APPLICATION_JSON).content(json);
		if (userId != null) {
			request.header("X-User-Id", userId);
		}
		return mockMvc.perform(request);
	}

	private ResultActions updateSlot(Long id, String start, String end) throws Exception {
		return update("alice", id, body("Sync", 5, at(start), at(end)));
	}

	@Test
	void a4_updateBooking_returnsSuccess() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update("alice", id, body("New title", 8, at("14:00:00"), at("15:30:00")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.id").value(id))
				.andExpect(jsonPath("$.data.roomId").value(roomId))
				.andExpect(jsonPath("$.data.title").value("New title"))
				.andExpect(jsonPath("$.data.organizer").value("alice"))
				.andExpect(jsonPath("$.data.attendees").value(8))
				.andExpect(jsonPath("$.data.startTime").value(at("14:00:00")))
				.andExpect(jsonPath("$.data.endTime").value(at("15:30:00")))
				.andExpect(jsonPath("$.data.status").value("BOOKED"));
		assertEquals("New title", bookingRepository.findById(id).orElseThrow().getTitle());
	}

	@Test
	void a4_missingUserId_returns90() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update(null, id, body("Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a4_invalidFields_returns90() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update("alice", id, "{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
		update("alice", id, body(" ", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(jsonPath("$.code").value("90"));
		update("alice", id, body("Sync", 0, at("09:00:00"), at("10:00:00")))
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a4_bookingNotFound_returns91() throws Exception {
		updateSlot(999999L, "09:00:00", "10:00:00")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("91"));
	}

	@Test
	void br1_updateEndNotAfterStart_returns90() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		updateSlot(id, "10:00:00", "10:00:00")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void br3_updateOverFourHours_returns90() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		updateSlot(id, "09:00:00", "13:01:00")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		updateSlot(id, "09:00:00", "13:00:00").andExpect(status().isOk());
	}

	@Test
	void br2_updateToPast_returns94() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update("alice", id, body("Sync", 5, "2000-01-01T09:00:00", "2000-01-01T10:00:00"))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("94"));
	}

	@Test
	void br4_updateOverlappingAnotherBooking_returns93() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		existingBooking(at("11:00:00"), at("12:00:00"));
		updateSlot(id, "11:30:00", "12:30:00")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("93"));
	}

	@Test
	void br4_updateOverlappingItself_isAllowed() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		updateSlot(id, "09:30:00", "10:30:00").andExpect(status().isOk());
		updateSlot(id, "09:30:00", "10:30:00").andExpect(status().isOk());
	}

	@Test
	void br4_updateTouchingEdge_isAllowed() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		existingBooking(at("11:00:00"), at("12:00:00"));
		updateSlot(id, "10:00:00", "11:00:00").andExpect(status().isOk());
	}

	@Test
	void br4_updateIgnoresCancelledBooking() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		Long other = existingBooking(at("11:00:00"), at("12:00:00"));
		jdbcTemplate.update("update booking set status = 'CANCELLED' where id = ?", other);
		updateSlot(id, "11:00:00", "12:00:00").andExpect(status().isOk());
	}

	@Test
	void br5_updateExceedCapacity_returns95() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update("alice", id, body("Sync", 11, at("09:00:00"), at("10:00:00")))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("95"));
	}

	@Test
	void br6_updateInactiveRoom_returns96() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		jdbcTemplate.update("update room set active = false where id = ?", roomId);
		updateSlot(id, "09:30:00", "10:30:00")
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("96"));
	}

	@Test
	void br7_updateByOtherUser_returns92() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		update("bob", id, body("Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("92"));
	}

	@Test
	void br7_otherUserOnCancelledBooking_returns92NotBr8() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		jdbcTemplate.update("update booking set status = 'CANCELLED'");
		update("bob", id, body("Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("92"));
	}

	@Test
	void br8_updateCancelledBooking_returns97() throws Exception {
		Long id = existingBooking(at("09:00:00"), at("10:00:00"));
		jdbcTemplate.update("update booking set status = 'CANCELLED'");
		updateSlot(id, "11:00:00", "12:00:00")
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("97"));
	}

	@Test
	void br8_updateStartedBooking_returns97() throws Exception {
		Long id = existingBooking("2000-01-01T09:00:00", "2000-01-01T10:00:00");
		updateSlot(id, "11:00:00", "12:00:00")
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("97"));
	}

	@Test
	void br9_concurrentUpdatesToSameSlot_onlyOneSucceeds() throws Exception {
		Long first = existingBooking(at("09:00:00"), at("10:00:00"));
		Long second = existingBooking(at("11:00:00"), at("12:00:00"));
		int threads = 2;
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		CountDownLatch ready = new CountDownLatch(threads);
		CountDownLatch go = new CountDownLatch(1);
		List<Future<Integer>> results = new ArrayList<>();
		for (Long id : List.of(first, second)) {
			results.add(executor.submit(() -> {
				ready.countDown();
				go.await();
				return updateSlot(id, "14:00:00", "15:00:00").andReturn().getResponse().getStatus();
			}));
		}
		ready.await();
		go.countDown();
		int ok = 0;
		int conflict = 0;
		for (Future<Integer> result : results) {
			int httpStatus = result.get();
			if (httpStatus == 200) {
				ok++;
			} else if (httpStatus == 409) {
				conflict++;
			}
		}
		executor.shutdown();
		assertEquals(1, ok);
		assertEquals(1, conflict);
	}

}
