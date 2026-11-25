package com.transit.backend;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/lostfound")
@CrossOrigin("http://localhost:5173")
public class LostFoundController {
    private final LostRepo repo;
    public LostFoundController(LostRepo repo) { this.repo = repo; }

    private static String s(String v) { return v == null ? "" : v; }

    @GetMapping
    public List<LostItem> list(@RequestParam(required = false) String q, @RequestParam(required = false) String type) {
        String key = s(q).toLowerCase();
        return repo.findAll().stream()
            .filter(i -> s(type).isBlank() || i.type.equals(type))
            .filter(i -> key.isBlank() || (s(i.item) + " " + s(i.description) + " " + s(i.operator) + " " + s(i.tripId) + " " + s(i.route)).toLowerCase().contains(key))
            .sorted((a, b) -> Long.compare(b.createdAt, a.createdAt))
            .limit(100).toList();
    }

    @PostMapping
    public LostItem add(@RequestBody LostItem i) {
        if (i.item == null || i.item.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item name is required");
        if (!"LOST".equals(i.type) && !"FOUND".equals(i.type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type must be LOST or FOUND");
        i.id = null; i.status = "OPEN"; i.createdAt = System.currentTimeMillis();
        return repo.save(i);
    }

    @PostMapping("/{id}/resolve")
    public LostItem resolve(@PathVariable Long id, @RequestParam String userId) {
        LostItem i = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!userId.equals(i.userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the reporter can close this report");
        i.status = "RESOLVED";
        return repo.save(i);
    }
}
