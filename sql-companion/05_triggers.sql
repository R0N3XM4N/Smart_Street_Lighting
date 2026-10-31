-- PR 5 / 9 — Triggers (Member A / Ronak)
USE smart_streetlight_grid;

DELIMITER //
CREATE TRIGGER trg_after_sensor_insert
AFTER INSERT ON sensor_reading
FOR EACH ROW
BEGIN
    INSERT INTO power_consumption_log (pole_id, kwh_consumed, voltage_fluctuation, date_logged)
    VALUES (NEW.pole_id, 0.000, 0.00, CURDATE());
END //
DELIMITER ;

INSERT INTO sensor_reading (reading_id, pole_id, lux_level, pedestrian_count, `timestamp`)
VALUES (99, 101, 3.0, 7, '2026-08-20 23:30:00')
ON DUPLICATE KEY UPDATE
    lux_level = VALUES(lux_level),
    pedestrian_count = VALUES(pedestrian_count),
    `timestamp` = VALUES(`timestamp`);

SELECT * FROM power_consumption_log WHERE pole_id = 101;