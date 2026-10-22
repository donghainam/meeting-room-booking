package com.practice.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Room {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String name;

	// lowercase của name, dùng để đảm bảo duy nhất không phân biệt hoa/thường
	@Column(nullable = false, unique = true, length = 100)
	private String nameKey;

	@Column(nullable = false)
	private Integer capacity;

	@Column(nullable = false)
	private Boolean active = true;

	protected Room() {
	}

	public Room(String name, String nameKey, Integer capacity) {
		this.name = name;
		this.nameKey = nameKey;
		this.capacity = capacity;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public Integer getCapacity() {
		return capacity;
	}

	public Boolean getActive() {
		return active;
	}

}
