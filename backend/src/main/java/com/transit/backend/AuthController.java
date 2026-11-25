package com.transit.backend;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("http://localhost:5173")
public class AuthController {
    private final JwtUtil jwt;
    @Value("${admin.username}") private String user;
    @Value("${admin.password}") private String pass;

    public AuthController(JwtUtil jwt) { this.jwt = jwt; }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> r) {
        if (user.equals(r.get("username")) && pass.equals(r.get("password")))
            return Map.of("token", jwt.create(user, "ADMIN"), "role", "ADMIN");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
}
