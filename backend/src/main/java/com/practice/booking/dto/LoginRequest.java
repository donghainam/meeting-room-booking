package com.practice.booking.dto;

// Không đặt ràng buộc validation: thiếu/trống/sai đều trả 80, không phân biệt trường nào sai
public record LoginRequest(String username, String password) {
}
