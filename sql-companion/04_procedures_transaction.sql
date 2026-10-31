-- PR 4 / 9 — Procedures + Transaction (Member A / Ronak)
USE smart_streetlight_grid;

DELIMITER //
CREATE PROCEDURE sp_update_brightness(pole_id_in INT, pct_in INT)
BEGIN
    DECLARE schedule_count INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF pct_in < 0 OR pct_in > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Brightness must be between 0 and 100';
    END IF;

    SELECT COUNT(*) INTO schedule_count FROM dimming_schedule WHERE pole_id = pole_id_in;
    IF schedule_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No dimming schedule exists for this pole';
    END IF;

    UPDATE dimming_schedule
    SET target_brightness_pct = pct_in
    WHERE pole_id = pole_id_in;

    INSERT INTO power_consumption_log (pole_id, kwh_consumed, voltage_fluctuation, date_logged)
    VALUES (pole_id_in, 0.000, 0.00, CURDATE());
    COMMIT;
END //
DELIMITER ;

-- Demo invocation (run manually after setup): CALL sp_update_brightness(101, 75);