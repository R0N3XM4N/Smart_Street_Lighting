-- PR 6 / 9 — Auth + Roles (Member A / Ronak)
USE smart_streetlight_grid;

CREATE ROLE IF NOT EXISTS smart_lighting_admin;
CREATE ROLE IF NOT EXISTS smart_lighting_operator;
CREATE ROLE IF NOT EXISTS smart_lighting_viewer;

GRANT SELECT, INSERT ON smart_streetlight_grid.light_pole TO smart_lighting_operator;
GRANT SELECT, INSERT, UPDATE ON smart_streetlight_grid.sensor_reading TO smart_lighting_operator;
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_streetlight_grid.dimming_schedule TO smart_lighting_operator;
GRANT SELECT ON smart_streetlight_grid.power_consumption_log TO smart_lighting_operator;
GRANT SELECT ON smart_streetlight_grid.v_pole_summary TO smart_lighting_operator;
GRANT SELECT ON smart_streetlight_grid.v_dimming_schedule TO smart_lighting_operator;
GRANT EXECUTE ON PROCEDURE smart_streetlight_grid.sp_update_brightness TO smart_lighting_operator;
GRANT SELECT ON smart_streetlight_grid.light_pole TO smart_lighting_viewer;
GRANT SELECT ON smart_streetlight_grid.sensor_reading TO smart_lighting_viewer;