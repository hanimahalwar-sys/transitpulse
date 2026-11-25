package com.transit.backend;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin("http://localhost:5173")
public class BookingController {
    private final TripRepo trips; private final LegRepo legs; private final BookingRepo bookings; private final WalletRepo wallet;

    public BookingController(TripRepo t, LegRepo l, BookingRepo b, WalletRepo w) { trips = t; legs = l; bookings = b; wallet = w; }

    public static class BookReq { public String userId, email, phone; public int total, promo; public List<BookingLeg> legs; }

    @GetMapping("/trips")
    public List<Trip> allTrips() { return trips.findAll(); }

    @GetMapping("/booked")
    public List<String> booked() { return legs.findAll().stream().map(l -> l.tripId + "_" + l.seat).toList(); }

    @GetMapping("/wallet")
    public List<WalletTxn> wallet(@RequestParam String userId) { return wallet.findByUserIdOrderByCreatedAtDesc(userId); }

    @GetMapping("/bookings")
    public List<Map<String, Object>> mine(@RequestParam String userId) {
        return bookings.findByUserIdOrderByCreatedAtDesc(userId).stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("pnr", b.pnr); m.put("total", b.total); m.put("status", b.status); m.put("email", b.contactEmail); m.put("phone", b.contactPhone); m.put("legs", legs.findByPnr(b.pnr));
            return m;
        }).toList();
    }

    // All-or-nothing: any exception rolls back every seat of the journey
    @PostMapping("/bookings")
    @Transactional
    public Map<String, String> book(@RequestBody BookReq r) {
        if (r.email == null || !r.email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid email address is required");
        if (r.phone == null || !r.phone.trim().matches("^[6-9][0-9]{9}$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid 10-digit mobile number is required");
        for (BookingLeg l : r.legs)
            if (l.passengerName == null || l.passengerName.trim().length() < 2 || l.passengerAge == null || l.passengerAge < 1 || l.passengerAge > 120)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passenger name and age (1-120) are required for every seat");
        List<BookingLeg> order = new ArrayList<>(r.legs);
        order.sort(Comparator.comparing(l -> l.tripId + "_" + l.seat)); // fixed global lock order = no deadlocks
        for (BookingLeg l : order) {
            trips.lockById(l.tripId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown trip " + l.tripId));
            if (legs.existsByTripIdAndSeat(l.tripId, l.seat))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat " + l.seat + " on " + l.tripId + " is already booked");
        }
        String pnr = "TP" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        int i = 1;
        for (BookingLeg l : r.legs) { l.id = null; l.pnr = pnr; l.childPnr = pnr + "-" + i++; legs.save(l); }
        Booking b = new Booking();
        b.pnr = pnr; b.userId = r.userId; b.total = r.total; b.status = "CONFIRMED"; b.createdAt = System.currentTimeMillis();
        b.contactEmail = r.email.trim(); b.contactPhone = r.phone.trim();
        bookings.save(b);
        if (r.promo > 0) wallet.save(new WalletTxn(r.userId, "PROMO", r.promo, pnr));
        return Map.of("pnr", pnr);
    }

    // Delay event -> connection protection (refund last leg of a multi-leg journey)
    @PostMapping("/bookings/{pnr}/delay")
    @Transactional
    public Map<String, String> delay(@PathVariable String pnr) {
        Booking b = bookings.findById(pnr).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<BookingLeg> L = legs.findByPnr(pnr);
        if (L.stream().map(x -> x.tripId).distinct().count() > 1) {
            b.status = "PROTECTED - leg rebooked (delay 90m > 45m)";
            BookingLeg last = Collections.max(L, Comparator.comparingInt(x -> x.dep));
            int refund = L.stream().filter(x -> x.tripId.equals(last.tripId)).mapToInt(x -> x.fare).sum();
            wallet.save(new WalletTxn(b.userId, "REFUND", refund, pnr));
        } else b.status = "DELAYED (90m)";
        bookings.save(b);
        return Map.of("status", b.status);
    }
}
