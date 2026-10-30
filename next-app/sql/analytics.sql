USE streetlight_ops;

-- Review poles whose average illuminance is below the 5-lux demonstration threshold.
SELECT p.pole_code, p.zone, AVG(r.lux_level) AS average_lux, COUNT(*) AS sample_count
FROM poles AS p
JOIN readings AS r ON r.pole_id = p.id
GROUP BY p.id, p.pole_code, p.zone
HAVING AVG(r.lux_level) < 5
ORDER BY average_lux, p.zone, p.pole_code;

-- Aggregate current-day energy use and identify zones above the city average.
SELECT p.zone, SUM(log.kwh_consumed) AS zone_kwh
FROM power_consumption_log AS log
JOIN poles AS p ON p.id = log.pole_id
WHERE log.date_logged = CURRENT_DATE
GROUP BY p.zone
HAVING SUM(log.kwh_consumed) > (
  SELECT AVG(zone_total.total_kwh)
  FROM (
    SELECT SUM(inner_log.kwh_consumed) AS total_kwh
    FROM power_consumption_log AS inner_log
    WHERE inner_log.date_logged = CURRENT_DATE
    GROUP BY inner_log.pole_id
  ) AS zone_total
)
ORDER BY zone_kwh DESC;

-- The dashboard query paths use these views; inspect the view-backed summaries.
SELECT * FROM v_pole_summary ORDER BY zone, average_lux DESC;
SELECT * FROM v_dimming_schedule WHERE enabled = TRUE ORDER BY zone, on_time;
