-- Sample data. All people, items and places are fictional.
-- Demo accounts: demo1 / demo2, password: Demo1234!  (stored only as bcrypt hashes)
USE lost_found;

INSERT INTO users (username, email, password_hash) VALUES
('demo1', 'demo1@example.com', '$2a$10$KN4OuR0UHL4LY7IlsP6Touc00C1iLhmnhLc/ztZK59BjmhpTq9rQm'),
('demo2', 'demo2@example.com', '$2a$10$KN4OuR0UHL4LY7IlsP6Touc00C1iLhmnhLc/ztZK59BjmhpTq9rQm');

INSERT INTO categories (name) VALUES
('Electronics'), ('Stationery'), ('Clothing'), ('Bags'), ('Keys & Cards');

INSERT INTO posts (user_id, category_id, title, description, kind, status, location) VALUES
(1, 1, 'Black wireless earbuds', 'Lost a black earbud case near the library entrance on Monday afternoon.', 'lost', 'open', 'Main Library'),
(1, 2, 'Blue pencil case', 'Found a blue zip pencil case with three pens inside.', 'found', 'open', 'Room B204'),
(1, 3, 'Grey hoodie', 'Grey hoodie left on a bench outside the cafeteria. Size M.', 'found', 'open', 'Cafeteria patio'),
(1, 4, 'Red backpack', 'Lost a red backpack with a laptop sleeve. Reward offered.', 'lost', 'resolved', 'Bus stop'),
(1, 5, 'Student ID card', 'Found a student ID card near the vending machines. Name starts with S.', 'found', 'open', 'Building A lobby'),
(2, 1, 'USB flash drive 32GB', 'Silver USB drive with a green keyring, lost in the computer lab.', 'lost', 'open', 'Computer Lab 2'),
(2, 2, 'Scientific calculator', 'Found a Casio calculator after the maths exam.', 'found', 'open', 'Exam Hall'),
(2, 3, 'Black umbrella', 'Left a black folding umbrella in the lecture room.', 'lost', 'resolved', 'Lecture Room 5'),
(2, 4, 'Green tote bag', 'Found a green tote bag containing two notebooks.', 'found', 'open', 'Gym entrance'),
(2, 5, 'Bike key with blue tag', 'Lost a single bike key with a blue tag, probably near the parking area.', 'lost', 'open', 'Bike parking'),
(2, 1, 'Phone charger', 'Found a white USB-C charger plugged in at a study table.', 'found', 'open', 'Study Hall');
