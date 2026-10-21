package com.practice.booking.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.practice.booking.repository.RoomRepository;

@SpringBootTest
@AutoConfigureMockMvc
class SystemErrorTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private RoomRepository roomRepository;

	@Test
	void unexpectedError_returns99WithoutLeakingDetails() throws Exception {
		when(roomRepository.findAllByOrderByIdAsc()).thenThrow(new IllegalStateException("db password leaked"));

		mockMvc.perform(get("/api/rooms"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.code").value("99"))
				.andExpect(jsonPath("$.message").value("System error. Please try again later"))
				.andExpect(jsonPath("$.data").doesNotExist())
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("leaked"))));
	}

}
