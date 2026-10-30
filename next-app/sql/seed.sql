USE streetlight_ops;

INSERT INTO poles (pole_code, location, zone, wattage, brightness)
VALUES
  ('ST-101', 'Central Avenue & Pine Street', 'Central', 120, 75),
  ('ST-102', 'Central Avenue & 4th Street', 'Central', 150, 80),
  ('ST-103', 'Riverside Park Entrance', 'Riverside', 100, 60),
  ('ST-104', 'Riverside Promenade', 'Riverside', 180, 90),
  ('ST-105', 'North Market Square', 'North', 140, 70)
ON DUPLICATE KEY UPDATE
  location = VALUES(location),
  zone = VALUES(zone),
  wattage = VALUES(wattage),
  brightness = VALUES(brightness);

INSERT INTO schedules (name, zone, on_time, off_time, days, enabled)
VALUES
  ('Evening illumination', 'Central', '18:30:00', '23:30:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', 1),
  ('Riverside late schedule', 'Riverside', '19:00:00', '01:00:00', 'Fri,Sat', 1),
  ('Market close', 'North', '20:00:00', '23:00:00', 'Mon,Tue,Wed,Thu,Fri,Sat', 1)
ON DUPLICATE KEY UPDATE
  on_time = VALUES(on_time),
  off_time = VALUES(off_time),
  days = VALUES(days),
  enabled = VALUES(enabled);

INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status)
SELECT p.id, TIMESTAMP(CURRENT_DATE, '18:00:00'), 1.825, 4.20, 12, 'online'
  FROM poles p WHERE p.pole_code = 'ST-101'
ON DUPLICATE KEY UPDATE
  energy_kwh = VALUES(energy_kwh),
  lux_level = VALUES(lux_level),
  pedestrian_count = VALUES(pedestrian_count),
  status = VALUES(status);

INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status)
SELECT p.id, TIMESTAMP(CURRENT_DATE, '17:40:00'), 2.150, 6.10, 7, 'online'
  FROM poles p WHERE p.pole_code = 'ST-102'
ON DUPLICATE KEY UPDATE
  energy_kwh = VALUES(energy_kwh),
  lux_level = VALUES(lux_level),
  pedestrian_count = VALUES(pedestrian_count),
  status = VALUES(status);

INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status)
SELECT p.id, TIMESTAMP(CURRENT_DATE, '17:20:00'), 0.980, 3.40, 4, 'online'
  FROM poles p WHERE p.pole_code = 'ST-103'
ON DUPLICATE KEY UPDATE
  energy_kwh = VALUES(energy_kwh),
  lux_level = VALUES(lux_level),
  pedestrian_count = VALUES(pedestrian_count),
  status = VALUES(status);

INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status)
SELECT p.id, TIMESTAMP(CURRENT_DATE, '17:00:00'), 3.215, 8.00, 2, 'maintenance'
  FROM poles p WHERE p.pole_code = 'ST-104'
ON DUPLICATE KEY UPDATE
  energy_kwh = VALUES(energy_kwh),
  lux_level = VALUES(lux_level),
  pedestrian_count = VALUES(pedestrian_count),
  status = VALUES(status);

INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status)
SELECT p.id, TIMESTAMP(CURRENT_DATE, '16:40:00'), 1.410, 2.80, 19, 'online'
  FROM poles p WHERE p.pole_code = 'ST-105'
ON DUPLICATE KEY UPDATE
  energy_kwh = VALUES(energy_kwh),
  lux_level = VALUES(lux_level),
  pedestrian_count = VALUES(pedestrian_count),
  status = VALUES(status);
