package com.practice.booking.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practice.booking.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

	boolean existsByUsernameKey(String usernameKey);

	Optional<User> findByUsernameKey(String usernameKey);

	List<User> findAllByOrderByIdAsc();

}
