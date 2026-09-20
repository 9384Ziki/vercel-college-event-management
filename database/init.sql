CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  event_date DATETIME NOT NULL,
  venue VARCHAR(180) NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_registration (event_id, user_id),
  CONSTRAINT fk_reg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_reg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO events (title, description, event_date, venue)
SELECT 'Cloud Computing Workshop', 'Docker and Kubernetes hands-on session', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Computer Lab 1'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title='Cloud Computing Workshop');

INSERT INTO events (title, description, event_date, venue)
SELECT 'College Tech Fest', 'Annual technology and innovation festival', DATE_ADD(NOW(), INTERVAL 14 DAY), 'Main Auditorium'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title='College Tech Fest');
