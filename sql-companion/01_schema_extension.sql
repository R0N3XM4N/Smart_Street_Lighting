CREATE DATABASE IF NOT EXISTS smart_streetlight_grid;
USE smart_streetlight_grid;

-- Core tables and repeatable sample data for the companion SQL demo.
CREATE TABLE IF NOT EXISTS light_pole (
    pole_id INT PRIMARY KEY,
    ward_id INT NOT NULL,
    hardware_version VARCHAR(20) NOT NULL,
    installation_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT chk_light_pole_status CHECK (status IN ('active', 'inactive', 'maintenance'))
);

INSERT INTO light_pole (pole_id, ward_id, hardware_version, installation_date, status) VALUES
(101, 10, 'HW-1.0', '2025-06-15', 'active'),
(102, 10, 'HW-1.1', '2025-07-20', 'active'),
(103, 11, 'HW-1.1', '2025-08-05', 'inactive'),
(104, 10, 'HW-2.0', '2025-09-01', 'active'),
(105, 11, 'HW-2.1', '2025-09-15', 'maintenance')
ON DUPLICATE KEY UPDATE
    ward_id = VALUES(ward_id),
    hardware_version = VALUES(hardware_version),
    installation_date = VALUES(installation_date),
    status = VALUES(status);

CREATE TABLE IF NOT EXISTS sensor_reading (
    reading_id INT PRIMARY KEY AUTO_INCREMENT,
    pole_id INT NOT NULL,
    lux_level DECIMAL(10,2) NOT NULL,
    pedestrian_count INT NOT NULL,
    `timestamp` DATETIME NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id),
    CONSTRAINT chk_sensor_lux_nonnegative CHECK (lux_level >= 0),
    CONSTRAINT chk_sensor_pedestrians_nonnegative CHECK (pedestrian_count >= 0)
);

INSERT INTO sensor_reading (reading_id, pole_id, lux_level, pedestrian_count, `timestamp`) VALUES
(1, 101, 2.0, 5, '2026-08-20 20:00:00'),
(2, 101, 1.0, 10, '2026-08-20 22:00:00'),
(3, 102, 4.0, 2, '2026-08-20 21:00:00'),
(4, 104, 6.0, 1, '2026-08-20 23:00:00'),
(5, 105, 3.5, 8, '2026-08-20 19:00:00')
ON DUPLICATE KEY UPDATE
    pole_id = VALUES(pole_id),
    lux_level = VALUES(lux_level),
    pedestrian_count = VALUES(pedestrian_count),
    `timestamp` = VALUES(`timestamp`);

CREATE TABLE IF NOT EXISTS dimming_schedule (
    schedule_id INT PRIMARY KEY AUTO_INCREMENT,
    pole_id INT NOT NULL,
    target_brightness_pct INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id),
    CONSTRAINT chk_schedule_brightness CHECK (target_brightness_pct BETWEEN 0 AND 100),
    CONSTRAINT chk_schedule_time_window CHECK (end_time > start_time)
);

INSERT INTO dimming_schedule (schedule_id, pole_id, target_brightness_pct, start_time, end_time) VALUES
(201, 101, 60, '2026-08-20 18:30:00', '2026-08-20 20:30:00'),
(202, 102, 80, '2026-08-20 20:30:00', '2026-08-20 23:00:00'),
(203, 104, 70, '2026-08-20 19:00:00', '2026-08-21 01:00:00')
ON DUPLICATE KEY UPDATE
    pole_id = VALUES(pole_id),
    target_brightness_pct = VALUES(target_brightness_pct),
    start_time = VALUES(start_time),
    end_time = VALUES(end_time);

CREATE TABLE IF NOT EXISTS power_consumption_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    pole_id INT NOT NULL,
    kwh_consumed DECIMAL(10,3) NOT NULL,
    voltage_fluctuation DECIMAL(6,2) NOT NULL,
    date_logged DATE NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id),
    CONSTRAINT chk_power_kwh_nonnegative CHECK (kwh_consumed >= 0),
    CONSTRAINT chk_power_voltage_nonnegative CHECK (voltage_fluctuation >= 0)
);

INSERT INTO power_consumption_log (log_id, pole_id, kwh_consumed, voltage_fluctuation, date_logged) VALUES
(301, 101, 2.850, 1.20, '2026-08-20'),
(302, 102, 3.420, 0.80, '2026-08-20'),
(303, 104, 4.120, 0.95, '2026-08-20')
ON DUPLICATE KEY UPDATE
    pole_id = VALUES(pole_id),
    kwh_consumed = VALUES(kwh_consumed),
    voltage_fluctuation = VALUES(voltage_fluctuation),
    date_logged = VALUES(date_logged);

SELECT * FROM light_pole;
SELECT * FROM sensor_reading;
SELECT * FROM dimming_schedule;
SELECT * FROM power_consumption_log;
