package com.practice.booking.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.practice.booking.TestTokens;
import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class RoomControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

	@Autowired
	private RoomRepository roomRepository;

	@BeforeEach
	void cleanUp() {
		roomRepository.deleteAll();
	}

	private ResultActions createRoom(String body) throws Exception {
		return mockMvc.perform(post("/api/rooms").header("Authorization", tokens.bearer("admin")).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	@Test
	void a1_createRoom_returnsSuccessWithActiveTrue() throws Exception {
		createRoom("{\"name\":\"  Room A \",\"capacity\":10}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.message").value("Success"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.name").value("Room A"))
				.andExpect(jsonPath("$.data.capacity").value(10))
				.andExpect(jsonPath("$.data.active").value(true));
	}

	@Test
	void a1_activeInRequestIsIgnored() throws Exception {
		createRoom("{\"name\":\"Room A\",\"capacity\":10,\"active\":false}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.active").value(true));
	}

	@Test
	void a1_missingName_returns90() throws Exception {
		createRoom("{\"capacity\":10}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"))
				.andExpect(jsonPath("$.data").doesNotExist());
	}

	@Test
	void a1_blankName_returns90() throws Exception {
		createRoom("{\"name\":\"   \",\"capacity\":10}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_nameLongerThan100_returns90() throws Exception {
		createRoom("{\"name\":\"" + "a".repeat(101) + "\",\"capacity\":10}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_capacityOutOfRange_returns90() throws Exception {
		createRoom("{\"name\":\"R0\",\"capacity\":0}").andExpect(jsonPath("$.code").value("90"));
		createRoom("{\"name\":\"R101\",\"capacity\":101}").andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_missingCapacity_returns90() throws Exception {
		createRoom("{\"name\":\"Room A\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_capacityNotNumber_returns90() throws Exception {
		createRoom("{\"name\":\"Room A\",\"capacity\":\"abc\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_malformedJson_returns90() throws Exception {
		createRoom("{not json")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void a1_duplicateName_returns98() throws Exception {
		createRoom("{\"name\":\"Room A\",\"capacity\":10}").andExpect(status().isOk());
		createRoom("{\"name\":\"Room A\",\"capacity\":20}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("98"))
				.andExpect(jsonPath("$.message").value("Room name already exists"));
	}

	@Test
	void a1_duplicateNameIgnoringCaseAndSpaces_returns98() throws Exception {
		createRoom("{\"name\":\"Room A\",\"capacity\":10}").andExpect(status().isOk());
		createRoom("{\"name\":\" room a \",\"capacity\":20}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("98"));
	}

	@Test
	void a2_listRooms_returnsRoomsOrderedById() throws Exception {
		createRoom("{\"name\":\"Room A\",\"capacity\":10}");
		createRoom("{\"name\":\"Room B\",\"capacity\":20}");

		mockMvc.perform(get("/api/rooms").header("Authorization", tokens.bearer("admin")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].name").value("Room A"))
				.andExpect(jsonPath("$.data[1].name").value("Room B"));
	}

	@Test
	void a2_listRooms_emptyReturnsEmptyArray() throws Exception {
		mockMvc.perform(get("/api/rooms").header("Authorization", tokens.bearer("admin")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(0));
	}

	@Test
	void a2_userRoleCanListRooms() throws Exception {
		mockMvc.perform(get("/api/rooms").header("Authorization", tokens.bearer("alice")))
				.andExpect(status().isOk());
	}

}
