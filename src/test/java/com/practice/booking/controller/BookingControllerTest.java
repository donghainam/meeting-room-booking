package com.practice.booking.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.practice.booking.entity.Room;
import com.practice.booking.repository.BookingRepository;
import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class BookingControllerTest {

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

	private String body(Long room, String title, Integer attendees, String start, String end) {
		return "{\"roomId\":" + room + ",\"title\":\"" + title + "\",\"attendees\":" + attendees
				+ ",\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\"}";
	}

	private String at(String time) {
		return DAY + "T" + time;
	}

	private ResultActions book(String userId, String json) throws Exception {
		var request = post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json);
		if (userId != null) {
			request.header("X-User-Id", userId);
		}
		return mockMvc.perform(request);
	}

	private ResultActions bookSlot(String start, String end) throws Exception {
		return book("alice", body(roomId, "Sync", 5, start, end));
	}

	@Test
	void a3_createBooking_returnsSuccess() throws Exception {
		bookSlot(at("09:00:00"), at("10:00:00"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.roomId").value(roomId))
				.andExpect(jsonPath("$.data.title").value("Sync"))
				.andExpect(jsonPath("$.data.organizer").value("alice"))
				.andExpect(jsonPath("$.data.attendees").value(5))
				.andExpect(jsonPath("$.data.startTime").value(at("09:00:00")))
				.andExpect(jsonPath("$.data.endTime").value(at("10:00:00")))
				.andExpect(jsonPath("$.data.status").value("BOOKED"));
	}

	@Test
	void a3_missingUserId_returns90() throws Exception {
		book(null, body(roomId, "Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a3_blankUserId_returns90() throws Exception {
		book("   ", body(roomId, "Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a3_userIdLongerThan100_returns90() throws Exception {
		book("u".repeat(101), body(roomId, "Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		book("u".repeat(100), body(roomId, "Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isOk());
	}

	@Test
	void a3_missingFields_returns90() throws Exception {
		book("alice", "{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a3_invalidTitleOrAttendees_returns90() throws Exception {
		book("alice", body(roomId, " ", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(jsonPath("$.code").value("90"));
		book("alice", body(roomId, "t".repeat(201), 5, at("09:00:00"), at("10:00:00")))
				.andExpect(jsonPath("$.code").value("90"));
		book("alice", body(roomId, "Sync", 0, at("09:00:00"), at("10:00:00")))
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a3_timeWithOffset_returns90() throws Exception {
		bookSlot(at("09:00:00") + "+07:00", at("10:00:00") + "+07:00")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a3_roomNotFound_returns91() throws Exception {
		book("alice", body(roomId + 999, "Sync", 5, at("09:00:00"), at("10:00:00")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("91"));
	}

	@Test
	void br1_endNotAfterStart_returns90() throws Exception {
		bookSlot(at("10:00:00"), at("10:00:00"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		bookSlot(at("10:00:00"), at("09:00:00"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void br2_startInPast_returns94() throws Exception {
		book("alice", body(roomId, "Sync", 5, "2000-01-01T09:00:00", "2000-01-01T10:00:00"))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("94"));
	}

	@Test
	void br3_exactlyFourHours_isAllowed() throws Exception {
		bookSlot(at("09:00:00"), at("13:00:00")).andExpect(status().isOk());
	}

	@Test
	void br3_overFourHours_returns90() throws Exception {
		bookSlot(at("09:00:00"), at("13:01:00"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void br4_overlap_returns93() throws Exception {
		bookSlot(at("09:00:00"), at("10:00:00")).andExpect(status().isOk());
		bookSlot(at("09:30:00"), at("10:30:00"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("93"));
		bookSlot(at("08:00:00"), at("11:00:00"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("93"));
		bookSlot(at("09:00:00"), at("10:00:00"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("93"));
	}

	@Test
	void br4_touchingEdges_isAllowed() throws Exception {
		bookSlot(at("09:00:00"), at("10:00:00")).andExpect(status().isOk());
		bookSlot(at("10:00:00"), at("11:00:00")).andExpect(status().isOk());
		bookSlot(at("08:00:00"), at("09:00:00")).andExpect(status().isOk());
	}

	@Test
	void br4_otherRoomSameTime_isAllowed() throws Exception {
		Long otherRoomId = roomRepository.save(new Room("Room B", "room b", 10)).getId();
		bookSlot(at("09:00:00"), at("10:00:00")).andExpect(status().isOk());
		book("alice", body(otherRoomId, "Sync", 5, at("09:00:00"), at("10:00:00"))).andExpect(status().isOk());
	}

	@Test
	void br4_cancelledBookingIsIgnored() throws Exception {
		bookSlot(at("09:00:00"), at("10:00:00")).andExpect(status().isOk());
		jdbcTemplate.update("update booking set status = 'CANCELLED'");
		bookSlot(at("09:00:00"), at("10:00:00")).andExpect(status().isOk());
	}

	@Test
	void br5_attendeesExceedCapacity_returns95() throws Exception {
		book("alice", body(roomId, "Sync", 11, at("09:00:00"), at("10:00:00")))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("95"));
		book("alice", body(roomId, "Sync", 10, at("09:00:00"), at("10:00:00"))).andExpect(status().isOk());
	}

	@Test
	void br6_inactiveRoom_returns96() throws Exception {
		jdbcTemplate.update("update room set active = false where id = ?", roomId);
		bookSlot(at("09:00:00"), at("10:00:00"))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("96"));
	}

	@Test
	void br9_concurrentOverlappingRequests_onlyOneSucceeds() throws Exception {
		int threads = 2;
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		CountDownLatch ready = new CountDownLatch(threads);
		CountDownLatch go = new CountDownLatch(1);
		List<Future<Integer>> results = new ArrayList<>();
		for (int i = 0; i < threads; i++) {
			String user = "user" + i;
			results.add(executor.submit(() -> {
				ready.countDown();
				go.await();
				return book(user, body(roomId, "Sync", 5, at("09:00:00"), at("10:00:00")))
						.andReturn().getResponse().getStatus();
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
		assertEquals(1, bookingRepository.count());
	}

}
