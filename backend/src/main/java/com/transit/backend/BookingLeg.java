package com.transit.backend;

import jakarta.persistence.*;

// UNIQUE (trip_id, seat) = database-level guarantee against double booking
@Entity
@Table(name = "booking_leg", uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "seat"}))
public class BookingLeg {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String pnr, tripId, seat, childPnr, src, dest, operator, busType, boardingPoint, passengerName, passengerGender;
    public Integer passengerAge;
    public int dep, fare;
    public BookingLeg() {}
}
