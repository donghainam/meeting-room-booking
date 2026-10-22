package com.practice.booking.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.hamcrest.Matchers;
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
class UserControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TestTokens tokens;

	private ResultActions createUser(String json) throws Exception {
		return mockMvc.perform(post("/api/users").header("Authorization", tokens.bearer("admin"))
				.contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private String body(String username, String password, String role) {
		return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\""
				+ (role == null ? "" : ",\"role\":\"" + role + "\"") + "}";
	}

	@Test
	void u1_createUser_defaultsToUserAndHidesPassword() throws Exception {
		createUser(body("u1.default", "password123", null))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value("00"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.username").value("u1.default"))
				.andExpect(jsonPath("$.data.role").value("USER"))
				.andExpect(jsonPath("$.data.password").doesNotExist())
				.andExpect(content().string(Matchers.not(Matchers.containsString("password123"))));
	}

	@Test
	void u1_canCreateAdmin() throws Exception {
		createUser(body("u1.admin", "password123", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.role").value("ADMIN"));
	}

	@Test
	void u1_usernameIsTrimmed() throws Exception {
		createUser(body("  u1.trim  ", "password123", null))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.username").value("u1.trim"));
	}

	@Test
	void u1_duplicateUsernameIgnoringCase_returns81() throws Exception {
		createUser(body("u1.dup", "password123", null)).andExpect(status().isOk());
		createUser(body("U1.DUP", "password123", null))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("81"))
				.andExpect(jsonPath("$.message").value("Username already exists"));
	}

	@Test
	void u1_invalidFields_returns90() throws Exception {
		createUser("{}").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("90"));
		createUser(body("ab", "password123", null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("a".repeat(51), "password123", null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("bad name", "password123", null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("bad@name", "password123", null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("u1.short", "1234567", null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("u1.long", "p".repeat(73), null)).andExpect(jsonPath("$.code").value("90"));
		createUser(body("u1.role", "password123", "SUPER")).andExpect(jsonPath("$.code").value("90"));
	}

	@Test
	void u1_passwordBoundaryLengths_areAllowed() throws Exception {
		createUser(body("u1.min", "p".repeat(8), null)).andExpect(status().isOk());
		createUser(body("u1.max", "p".repeat(72), null)).andExpect(status().isOk());
	}

	@Test
	void u1_concurrentSameUsername_onlyOneSucceeds() throws Exception {
		int threads = 2;
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		CountDownLatch ready = new CountDownLatch(threads);
		CountDownLatch go = new CountDownLatch(1);
		String adminToken = tokens.bearer("admin");
		List<Future<Integer>> results = new ArrayList<>();
		for (int i = 0; i < threads; i++) {
			results.add(executor.submit(() -> {
				ready.countDown();
				go.await();
				return mockMvc.perform(post("/api/users").header("Authorization", adminToken)
						.contentType(MediaType.APPLICATION_JSON).content(body("u1.race", "password123", null)))
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
	}

	@Test
	void u2_listUsers_orderedByIdAndWithoutPassword() throws Exception {
		createUser(body("u2.first", "password123", null)).andExpect(status().isOk());
		createUser(body("u2.second", "password123", null)).andExpect(status().isOk());
		mockMvc.perform(get("/api/users").header("Authorization", tokens.bearer("admin")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].username").value("admin"))
				.andExpect(jsonPath("$.data[0].password").doesNotExist())
				.andExpect(jsonPath("$.data[?(@.username == 'u2.first')]").exists())
				.andExpect(content().string(Matchers.not(Matchers.containsString("passwordHash"))));
	}

}
