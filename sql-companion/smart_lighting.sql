CREATE DATABASE IF NOT EXISTS smart_streetlight_grid;
USE smart_streetlight_grid;

-- 1. DROP TABLE

DROP TABLE IF EXISTS power_consumption_log;
DROP TABLE IF EXISTS dimming_schedule;
DROP TABLE IF EXISTS sensor_reading;
DROP TABLE IF EXISTS light_pole;

-- 2. CREATE TABLE

CREATE TABLE light_pole (
    pole_id INT PRIMARY KEY,
    ward_id INT NOT NULL,
    hardware_version VARCHAR(20) NOT NULL,
    installation_date DATE NOT NULL
);

CREATE TABLE sensor_reading (
    reading_id INT PRIMARY KEY,
    pole_id INT NOT NULL,
    lux_level DECIMAL(10,2) NOT NULL,
    pedestrian_count INT NOT NULL,
    `timestamp` DATETIME NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id)
);

CREATE TABLE dimming_schedule (
    schedule_id INT PRIMARY KEY,
    pole_id INT NOT NULL,
    target_brightness_pct INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id)
);

CREATE TABLE power_consumption_log (
    log_id INT PRIMARY KEY,
    pole_id INT NOT NULL,
    kwh_consumed DECIMAL(10,3) NOT NULL,
    voltage_fluctuation DECIMAL(6,2) NOT NULL,
    date_logged DATE NOT NULL,
    FOREIGN KEY (pole_id) REFERENCES light_pole(pole_id)
);

-- SCREENSHOT 1:
-- Take a screenshot after successfully creating the tables.


-- 3. INSERT DATA

INSERT INTO light_pole
VALUES
(101, 10, 'HW-1.0', '2025-06-15'),
(102, 10, 'HW-1.1', '2025-07-20'),
(103, 11, 'HW-1.1', '2025-08-05');

INSERT INTO sensor_reading
VALUES
(1, 101, 2.0, 5, '2026-08-20 20:00:00'),
(2, 101, 1.0, 10, '2026-08-20 22:00:00'),
(3, 102, 4.0, 2, '2026-08-20 21:00:00');

INSERT INTO dimming_schedule
VALUES
(201, 101, 60, '2026-08-20 18:30:00', '2026-08-20 20:30:00'),
(202, 102, 80, '2026-08-20 20:30:00', '2026-08-20 23:00:00');

INSERT INTO power_consumption_log
VALUES
(301, 101, 2.850, 1.20, '2026-08-20'),
(302, 102, 3.420, 0.80, '2026-08-20');

-- SCREENSHOT 2:
-- Run the INSERT statements and take a screenshot.


-- 4. SELECT

SELECT * FROM light_pole;
SELECT * FROM sensor_reading;
SELECT * FROM dimming_schedule;
SELECT * FROM power_consumption_log;

-- SCREENSHOT 3:
-- Take screenshots of the SELECT results.


-- 5. ALTER TABLE

ALTER TABLE light_pole
ADD COLUMN status VARCHAR(10);

DESC light_pole;

-- SCREENSHOT 4:
-- Take a screenshot showing the new STATUS column.


-- 6. MODIFY

ALTER TABLE light_pole
MODIFY COLUMN status VARCHAR(20);

DESC light_pole;

-- SCREENSHOT 5:
-- Take a screenshot showing STATUS changed to VARCHAR(20).


-- 7. DROP COLUMN

ALTER TABLE light_pole
DROP COLUMN status;

DESC light_pole;

-- SCREENSHOT 6:
-- Take a screenshot showing STATUS has been removed.


-- 8. DELETE

DELETE FROM sensor_reading
WHERE reading_id = 3;

SELECT * FROM sensor_reading;

-- SCREENSHOT 7:
-- Take a screenshot showing that reading_id 3 was deleted.


-- FINAL CHECK

DESC light_pole;
DESC sensor_reading;
DESC dimming_schedule;
DESC power_consumption_log;

SELECT * FROM light_pole;
SELECT * FROM sensor_reading;
SELECT * FROM dimming_schedule;
SELECT * FROM power_consumption_log;

-- SCREENSHOT 8:
-- Take the final screenshot showing the four tables and their data.
"""