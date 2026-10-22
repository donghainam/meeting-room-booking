package com.practice.booking.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.practice.booking.TestTokens;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

	private ResultActions login(String json) throws Exception {
		return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private void assertUnauthorized(ResultActions result) throws Exception {
		result.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("80"))
				.andExpect(jsonPath("$.message").value("Unauthorized"))
				.andExpect(jsonPath("$.data").doesNotExist());
	}

	@Test
	void u0_defaultAdminLogin_returnsTokenThatWorks() throws Exception {
		String response = login("{\"username\":\"admin\",\"password\":\"admin\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.data.expiresIn").value(3600))
				.andReturn().getResponse().getContentAsString();
		String token = response.replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");
		mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].username").value("admin"))
				.andExpect(jsonPath("$.data[0].role").value("ADMIN"));
	}

	@Test
	void u0_usernameIsCaseInsensitive() throws Exception {
		login("{\"username\":\" ADMIN \",\"password\":\"admin\"}").andExpect(status().isOk());
	}

	@Test
	void u0_wrongPassword_returns80() throws Exception {
		assertUnauthorized(login("{\"username\":\"admin\",\"password\":\"wrong\"}"));
	}

	@Test
	void u0_unknownUsername_returns80WithSameMessage() throws Exception {
		assertUnauthorized(login("{\"username\":\"nobody\",\"password\":\"admin\"}"));
	}

	@Test
	void u0_missingOrBlankFields_returns80() throws Exception {
		assertUnauthorized(login("{}"));
		assertUnauthorized(login("{\"username\":\"\",\"password\":\"admin\"}"));
		assertUnauthorized(login("{\"username\":\"admin\",\"password\":\"\"}"));
		assertUnauthorized(login("{\"username\":\"admin\"}"));
	}

	@Test
	void u0_passwordLongerThan72Bytes_returns80() throws Exception {
		assertUnauthorized(login("{\"username\":\"admin\",\"password\":\"" + "a".repeat(100) + "\"}"));
	}

	@Test
	void u0_malformedJson_returns90() throws Exception {
		login("{not json").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void d6_noToken_returns80() throws Exception {
		assertUnauthorized(mockMvc.perform(get("/api/rooms")));
	}

	@Test
	void d6_garbageToken_returns80() throws Exception {
		assertUnauthorized(mockMvc.perform(get("/api/rooms").header("Authorization", "Bearer not.a.jwt")));
	}

	@Test
	void d6_expiredToken_returns80() throws Exception {
		assertUnauthorized(mockMvc.perform(get("/api/rooms").header("Authorization", tokens.expiredBearer("alice"))));
	}

	@Test
	void d6_tokenOfNonExistingUser_returns80() throws Exception {
		assertUnauthorized(mockMvc
				.perform(get("/api/rooms").header("Authorization", tokens.bearerOfMissingUser("ghost"))));
	}

	@Test
	void d2_unknownUrlWithoutToken_returns80() throws Exception {
		assertUnauthorized(mockMvc.perform(get("/api/abc")));
	}

}
