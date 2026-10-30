CREATE DATABASE IF NOT EXISTS streetlight_ops CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE streetlight_ops;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('viewer', 'operator') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX sessions_user_expiry (user_id, expires_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS poles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pole_code VARCHAR(40) NOT NULL UNIQUE,
  location VARCHAR(160) NOT NULL,
  zone VARCHAR(80) NOT NULL,
  wattage SMALLINT UNSIGNED NOT NULL,
  brightness TINYINT UNSIGNED NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT poles_wattage_range CHECK (wattage BETWEEN 1 AND 5000),
  CONSTRAINT poles_brightness_range CHECK (brightness BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pole_id BIGINT UNSIGNED NOT NULL,
  measured_at DATETIME NOT NULL,
  energy_kwh DECIMAL(12, 3) NOT NULL,
  lux_level DECIMAL(10, 2) NOT NULL,
  pedestrian_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('online', 'offline', 'maintenance') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY readings_pole_measured_at (pole_id, measured_at),
  INDEX readings_pole_latest (pole_id, measured_at DESC),
  INDEX readings_measured_at (measured_at),
  CONSTRAINT readings_pole_fk FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE CASCADE,
  CONSTRAINT readings_energy_nonnegative CHECK (energy_kwh >= 0),
  CONSTRAINT readings_lux_nonnegative CHECK (lux_level >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  zone VARCHAR(80) NOT NULL,
  on_time TIME NOT NULL,
  off_time TIME NOT NULL,
  days VARCHAR(35) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY schedules_zone_name (zone, name),
  INDEX schedules_enabled_zone (enabled, zone),
  CONSTRAINT schedules_days_nonempty CHECK (CHAR_LENGTH(TRIM(days)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS power_consumption_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pole_id BIGINT UNSIGNED NOT NULL,
  reading_id BIGINT UNSIGNED NULL,
  kwh_consumed DECIMAL(12, 3) NOT NULL,
  date_logged DATE NOT NULL,
  source ENUM('sensor_reading', 'brightness_update') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX power_pole_date (pole_id, date_logged),
  INDEX power_date (date_logged),
  CONSTRAINT power_pole_fk FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE CASCADE,
  CONSTRAINT power_reading_fk FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE SET NULL,
  CONSTRAINT power_kwh_nonnegative CHECK (kwh_consumed >= 0)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_pole_summary AS
SELECT p.id, p.pole_code, p.location, p.zone, p.wattage, p.brightness,
       COUNT(r.id) AS reading_count,
       AVG(r.lux_level) AS average_lux,
       MAX(r.pedestrian_count) AS max_pedestrians,
       MAX(r.measured_at) AS last_seen,
       COALESCE(
         (SELECT latest.status FROM readings latest
           WHERE latest.pole_id = p.id ORDER BY latest.measured_at DESC LIMIT 1),
         'offline'
       ) AS status,
       COALESCE(SUM(r.energy_kwh), 0) AS total_reading_kwh
  FROM poles p
  LEFT JOIN readings r ON r.pole_id = p.id
 GROUP BY p.id, p.pole_code, p.location, p.zone, p.wattage, p.brightness;

CREATE OR REPLACE VIEW v_dimming_schedule AS
SELECT s.id, s.name, s.zone, s.on_time, s.off_time, s.days, s.enabled,
       COUNT(p.id) AS affected_poles
  FROM schedules s
  LEFT JOIN poles p ON p.zone = s.zone
 GROUP BY s.id, s.name, s.zone, s.on_time, s.off_time, s.days, s.enabled;

DELIMITER //
DROP TRIGGER IF EXISTS trg_reading_power_log//
CREATE TRIGGER trg_reading_power_log
AFTER INSERT ON readings
FOR EACH ROW
BEGIN
  INSERT INTO power_consumption_log (pole_id, reading_id, kwh_consumed, date_logged, source)
  VALUES (NEW.pole_id, NEW.id, NEW.energy_kwh, DATE(NEW.measured_at), 'sensor_reading');
END//

DROP PROCEDURE IF EXISTS set_pole_brightness//
CREATE PROCEDURE set_pole_brightness(IN p_pole_id BIGINT UNSIGNED, IN p_brightness TINYINT UNSIGNED)
BEGIN
  DECLARE v_wattage SMALLINT UNSIGNED DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  IF p_brightness > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Brightness must be between 0 and 100';
  END IF;

  SELECT wattage INTO v_wattage FROM poles WHERE id = p_pole_id FOR UPDATE;
  IF v_wattage IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pole not found';
  END IF;

  UPDATE poles SET brightness = p_brightness WHERE id = p_pole_id;
  INSERT INTO power_consumption_log (pole_id, kwh_consumed, date_logged, source)
  VALUES (
    p_pole_id,
    ROUND(v_wattage * p_brightness / 100000, 3),
    CURRENT_DATE,
    'brightness_update'
  );
  COMMIT;
END//
DELIMITER ;
