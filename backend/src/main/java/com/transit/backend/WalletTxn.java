package com.transit.backend;

import jakarta.persistence.*;

@Entity
@Table(name = "wallet_txn")
public class WalletTxn {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String userId, type, refPnr;
    public int amount;
    public long createdAt;
    public WalletTxn() {}
    public WalletTxn(String userId, String type, int amount, String refPnr) {
        this.userId = userId; this.type = type; this.amount = amount; this.refPnr = refPnr; this.createdAt = System.currentTimeMillis();
    }
}
