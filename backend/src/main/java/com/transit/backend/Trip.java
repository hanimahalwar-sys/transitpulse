package com.transit.backend;

import jakarta.persistence.*;

@Entity
public class Trip {
    @Id public String id;
    public String operator, src, dest;
    public String busType;   // AC Sleeper | Non-AC Sleeper | AC Seater | Non-AC Seater
    public int seats;        // 30 berths (sleeper) or 40 seats (seater)
    public int depMin, durMin, fare;
    public Trip() {}
}
