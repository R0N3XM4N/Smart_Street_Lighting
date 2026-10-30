import "server-only";
import { getPool } from "@/lib/db";

export type DashboardData = {
  summary: { totalPoles: number; onlinePoles: number; energyTodayKwh: number; activeSchedules: number };
  poles: Array<{
    id: number; poleCode: string; location: string; zone: string; wattage: number;
    status: string; brightness: number; averageLux: number | null;
    readingCount: number; lastSeen: string | null;
  }>;
  readings: Array<{
    id: number; poleCode: string; zone: string; measuredAt: string;
    energyKwh: number; luxLevel: number; pedestrianCount: number; status: string;
  }>;
  schedules: Array<{
    id: number; name: string; zone: string; onTime: string; offTime: string;
    days: string; enabled: boolean; affectedPoles: number;
  }>;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const pool = getPool();
  const [summaryRows, poleRows, readingRows, scheduleRows] = await Promise.all([
    pool.execute(
      `SELECT COUNT(DISTINCT p.id) AS totalPoles,
              COUNT(DISTINCT CASE WHEN p.status = 'online' THEN p.id END) AS onlinePoles,
              (SELECT COALESCE(SUM(kwh_consumed), 0) FROM power_consumption_log
                WHERE date_logged = CURRENT_DATE) AS energyTodayKwh,
              (SELECT COUNT(*) FROM v_dimming_schedule WHERE enabled = 1) AS activeSchedules
         FROM v_pole_summary p`,
    ),
    pool.execute(
      `SELECT id, pole_code AS poleCode, location, zone, wattage,
              status, brightness, average_lux AS averageLux,
              reading_count AS readingCount,
              DATE_FORMAT(last_seen, '%Y-%m-%d %H:%i') AS lastSeen
         FROM v_pole_summary
        ORDER BY zone, pole_code LIMIT 100`,
    ),
    pool.execute(
      `SELECT r.id, p.pole_code AS poleCode, p.zone,
              DATE_FORMAT(r.measured_at, '%Y-%m-%d %H:%i') AS measuredAt,
              r.energy_kwh AS energyKwh, r.lux_level AS luxLevel,
              r.pedestrian_count AS pedestrianCount, r.status
         FROM readings r JOIN poles p ON p.id = r.pole_id
        ORDER BY r.measured_at DESC LIMIT 8`,
    ),
    pool.execute(
      `SELECT id, name, zone, TIME_FORMAT(on_time, '%H:%i') AS onTime,
              TIME_FORMAT(off_time, '%H:%i') AS offTime, days, enabled, affected_poles AS affectedPoles
         FROM v_dimming_schedule ORDER BY enabled DESC, name LIMIT 8`,
    ),
  ]);
  return {
    summary: (summaryRows[0] as Array<DashboardData["summary"]>)[0] ?? {
      totalPoles: 0, onlinePoles: 0, energyTodayKwh: 0, activeSchedules: 0,
    },
    poles: poleRows[0] as DashboardData["poles"],
    readings: readingRows[0] as DashboardData["readings"],
    schedules: scheduleRows[0] as DashboardData["schedules"],
  };
}
