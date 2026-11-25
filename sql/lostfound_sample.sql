-- optional sample reports (run AFTER the backend has started once, so table lost_item exists)
USE transitpulse;
INSERT INTO lost_item (type, user_id, trip_id, route, operator, item, description, contact, status, created_at) VALUES
('FOUND','demo-staff','T0001','Indore → Bhopal','Chartered Speedlink','Black backpack','Laptop sleeve inside, seat 3B','9000000001','OPEN',1795080000000),
('FOUND','demo-staff','T0011','Indore → Bhopal','Hans Travels','Blue water bottle','Steel bottle, left on seat 5C','9000000002','OPEN',1795070000000),
('FOUND','demo-staff','T0041','Indore → Ujjain','Zingbus','Samsung phone','Black cover, found under seat','9000000003','OPEN',1795060000000),
('LOST','demo-user1','T0003','Indore → Bhopal','Chartered Speedlink','Grey jacket','Lost on night bus, zip pocket','9000000004','OPEN',1795050000000),
('LOST','demo-user2','T0021','Bhopal → Nagpur','MSRTC','Umbrella','Red umbrella with wooden handle','9000000005','OPEN',1795040000000),
('FOUND','demo-staff','T0101','Pune → Mumbai','VRL Travels','Wallet','Brown leather wallet with ID cards','9000000006','RESOLVED',1795030000000);
