-- PR 3 / 9 — Views (Member A / Ronak)
USE smart_streetlight_grid;

CREATE VIEW v_pole_summary AS
SELECT
    lp.pole_id,
    lp.ward_id,
    lp.hardware_version,
    lp.installation_date,
    lp.status,
    COUNT(sr.reading_id) AS reading_count,
    AVG(sr.lux_level) AS avg_lux,
    MAX(sr.pedestrian_count) AS max_pedestrian,
    MAX(sr.timestamp) AS last_reading
FROM light_pole lp
LEFT JOIN sensor_reading sr ON sr.pole_id = lp.pole_id
GROUP BY lp.pole_id, lp.ward_id, lp.hardware_version, lp.installation_date, lp.status;

CREATE VIEW v_dimming_schedule AS
SELECT
    ds.schedule_id,
    lp.pole_id,
    lp.ward_id,
    ds.target_brightness_pct,
    ds.start_time,
    ds.end_time,
    TIMESTAMPDIFF(HOUR, ds.start_time, ds.end_time) AS duration_hours
FROM dimming_schedule ds
JOIN light_pole lp ON lp.pole_id = ds.pole_id;

SELECT * FROM v_pole_summary;
SELECT * FROM v_dimming_schedule;