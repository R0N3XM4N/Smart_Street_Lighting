-- Operational and analytical queries for Smart Street Lighting.
USE smart_streetlight_grid;

-- Poles whose average recorded illuminance is below the project's 5-lux
-- review threshold, including wards and reading counts.
SELECT
    lp.pole_id,
    lp.ward_id,
    AVG(sr.lux_level) AS average_lux,
    COUNT(sr.reading_id) AS reading_count
FROM light_pole AS lp
JOIN sensor_reading AS sr ON sr.pole_id = lp.pole_id
GROUP BY lp.pole_id, lp.ward_id
HAVING AVG(sr.lux_level) < 5
ORDER BY average_lux ASC, lp.ward_id, lp.pole_id;

-- Daily energy consumption by ward. The scalar subquery supplies the latest
-- date in the data set, making this query useful for a moving demo dataset.
SELECT
    lp.ward_id,
    pcl.date_logged,
    SUM(pcl.kwh_consumed) AS ward_daily_kwh,
    COUNT(pcl.log_id) AS log_entries
FROM power_consumption_log AS pcl
JOIN light_pole AS lp ON lp.pole_id = pcl.pole_id
WHERE pcl.date_logged = (
    SELECT MAX(latest.date_logged)
    FROM power_consumption_log AS latest
)
GROUP BY lp.ward_id, pcl.date_logged
ORDER BY ward_daily_kwh DESC, lp.ward_id;

-- Recent pedestrian activity compared with the average for that pole.
SELECT
    sr.pole_id,
    sr.`timestamp`,
    sr.pedestrian_count,
    pole_stats.average_pedestrians
FROM sensor_reading AS sr
JOIN (
    SELECT pole_id, AVG(pedestrian_count) AS average_pedestrians
    FROM sensor_reading
    GROUP BY pole_id
) AS pole_stats ON pole_stats.pole_id = sr.pole_id
WHERE sr.pedestrian_count > pole_stats.average_pedestrians
ORDER BY sr.`timestamp` DESC;

-- Search one pole's schedule history by time window; replace the demo values.
SELECT
    ds.schedule_id,
    ds.pole_id,
    ds.target_brightness_pct,
    ds.start_time,
    ds.end_time
FROM dimming_schedule AS ds
WHERE ds.pole_id = 101
  AND ds.start_time >= '2026-01-01 00:00:00'
ORDER BY ds.start_time DESC;
