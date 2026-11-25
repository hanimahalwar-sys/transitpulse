package com.transit.backend;

import jakarta.persistence.*;

@Entity
@Table(name = "lost_item")
public class LostItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String type;       // LOST | FOUND
    public String userId, tripId, route, operator, item, contact;
    @Column(length = 1000) public String description;
    public String status;     // OPEN | RESOLVED
    public long createdAt;
    public LostItem() {}
}
