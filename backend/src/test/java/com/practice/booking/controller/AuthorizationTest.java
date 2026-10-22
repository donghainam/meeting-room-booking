package com.practice.booking.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.practice.booking.TestTokens;

// Bảng phân quyền mục 3: role không đủ quyền → 92 (khung D2, kể cả khi body sai)
@SpringBootTest
@AutoConfigureMockMvc
class AuthorizationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

	@Test
	void userRole_cannotCreateUser_returns92() throws Exception {
		mockMvc.perform(post("/api/users").header("Authorization", tokens.bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("92"))
				.andExpect(jsonPath("$.message").value("Permission denied"))
				.andExpect(jsonPath("$.data").doesNotExist());
	}

	@Test
	void userRole_cannotListUsers_returns92() throws Exception {
		mockMvc.perform(get("/api/users").header("Authorization", tokens.bearer("alice")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("92"));
	}

	@Test
	void userRole_cannotCreateRoom_returns92() throws Exception {
		mockMvc.perform(post("/api/rooms").header("Authorization", tokens.bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Room X\",\"capacity\":5}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("92"));
	}

	@Test
	void userRole_canUseBookingAndRoomListApis() throws Exception {
		mockMvc.perform(get("/api/rooms").header("Authorization", tokens.bearer("alice")))
				.andExpect(status().isOk());
		// 90/91 chứng tỏ request đã qua tầng phân quyền
		mockMvc.perform(get("/api/bookings").header("Authorization", tokens.bearer("alice")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("90"));
		mockMvc.perform(post("/api/bookings").header("Authorization", tokens.bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(jsonPath("$.code").value("90"));
		mockMvc.perform(put("/api/bookings/999999").header("Authorization", tokens.bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(jsonPath("$.code").value("90"));
		mockMvc.perform(post("/api/bookings/999999/cancel").header("Authorization", tokens.bearer("alice")))
				.andExpect(jsonPath("$.code").value("91"));
	}

	@Test
	void adminRole_canUseAdminApis() throws Exception {
		mockMvc.perform(get("/api/users").header("Authorization", tokens.bearer("admin")))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/rooms").header("Authorization", tokens.bearer("admin")))
				.andExpect(status().isOk());
	}

}
