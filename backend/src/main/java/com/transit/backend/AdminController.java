package com.transit.backend;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("http://localhost:5173")
public class AdminController {
    private final TripRepo trips; private final LegRepo legs; private final BookingRepo bookings; private final WalletRepo wallet;

    public AdminController(TripRepo t, LegRepo l, BookingRepo b, WalletRepo w) { trips = t; legs = l; bookings = b; wallet = w; }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<Booking> all = bookings.findAll();
        int revenue = all.stream().filter(b -> !b.status.startsWith("CANCELLED")).mapToInt(b -> b.total).sum();
        int refunds = wallet.findAll().stream().filter(w -> "REFUND".equals(w.type)).mapToInt(w -> w.amount).sum();
        long users = all.stream().map(b -> b.userId).distinct().count();
        Map<String, Long> per = legs.findAll().stream().collect(Collectors.groupingBy(l -> l.tripId, Collectors.counting()));
        List<Map<String, Object>> load = trips.findAll().stream().map(t -> {
            long n = per.getOrDefault(t.id, 0L);
            int cap = t.seats > 0 ? t.seats : 30;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.id); m.put("route", t.src + " → " + t.dest); m.put("operator", t.operator); m.put("type", t.busType);
            m.put("booked", n); m.put("cap", cap); m.put("lf", Math.round(n * 100.0 / cap));
            return m;
        }).sorted((a, b) -> Long.compare((Long) b.get("lf"), (Long) a.get("lf"))).limit(15).toList();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("revenue", revenue); r.put("bookings", all.size()); r.put("users", users);
        r.put("trips", trips.count()); r.put("refunds", refunds); r.put("load", load);
        return r;
    }

    @GetMapping("/bookings")
    public List<Map<String, Object>> allBookings() {
        return bookings.findAll().stream().sorted((a, b) -> Long.compare(b.createdAt, a.createdAt)).map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("pnr", b.pnr); m.put("userId", b.userId); m.put("email", b.contactEmail); m.put("phone", b.contactPhone); m.put("total", b.total); m.put("status", b.status);
            m.put("legs", legs.findByPnr(b.pnr));
            return m;
        }).toList();
    }

    @PostMapping("/trips")
    public Trip saveTrip(@RequestBody Trip t) {
        if (t.id == null || t.id.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip ID required");
        return trips.save(t);
    }

    @DeleteMapping("/trips/{id}")
    public void deleteTrip(@PathVariable String id) { trips.deleteById(id); }

    @PostMapping("/bookings/{pnr}/cancel")
    @Transactional
    public Map<String, String> cancel(@PathVariable String pnr) {
        Booking b = bookings.findById(pnr).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        legs.deleteAll(legs.findByPnr(pnr)); // frees the seats
        b.status = "CANCELLED BY ADMIN";
        bookings.save(b);
        wallet.save(new WalletTxn(b.userId, "REFUND", b.total, pnr));
        return Map.of("status", b.status);
    }

    // delay_event -> connection protection rule
    @PostMapping("/trips/{id}/delay")
    @Transactional
    public Map<String, Object> delay(@PathVariable String id, @RequestParam int minutes) {
        if (minutes <= 45) return Map.of("affected", 0, "note", "Below 45 min threshold - no action");
        Set<String> pnrs = legs.findByTripId(id).stream().map(l -> l.pnr).collect(Collectors.toSet());
        int n = 0;
        for (String pnr : pnrs) {
            Booking b = bookings.findById(pnr).orElse(null);
            if (b == null || b.status.startsWith("CANCELLED")) continue;
            List<BookingLeg> L = legs.findByPnr(pnr);
            if (L.stream().map(x -> x.tripId).distinct().count() > 1) {
                b.status = "PROTECTED - leg rebooked (delay " + minutes + "m > 45m)";
                wallet.save(new WalletTxn(b.userId, "REFUND", L.stream().filter(x -> x.tripId.equals(id)).mapToInt(x -> x.fare).sum(), pnr));
            } else b.status = "DELAYED (" + minutes + "m)";
            bookings.save(b);
            n++;
        }
        return Map.of("affected", n);
    }
}
