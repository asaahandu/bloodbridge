import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Icon } from "@/components/icons";
import { AdminHospitalVerificationBadge } from "@/components/admin-page";
import { MobileNavigation, Sidebar } from "@/components/sidebar";
import {
  AdminUsersDataError,
  getAdminUsers,
  type AdminUsersData,
} from "@/lib/users-data";

export const metadata = {
  title: "Users | BloodBridge Admin",
  description: "Registered donor and hospital accounts across BloodBridge.",
};

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function UsersUnavailable({ message }: { message: string }) {
  return <div className="dashboard-content"><section className="dashboard-error"><span className="alert-icon danger"><Icon name="alert" size={20} /></span><div><p className="eyebrow">Database connection required</p><h1>User data is unavailable</h1><p>{message}</p><code>Copy admin/.env.example to admin/.env.local, use the same ADMIN_DASHBOARD_TOKEN in backend/.env, then restart both applications.</code></div></section></div>;
}

function UserMetric({ label, value, icon, tone }: { label: string; value: number; icon: "donors" | "hospital" | "activity"; tone: string }) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon name={icon} size={21} /></div>
    <div className="metric-card-top"><span>{label}</span><span className="database-label">Live</span></div>
    <strong className="metric-value">{numberFormatter.format(value)}</strong>
    <div className="metric-change"><span>Registered</span><span>accounts</span></div>
  </article>;
}

function UsersTable({ data }: { data: AdminUsersData }) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const firstRecord = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const lastRecord = Math.min(data.page * data.pageSize, data.total);

  return <section className="panel users-panel" aria-label="Registered users">
    <div className="panel-heading"><div><h2>All users</h2><p>Donors and hospital accounts registered on BloodBridge</p></div><span className="database-label">{numberFormatter.format(data.total)} total</span></div>
    <div className="table-scroll"><table className="users-table">
      <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Location</th><th>Blood type</th><th>Status</th><th>Joined</th></tr></thead>
      <tbody>{data.users.length ? data.users.map((user) => <tr key={user.id}>
        <td><span className="hospital-name-row"><strong className="user-name">{user.fullName}</strong>{user.role === "hospital" ? <AdminHospitalVerificationBadge status={user.hospitalVerificationStatus} /> : null}</span></td>
        <td><span className={`user-role ${user.role}`}>{user.role}</span></td>
        <td><strong className="user-contact">{user.email}</strong><small>{user.phone}</small></td>
        <td>{user.cityRegion}</td>
        <td>{user.role === "donor" ? <span className="blood-badge table-badge">{user.bloodType ?? "—"}</span> : "—"}</td>
        <td>{user.role === "hospital" ? <span className={`user-status ${user.hospitalVerificationStatus ?? "unverified"}`}>{user.hospitalVerificationStatus ?? "unverified"}</span> : <span className="user-status active">Active</span>}</td>
        <td>{dateFormatter.format(new Date(user.createdAt))}</td>
      </tr>) : <tr><td className="empty-table" colSpan={7}>There are no registered users yet.</td></tr>}</tbody>
    </table></div>
    <footer className="users-pagination">
      <span>Showing {numberFormatter.format(firstRecord)}–{numberFormatter.format(lastRecord)} of {numberFormatter.format(data.total)}</span>
      <div>
        {data.page > 1
          ? <Link className="button secondary" href={`/users?page=${data.page - 1}`}>Previous</Link>
          : <span className="button secondary disabled" aria-disabled="true">Previous</span>}
        {data.page < totalPages
          ? <Link className="button secondary" href={`/users?page=${data.page + 1}`}>Next</Link>
          : <span className="button secondary disabled" aria-disabled="true">Next</span>}
      </div>
    </footer>
  </section>;
}

async function UsersContent({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await connection();
  const { page: pageValue = "1" } = await searchParams;
  let data: AdminUsersData | null = null;
  let errorMessage: string | null = null;

  if (typeof pageValue !== "string" || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue))) {
    errorMessage = "The requested users page number is invalid.";
  } else {
    try {
      data = await getAdminUsers(Number(pageValue));
    } catch (error) {
      errorMessage = error instanceof AdminUsersDataError
        ? error.message
        : "The user directory could not load its database records.";
    }
  }

  return errorMessage ? <UsersUnavailable message={errorMessage} /> : data ? <div className="dashboard-content">
    <section className="page-heading">
      <div><p className="eyebrow">User directory</p><h1>Users</h1><p>Manage visibility into donor and hospital accounts across the network.</p></div>
      <div className="heading-actions"><span className="last-updated"><i /> Live database</span></div>
    </section>
    <section className="metrics-grid" aria-label="User account totals">
      <UserMetric label="Total users" value={data.total} icon="activity" tone="red" />
      <UserMetric label="Donors" value={data.donors} icon="donors" tone="gold" />
      <UserMetric label="Hospitals" value={data.hospitals} icon="hospital" tone="dark" />
    </section>
    <UsersTable data={data} />
  </div> : null;
}

function UsersLoading() {
  return <div className="dashboard-content" aria-label="Loading users"><div className="skeleton heading-skeleton" /><div className="metrics-grid"><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /></div><div className="skeleton panel-skeleton" /></div>;
}

export default function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  return <div className="app-shell">
    <Sidebar activeItem="Users" />
    <main className="main-content">
      <header className="topbar">
        <div className="mobile-brand-row"><MobileNavigation activeItem="Users" /><span className="mobile-title">BloodBridge</span></div>
        <form className="search" role="search"><Icon name="search" size={18} /><input aria-label="Search BloodBridge admin" placeholder="Search hospitals, donors, requests..." type="search" /><kbd>⌘ K</kbd></form>
        <div className="topbar-actions"><button className="icon-button notification-button" type="button" aria-label="View notifications"><Icon name="bell" size={20} /><span /></button><span className="topbar-divider" /><div className="topbar-profile"><span className="avatar small">BA</span><span><strong>BloodBridge Admin</strong><small>Super admin</small></span><Icon name="chevron" size={15} /></div></div>
      </header>
      <Suspense fallback={<UsersLoading />}><UsersContent searchParams={searchParams} /></Suspense>
    </main>
  </div>;
}
