package com.transit.backend;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface TripRepo extends JpaRepository<Trip, String> {
    // plain "FOR UPDATE" row lock (works on MariaDB and MySQL; the JPA @Lock version
    // generates "FOR UPDATE OF t1_0", which MariaDB 10.4 does not understand)
    @Query(value = "SELECT * FROM trip WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<Trip> lockById(@Param("id") String id);
}

interface LegRepo extends JpaRepository<BookingLeg, Long> {
    boolean existsByTripIdAndSeat(String tripId, String seat);
    List<BookingLeg> findByPnr(String pnr);
    List<BookingLeg> findByTripId(String tripId);
}

interface BookingRepo extends JpaRepository<Booking, String> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);
}

interface WalletRepo extends JpaRepository<WalletTxn, Long> {
    List<WalletTxn> findByUserIdOrderByCreatedAtDesc(String userId);
}

interface LostRepo extends JpaRepository<LostItem, Long> {}
