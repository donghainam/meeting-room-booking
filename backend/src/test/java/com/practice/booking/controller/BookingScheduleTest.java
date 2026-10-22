package com.practice.booking.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.practice.booking.TestTokens;
import com.practice.booking.entity.Booking;
import com.practice.booking.entity.Room;
import com.practice.booking.repository.BookingRepository;
import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class BookingScheduleTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

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

	private Long booking(Long room, String title, String start, String end) {
		return bookingRepository.save(new Booking(room, title, "alice", 5, LocalDateTime.parse(start),
				LocalDateTime.parse(end))).getId();
	}

	private ResultActions schedule(String query) throws Exception {
		return mockMvc.perform(get("/api/bookings" + query).header("Authorization", tokens.bearer("alice")));
	}

	@Test
	void a6_schedule_returnsBookingsOfDayOrderedByStartTime() throws Exception {
		booking(roomId, "Afternoon", "2099-01-01T14:00:00", "2099-01-01T15:00:00");
		booking(roomId, "Morning", "2099-01-01T09:00:00", "2099-01-01T10:00:00");
		schedule("?roomId=" + roomId + "&date=2099-01-01")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].title").value("Morning"))
				.andExpect(jsonPath("$.data[1].title").value("Afternoon"))
				.andExpect(jsonPath("$.data[0].status").value("BOOKED"));
	}

	@Test
	void a6_schedule_excludesOtherDaysAndOtherRooms() throws Exception {
		Long otherRoom = roomRepository.save(new Room("Room B", "room b", 10)).getId();
		booking(roomId, "Today", "2099-01-01T09:00:00", "2099-01-01T10:00:00");
		booking(roomId, "Yesterday", "2098-12-31T09:00:00", "2098-12-31T10:00:00");
		booking(roomId, "Tomorrow", "2099-01-02T09:00:00", "2099-01-02T10:00:00");
		booking(otherRoom, "Other room", "2099-01-01T09:00:00", "2099-01-01T10:00:00");
		schedule("?roomId=" + roomId + "&date=2099-01-01")
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].title").value("Today"));
	}

	@Test
	void a6_schedule_includesBookingCrossingMidnight() throws Exception {
		booking(roomId, "Late", "2099-01-01T23:00:00", "2099-01-02T01:00:00");
		schedule("?roomId=" + roomId + "&date=2099-01-01").andExpect(jsonPath("$.data.length()").value(1));
		schedule("?roomId=" + roomId + "&date=2099-01-02").andExpect(jsonPath("$.data.length()").value(1));
		schedule("?roomId=" + roomId + "&date=2099-01-03").andExpect(jsonPath("$.data.length()").value(0));
	}

	@Test
	void a6_schedule_bookingEndingAtMidnightBelongsToThatDayOnly() throws Exception {
		booking(roomId, "Evening", "2099-01-01T22:00:00", "2099-01-02T00:00:00");
		schedule("?roomId=" + roomId + "&date=2099-01-02").andExpect(jsonPath("$.data.length()").value(0));
	}

	@Test
	void a6_schedule_excludesCancelledBookings() throws Exception {
		booking(roomId, "Cancelled", "2099-01-01T09:00:00", "2099-01-01T10:00:00");
		jdbcTemplate.update("update booking set status = 'CANCELLED'");
		schedule("?roomId=" + roomId + "&date=2099-01-01").andExpect(jsonPath("$.data.length()").value(0));
	}

	@Test
	void a6_schedule_emptyDayReturnsEmptyArray() throws Exception {
		schedule("?roomId=" + roomId + "&date=2099-01-01")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(0));
	}

	@Test
	void a6_schedule_roomNotFound_returns91() throws Exception {
		schedule("?roomId=" + (roomId + 999) + "&date=2099-01-01")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("91"));
	}

	@Test
	void a6_schedule_missingParams_returns90() throws Exception {
		schedule("?date=2099-01-01").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
		schedule("?roomId=" + roomId).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a6_schedule_invalidParams_returns90() throws Exception {
		schedule("?roomId=abc&date=2099-01-01").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		schedule("?roomId=" + roomId + "&date=01-01-2099").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		schedule("?roomId=" + roomId + "&date=2099-01-01T09:00:00").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a6_schedule_noToken_returns80() throws Exception {
		mockMvc.perform(get("/api/bookings?roomId=" + roomId + "&date=2099-01-01"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("80"));
	}

	@Test
	void unknownUrl_returns404() throws Exception {
		mockMvc.perform(get("/api/unknown").header("Authorization", tokens.bearer("alice")))
				.andExpect(status().isNotFound())
				.andExpect(content().string(""));
	}

}
