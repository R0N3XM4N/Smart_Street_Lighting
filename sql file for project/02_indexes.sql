-- PR 2 / 9 — Indexes (Member A / Ronak)
USE smart_streetlight_grid;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'sensor_reading' AND index_name = 'idx_sensor_pole'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_sensor_pole ON sensor_reading(pole_id)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'sensor_reading' AND index_name = 'idx_sensor_timestamp'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_sensor_timestamp ON sensor_reading(`timestamp`)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'power_consumption_log' AND index_name = 'idx_power_pole'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_power_pole ON power_consumption_log(pole_id)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'power_consumption_log' AND index_name = 'idx_power_date'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_power_date ON power_consumption_log(date_logged)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'dimming_schedule' AND index_name = 'idx_schedule_pole'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_schedule_pole ON dimming_schedule(pole_id)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'light_pole' AND index_name = 'idx_pole_ward'
);
SET @index_sql = IF(@index_exists = 0, 'CREATE INDEX idx_pole_ward ON light_pole(ward_id)', 'SELECT 1');
PREPARE create_index_stmt FROM @index_sql;
EXECUTE create_index_stmt;
DEALLOCATE PREPARE create_index_stmt;

SHOW INDEX FROM sensor_reading;
SHOW INDEX FROM power_consumption_log;
SHOW INDEX FROM dimming_schedule;