"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type User = { id: number; username: string; role: "viewer" | "operator" };
type Pole = {
  id: number; poleCode: string; location: string; zone: string; wattage: number;
  status: string; brightness: number; averageLux: number | null;
  readingCount: number; lastSeen: string | null;
};
type DashboardData = {
  summary: { totalPoles: number; onlinePoles: number; energyTodayKwh: number; activeSchedules: number };
  poles: Pole[];
  readings: Array<{
    id: number; poleCode: string; zone: string; measuredAt: string;
    energyKwh: number; luxLevel: number; pedestrianCount: number; status: string;
  }>;
  schedules: Array<{
    id: number; name: string; zone: string; onTime: string; offTime: string;
    days: string; enabled: boolean; affectedPoles: number;
  }>;
};
type EventRow = {
  actor: string; action: string; entityType: string; entityId: string;
  details: Record<string, unknown>; createdAt: string;
};
type Telemetry = {
  availability: { status: "available" | "not_configured" | "unavailable"; message: string };
  recent: EventRow[];
  byAction: Array<{ _id: string; count: number }>;
  byHour: Array<{ _id: string; count: number }>;
};

const emptyTelemetry: Telemetry = {
  availability: { status: "unavailable", message: "Checking MongoDB event store…" },
  recent: [], byAction: [], byHour: [],
};

const demoOperatorRegistrationEnabled =
  process.env.NEXT_PUBLIC_DEMO_OPERATOR_REGISTRATION === "true";
const readOnlyDemoEnabled = process.env.NEXT_PUBLIC_READ_ONLY_DEMO === "true";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [data, setData] = useState<DashboardData | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>(emptyTelemetry);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashboardResponse, telemetryResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch(`/api/telemetry${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`, { cache: "no-store" }),
      ]);
      if (dashboardResponse.ok) {
        setData(await dashboardResponse.json());
      } else {
        const result = await dashboardResponse.json();
        if (dashboardResponse.status === 401) setUser(null);
        else setMessage(result.error ?? "Could not load MySQL dashboard data.");
      }
      if (telemetryResponse.ok) setTelemetry(await telemetryResponse.json());
    } catch {
      setMessage("The dashboard could not reach its services. Check database configuration and try again.");
    }
  }, [query]);

  useEffect(() => {
    if (readOnlyDemoEnabled) {
      setUser({ id: 0, username: "Demo visitor", role: "viewer" });
      setChecking(false);
      return;
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        }
      })
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const password = values.get("password");
    const confirmPassword = values.get("confirmPassword");
    if (authMode === "register" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: values.get("username"),
          password,
          ...(authMode === "register"
            ? { role: values.get("role") === "operator" ? "operator" : "viewer" }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Authentication failed.");
      setUser(result.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>, endpoint: string, success: string) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      setMessage(`${success}${result.audit?.status && result.audit.status !== "available"
        ? ` MongoDB audit ${result.audit.status}: ${result.audit.message}` : ""}`);
      form.reset();
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setData(null);
  }

  async function deleteSchedule(id: number) {
    if (!window.confirm("Delete this lighting schedule?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete schedule.");
      setMessage(`Schedule deleted.${result.audit?.status && result.audit.status !== "available"
        ? ` MongoDB audit ${result.audit.status}: ${result.audit.message}` : ""}`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete schedule.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <main className="login-shell"><div className="login-card"><p>Checking your session...</p></div></main>;
  }

  if (!user) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <h1>Smart Street Lighting</h1>
          <p>{authMode === "login" ? "Sign in to view the lighting dashboard." : "Create an account to view the dashboard."}</p>
          {message && <div className="notice error" role="alert">{message}</div>}
          <form className="stack-form login-form" onSubmit={submitAuth}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                minLength={authMode === "register" ? 3 : undefined}
                maxLength={authMode === "register" ? 32 : 100}
                pattern={authMode === "register" ? "(?:[A-Za-z0-9._]|-){3,32}" : undefined}
                title={authMode === "register" ? "Use 3–32 letters, numbers, periods, underscores or hyphens." : undefined}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
                minLength={authMode === "register" ? 12 : undefined}
                maxLength={200}
              />
            </label>
            {authMode === "register" && (
              <>
                {demoOperatorRegistrationEnabled && (
                  <label>
                    Account type
                    <select name="role" defaultValue="viewer">
                      <option value="viewer">Viewer (read-only)</option>
                      <option value="operator">Operator (can change project data)</option>
                    </select>
                  </label>
                )}
                <label>
                  Confirm password
                  <input name="confirmPassword" type="password" autoComplete="new-password" required maxLength={200} />
                </label>
              </>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? (authMode === "login" ? "Signing in..." : "Creating account...") :
                (authMode === "login" ? "Sign in" : "Create account")}
            </button>
          </form>
          <p className="login-foot">
            {authMode === "login" ? "New here? " : "Already have an account? "}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          {authMode === "register" && !demoOperatorRegistrationEnabled && (
            <p className="login-foot">
              New accounts have viewer access. Usernames must be 3–32 letters, numbers, periods,
              underscores or hyphens; passwords must be at least 12 characters.
            </p>
          )}
          {authMode === "register" && demoOperatorRegistrationEnabled && (
            <p className="login-foot">
              Demo mode: operator accounts can change project data. Usernames must be 3–32 letters,
              numbers, periods, underscores or hyphens; passwords must be at least 12 characters.
            </p>
          )}
        </div>
      </main>
    );
  }

  const summary = data?.summary ?? { totalPoles: 0, onlinePoles: 0, energyTodayKwh: 0, activeSchedules: 0 };
  const onlinePercent = summary.totalPoles ? Math.round((summary.onlinePoles / summary.totalPoles) * 100) : 0;

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="site-title" href="#overview">Smart Street Lighting</a>
          <nav aria-label="Main navigation">
            <a href="#poles">Poles</a>
            <a href="#schedules">Schedules</a>
            <a href="#readings">Readings</a>
            <a href="#telemetry">Activity log</a>
          </nav>
          <div className="account-info">
            <span>{readOnlyDemoEnabled ? "Read-only demo" : `${user.username} (${user.role})`}</span>
            {!readOnlyDemoEnabled && <button className="button secondary" onClick={logout}>Sign out</button>}
          </div>
        </div>
      </header>

      <div className="page-content" id="overview">
        <div className="page-heading">
          <div>
            <h1>Lighting dashboard</h1>
            <p>Street-light poles, energy use, readings and schedules.</p>
          </div>
          <button className="button secondary" onClick={() => void loadData()}>Refresh data</button>
        </div>
        {message && <div className="notice" role="status">{message}</div>}
        {!data && <div className="notice">Loading dashboard data. Check the database connection if this takes too long.</div>}

        <section className="metrics-grid" aria-label="Network summary">
          <article className="metric-card"><span>Total poles</span><strong>{summary.totalPoles}</strong></article>
          <article className="metric-card"><span>Online poles</span><strong>{summary.onlinePoles} <small>({onlinePercent}%)</small></strong></article>
          <article className="metric-card"><span>Energy used today</span><strong>{Number(summary.energyTodayKwh).toLocaleString(undefined, { maximumFractionDigits: 1 })} <small>kWh</small></strong></article>
          <article className="metric-card"><span>Active schedules</span><strong>{summary.activeSchedules}</strong></article>
        </section>

        <section className="panel" id="poles">
          <div className="panel-heading">
            <div><h2>Street poles</h2><p>Current status and recent readings for each pole.</p></div>
            <button className="text-button" onClick={() => void loadData()}>Refresh list</button>
          </div>
          <div className="table-scroll"><table><thead><tr><th>Pole</th><th>Location</th><th>Zone</th><th>Status</th><th>Brightness</th><th>Average lux</th><th>Readings</th><th>Last seen</th></tr></thead><tbody>
            {(data?.poles ?? []).map((pole) => <tr key={pole.id}><td><b>{pole.poleCode}</b><small className="cell-subtext">{pole.wattage} W</small></td><td>{pole.location}</td><td>{pole.zone}</td><td><span className={`status-pill ${pole.status}`}>{pole.status}</span></td><td>{pole.brightness}%</td><td>{pole.averageLux === null ? "—" : Number(pole.averageLux).toFixed(1)}</td><td>{pole.readingCount}</td><td>{pole.lastSeen ?? "No readings"}</td></tr>)}
            {!data?.poles.length && <tr><td className="empty-row" colSpan={8}>No poles found.</td></tr>}
          </tbody></table></div>
          {user.role === "operator" && <form className="inline-form" onSubmit={(event) => void submitAction(event, "/api/brightness", "Brightness updated.")}>
            <b>Change pole brightness</b>
            <select name="poleId" required defaultValue=""><option value="" disabled>Select a pole</option>{(data?.poles ?? []).map((pole) => <option key={pole.id} value={pole.id}>{pole.poleCode} ({pole.zone})</option>)}</select>
            <input name="brightness" type="number" min="0" max="100" placeholder="Brightness (0–100%)" required />
            <button className="button primary" disabled={busy}>Save brightness</button>
          </form>}
        </section>

        <section className="panel" id="schedules">
          <div className="panel-heading"><div><h2>Lighting schedules</h2><p>Schedules are applied to all poles in their zone.</p></div></div>
          <div className="table-scroll"><table><thead><tr><th>Name</th><th>Zone</th><th>Days</th><th>Switch on</th><th>Switch off</th><th>Status</th>{user.role === "operator" && <th>Action</th>}</tr></thead><tbody>
            {(data?.schedules ?? []).map((schedule) => <tr key={schedule.id}><td>{schedule.name}</td><td>{schedule.zone}</td><td>{schedule.days}</td><td>{schedule.onTime}</td><td>{schedule.offTime}</td><td>{schedule.enabled ? "Enabled" : "Disabled"}</td>{user.role === "operator" && <td><button className="delete-button" onClick={() => void deleteSchedule(schedule.id)} disabled={busy} aria-label={`Delete ${schedule.name}`}>Delete</button></td>}</tr>)}
            {!data?.schedules.length && <tr><td className="empty-row" colSpan={user.role === "operator" ? 7 : 6}>No schedules found.</td></tr>}
          </tbody></table></div>
        </section>

        {user.role === "operator" && <section className="panel">
          <div className="panel-heading"><div><h2>Add project data</h2><p>Operator actions are recorded in the MongoDB activity log.</p></div></div>
          <div className="forms-grid">
            <form className="stack-form action-form" onSubmit={(event) => void submitAction(event, "/api/poles", "Pole added.")}>
              <h3>Add a pole</h3>
              <label>Pole code<input name="poleCode" placeholder="ST-1042" required maxLength={40} /></label>
              <label>Zone<input name="zone" placeholder="North" required maxLength={80} /></label>
              <label>Location<input name="location" placeholder="Street or intersection" required maxLength={160} /></label>
              <label>Wattage<input name="wattage" type="number" min="1" max="5000" placeholder="120" required /></label>
              <button className="button primary" disabled={busy}>Add pole</button>
            </form>
            <form className="stack-form action-form" onSubmit={(event) => void submitAction(event, "/api/readings", "Reading recorded.")}>
              <h3>Record a reading</h3>
              <label>Pole<select name="poleId" required defaultValue=""><option value="" disabled>Select a pole</option>{(data?.poles ?? []).map((pole) => <option key={pole.id} value={pole.id}>{pole.poleCode}</option>)}</select></label>
              <label>Energy (kWh)<input name="energyKwh" type="number" min="0" step="0.01" placeholder="2.45" required /></label>
              <label>Illuminance (lux)<input name="luxLevel" type="number" min="0" step="0.01" placeholder="4.20" required /></label>
              <label>Pedestrian count<input name="pedestrianCount" type="number" min="0" step="1" placeholder="12" required /></label>
              <label>Status<select name="status"><option value="online">Online</option><option value="offline">Offline</option><option value="maintenance">Maintenance</option></select></label>
              <label>Measured at<input name="measuredAt" type="datetime-local" required /></label>
              <button className="button primary" disabled={busy}>Save reading</button>
            </form>
            <form className="stack-form action-form" onSubmit={(event) => void submitAction(event, "/api/schedules", "Schedule created.")}>
              <h3>Create a schedule</h3>
              <label>Name<input name="name" placeholder="Evening lights" required maxLength={100} /></label>
              <label>Zone<input name="zone" placeholder="North" required maxLength={80} /></label>
              <label>Switch on<input name="onTime" type="time" required /></label>
              <label>Switch off<input name="offTime" type="time" required /></label>
              <label>Days<input name="days" placeholder="Mon,Tue,Wed" required /></label>
              <button className="button primary" disabled={busy}>Save schedule</button>
            </form>
          </div>
        </section>}

        <section className="panel" id="readings">
          <div className="panel-heading"><div><h2>Recent readings</h2><p>Most recent sensor data for the registered poles.</p></div></div>
          <div className="table-scroll"><table><thead><tr><th>Pole</th><th>Zone</th><th>Measured at</th><th>Energy</th><th>Illuminance</th><th>Pedestrians</th><th>Status</th></tr></thead><tbody>
            {(data?.readings ?? []).map((reading) => <tr key={reading.id}><td>{reading.poleCode}</td><td>{reading.zone}</td><td>{reading.measuredAt}</td><td>{Number(reading.energyKwh).toFixed(2)} kWh</td><td>{Number(reading.luxLevel).toFixed(1)} lux</td><td>{reading.pedestrianCount}</td><td><span className={`status-pill ${reading.status}`}>{reading.status}</span></td></tr>)}
            {!data?.readings.length && <tr><td className="empty-row" colSpan={7}>No readings found.</td></tr>}
          </tbody></table></div>
        </section>

        <section className="panel" id="telemetry">
          <div className="panel-heading"><div><h2>Activity log (MongoDB)</h2><p>Recent operator actions, with counts grouped by action and hour.</p></div><span className={`mongo-badge ${telemetry.availability.status}`}>{telemetry.availability.status.replace("_", " ")}</span></div>
          <p className="mongo-description">{telemetry.availability.message}</p>
          {telemetry.availability.status === "available" && <>
            <form className="search-form" onSubmit={(event) => { event.preventDefault(); void loadData(); }}><input aria-label="Search audit events" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions or pole details" maxLength={100} /><button className="button secondary">Search</button></form>
            <h3>Actions</h3>
            <div className="aggregation-list">{telemetry.byAction.map((action) => <span key={action._id}>{action._id}: {action.count}</span>)}{!telemetry.byAction.length && <span>No actions recorded yet.</span>}</div>
            <h3>Events by hour</h3>
            <div className="aggregation-list">{telemetry.byHour.slice(0, 6).map((hour) => <span key={String(hour._id)}>{new Date(hour._id).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: {hour.count}</span>)}{!telemetry.byHour.length && <span>No events recorded yet.</span>}</div>
            <h3>Recent events</h3>
            <div className="table-scroll"><table><thead><tr><th>Action</th><th>User</th><th>Item</th><th>Time</th></tr></thead><tbody>
              {telemetry.recent.slice(0, 10).map((event, index) => <tr key={`${event.action}-${event.entityId}-${index}`}><td>{event.action}</td><td>{event.actor}</td><td>{event.entityType} {event.entityId}</td><td>{new Date(event.createdAt).toLocaleString()}</td></tr>)}
              {!telemetry.recent.length && <tr><td className="empty-row" colSpan={4}>No matching events. Operator actions will appear here.</td></tr>}
            </tbody></table></div>
          </>}
          {telemetry.availability.status !== "available" && <div className="mongo-callout"><b>Activity log is {telemetry.availability.status.replace("_", " ")}.</b><span>MySQL lighting data remains available. Check MongoDB if you need to search operator events.</span></div>}
        </section>
        <footer className="footer">Smart Street Lighting DBMS project</footer>
      </div>
    </main>
  );
}
