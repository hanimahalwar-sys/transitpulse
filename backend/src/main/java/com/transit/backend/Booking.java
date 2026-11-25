package com.transit.backend;

import jakarta.persistence.*;

@Entity
public class Booking {
    @Id public String pnr;
    public String userId, status, contactEmail, contactPhone;
    public int total;
    public long createdAt;
    public Booking() {}
}
