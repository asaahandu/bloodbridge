import { connection } from "next/server";
import { Suspense } from "react";

import { Icon, type IconName } from "@/components/icons";
import { MobileNavigation, Sidebar } from "@/components/sidebar";
import {
  DashboardDataError,
  getDashboardData,
  type DashboardAlert,
  type DashboardData,
} from "@/lib/dashboard-data";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatRelativeTime(value: string, generatedAt: string) {
  const seconds = Math.max(
    0,
    Math.round((new Date(generatedAt).getTime() - new Date(value).getTime()) / 1_000),
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatHeadingDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Douala",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

function formatRefreshTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Douala",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  detail,
  note,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  note: string;
  icon: IconName;
  tone: string;
}) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon name={icon} size={21} /></div>
    <div className="metric-card-top"><span>{label}</span><span className="database-label">Live</span></div>
    <strong className="metric-value">{numberFormatter.format(value)}</strong>
    <div className="metric-change"><span className={tone === "dark" ? "attention" : "positive"}>{detail}</span><span>{note}</span></div>
  </article>;
}

function ResponseChart({ series }: { series: DashboardData["donorResponses"]["series"] }) {
  const maxValue = Math.max(1, ...series.flatMap((day) => [day.notified, day.total]));
  const createPoints = (value: "notified" | "total") => series.map((day, index) => {
    const x = series.length === 1 ? 280 : (index / (series.length - 1)) * 560;
    const y = 170 - (day[value] / maxValue) * 145;
    return { x, y, ...day };
  });
  const notifiedPoints = createPoints("notified");
  const responsePoints = createPoints("total");
  const responseLine = responsePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const notifiedLine = notifiedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = responsePoints.length
    ? `M ${responsePoints.map((point) => `${point.x} ${point.y}`).join(" L ")} L 560 190 L 0 190 Z`
    : "";
  const axisValues = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(maxValue * ratio));

  return <div className="chart-wrap" aria-label="Database-backed donor notifications and responses for the last fourteen days" role="img">
    <div className="chart-axis">{axisValues.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}</div>
    <div className="chart-canvas"><div className="chart-grid" /><svg viewBox="0 0 560 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9f232b" stopOpacity="0.25" /><stop offset="100%" stopColor="#9f232b" stopOpacity="0" /></linearGradient></defs>{areaPath ? <path className="chart-area" d={areaPath} /> : null}<polyline className="chart-line notified" points={notifiedLine} /><polyline className="chart-line responded" points={responseLine} />{responsePoints.map((point) => <circle className="chart-dot" cx={point.x} cy={point.y} key={point.date} r="4" />)}</svg><div className="chart-labels">{series.map((day, index) => <span key={day.date}>{index % 2 === 0 || index === series.length - 1 ? day.label : ""}</span>)}</div></div>
  </div>;
}

function alertIcon(alert: DashboardAlert): IconName {
  if (alert.type === "critical_requests") return "alert";
  if (alert.type === "pending_verifications") return "verification";
  if (alert.type === "delivery_failures") return "bell";
  return "shield";
}

function DashboardUnavailable({ message }: { message: string }) {
  return <div className="dashboard-content"><section className="dashboard-error"><span className="alert-icon danger"><Icon name="alert" size={20} /></span><div><p className="eyebrow">Database connection required</p><h1>Dashboard data is unavailable</h1><p>{message}</p><code>Copy admin/.env.example to admin/.env.local, use the same ADMIN_DASHBOARD_TOKEN in backend/.env, then restart both applications.</code></div></section></div>;
}

function DashboardSkeleton() {
  return <div className="dashboard-content" aria-label="Loading dashboard data"><div className="skeleton heading-skeleton" /><div className="metrics-grid"><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /></div><div className="skeleton panel-skeleton" /></div>;
}

async function DashboardContent() {
  await connection();

  let data: DashboardData;
  try {
    data = await getDashboardData();
  } catch (error) {
    const message = error instanceof DashboardDataError
      ? error.message
      : "The dashboard could not load its database metrics.";
    return <DashboardUnavailable message={message} />;
  }

  const responseChange = data.donorResponses.changePercent;
  const responseTrend = responseChange == null
    ? "No prior-week baseline"
    : `${responseChange >= 0 ? "+" : ""}${responseChange}%`;
  const responseTrendTone = responseChange == null
    ? "neutral"
    : responseChange >= 0 ? "positive" : "negative";
  const responseRate = data.donorResponses.responseRate == null
    ? "—"
    : `${data.donorResponses.responseRate}%`;
  const acceptanceRate = data.donorResponses.acceptanceRate == null
    ? "—"
    : `${data.donorResponses.acceptanceRate}%`;

  return <div className="dashboard-content">
    <section className="page-heading">
      <div><p className="eyebrow">{formatHeadingDate(data.generatedAt)}</p><h1>Good morning, BloodBridge Admin.</h1><p>Live operations across the BloodBridge network.</p></div>
      <div className="heading-actions"><span className="last-updated"><i /> Updated {formatRefreshTime(data.generatedAt)}</span><button className="button secondary" type="button"><Icon name="reports" size={18} />Export report</button></div>
    </section>

    <section className="metrics-grid" aria-label="Database metrics">
      <MetricCard label="Registered donors" value={data.metrics.donors.total} detail="All donors" note="registered accounts" icon="donors" tone="red" />
      <MetricCard label="Partner hospitals" value={data.metrics.hospitals.total} detail={`${numberFormatter.format(data.metrics.hospitals.verified)} verified`} note={`${numberFormatter.format(data.metrics.hospitals.pending)} pending`} icon="hospital" tone="gold" />
      <MetricCard label="Active requests" value={data.metrics.activeRequests.total} detail={`${numberFormatter.format(data.metrics.activeRequests.critical)} critical`} note="currently open" icon="requests" tone="dark" />
    </section>

    <section className="dashboard-grid">
      <article className="panel performance-panel">
        <div className="panel-heading"><div><h2>Donor response</h2><p>Notifications and recorded responses calculated from donor activity</p></div><div className="panel-heading-actions"><span className="live-indicator"><i /> Live database</span><span className="select-button">Last {data.donorResponses.periodDays} days</span></div></div>
        <div className="response-stats">
          <div className="response-stat"><span>Notified</span><strong>{numberFormatter.format(data.donorResponses.notified)}</strong><small>donors contacted</small></div>
          <div className="response-stat"><span>Responded</span><strong>{numberFormatter.format(data.donorResponses.total)}</strong><small className={`stat-trend ${responseTrendTone}`}><Icon name="trend" size={12} /> {responseTrend}</small></div>
          <div className="response-stat featured"><span>Response rate</span><strong>{responseRate}</strong><small>responded ÷ notified</small></div>
          <div className="response-stat"><span>Acceptance rate</span><strong>{acceptanceRate}</strong><small>{numberFormatter.format(data.donorResponses.accepted)} accepted · {numberFormatter.format(data.donorResponses.declined)} declined</small></div>
        </div>
        <div className="chart-toolbar"><span>Daily activity</span><div className="chart-legend"><span className="chart-key notified"><i /> Notified</span><span className="chart-key responded"><i /> Responded</span></div></div>
        <ResponseChart series={data.donorResponses.series} />
      </article>

      <article className="panel alerts-panel">
        <div className="panel-heading"><div><h2>Needs attention</h2><p>Computed from current system records</p></div><span className="database-label">Live</span></div>
        <div className="alerts-list">{data.alerts.map((alert) => <div className="alert-row" key={alert.type}><span className={`alert-icon ${alert.tone}`}><Icon name={alertIcon(alert)} size={18} /></span><div><strong>{alert.title}</strong><p>{alert.description}</p><small>Checked {formatRefreshTime(data.generatedAt)}</small></div></div>)}</div>
      </article>

      <article className="panel requests-panel" id="blood-requests">
        <div className="panel-heading"><div><h2>Active blood requests</h2><p>Current requests and database-backed donor response progress</p></div><a className="text-link" href="#blood-requests">{numberFormatter.format(data.metrics.activeRequests.total)} total <Icon name="chevron" size={14} /></a></div>
        <div className="table-scroll"><table><thead><tr><th>Blood</th><th>Hospital</th><th>Units</th><th>Responses</th><th>Confirmed</th><th>Urgency</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.activeRequests.length ? data.activeRequests.map((request) => <tr key={request.id}><td><span className="blood-badge table-badge">{request.bloodType}</span></td><td><strong className="hospital-name">{request.hospitalName}</strong><small>{request.city}</small></td><td>{request.unitsNeeded}</td><td>{request.donorProgress.responded} / {request.donorProgress.notified}</td><td>{request.donorProgress.confirmed}</td><td><span className={`status-pill ${request.urgency}`}>{request.urgency}</span></td><td>{formatRelativeTime(request.createdAt, data.generatedAt)}</td><td><button className="icon-button subtle" type="button" aria-label={`Open ${request.hospitalName} request`}><Icon name="more" size={18} /></button></td></tr>) : <tr><td className="empty-table" colSpan={8}>There are no active blood requests.</td></tr>}</tbody></table></div>
      </article>
    </section>
  </div>;
}

export default function Home() {
  return <div className="app-shell" id="top">
    <Sidebar />
    <main className="main-content">
      <header className="topbar">
        <div className="mobile-brand-row"><MobileNavigation /><span className="mobile-title">BloodBridge</span></div>
        <form className="search" role="search"><Icon name="search" size={18} /><input aria-label="Search BloodBridge admin" placeholder="Search hospitals, donors, requests..." type="search" /><kbd>⌘ K</kbd></form>
        <div className="topbar-actions"><button className="icon-button notification-button" type="button" aria-label="View notifications"><Icon name="bell" size={20} /><span /></button><span className="topbar-divider" /><div className="topbar-profile"><span className="avatar small">BA</span><span><strong>BloodBridge Admin</strong><small>Super admin</small></span><Icon name="chevron" size={15} /></div></div>
      </header>
      <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>
    </main>
  </div>;
}
