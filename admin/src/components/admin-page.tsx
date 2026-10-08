import type { ReactNode } from "react";
import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { MobileNavigation, Sidebar, type NavigationItem } from "@/components/sidebar";

export function AdminPageShell({ activeItem, children }: { activeItem: NavigationItem; children: ReactNode }) {
  return <div className="app-shell">
    <Sidebar activeItem={activeItem} />
    <main className="main-content">
      <header className="topbar">
        <div className="mobile-brand-row"><MobileNavigation activeItem={activeItem} /><span className="mobile-title">BloodBridge</span></div>
        <form className="search" role="search"><Icon name="search" size={18} /><input aria-label="Search BloodBridge admin" placeholder="Search hospitals, donors, requests..." type="search" /><kbd>⌘ K</kbd></form>
        <div className="topbar-actions"><button className="icon-button notification-button" type="button" aria-label="View notifications"><Icon name="bell" size={20} /><span /></button><span className="topbar-divider" /><div className="topbar-profile"><span className="avatar small">BA</span><span><strong>BloodBridge Admin</strong><small>Super admin</small></span><Icon name="chevron" size={15} /></div></div>
      </header>
      {children}
    </main>
  </div>;
}

export function AdminPageHeading({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description: string }) {
  return <section className="page-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
    <div className="heading-actions"><span className="last-updated"><i /> Live database</span></div>
  </section>;
}

export function AdminHospitalVerificationBadge({
  status,
}: {
  status?: "unverified" | "pending" | "rejected" | "verified";
}) {
  return status === "verified"
    ? <span aria-label="Verified hospital" className="hospital-verification-badge verified" role="img"><Icon name="verification" size={14} /></span>
    : <span className="hospital-verification-badge">Unverified</span>;
}

export function AdminMetric({ label, value, icon, tone, detail }: { label: string; value: number; icon: IconName; tone: string; detail: string }) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon name={icon} size={21} /></div>
    <div className="metric-card-top"><span>{label}</span><span className="database-label">Live</span></div>
    <strong className="metric-value">{new Intl.NumberFormat("en-US").format(value)}</strong>
    <div className="metric-change"><span>{detail}</span></div>
  </article>;
}

export function AdminPagination({ page, pageSize, total, path }: { page: number; pageSize: number; total: number; path: string }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);

  return <footer className="users-pagination">
    <span>Showing {new Intl.NumberFormat("en-US").format(firstRecord)}–{new Intl.NumberFormat("en-US").format(lastRecord)} of {new Intl.NumberFormat("en-US").format(total)}</span>
    <div>
      {page > 1
        ? <Link className="button secondary" href={`${path}?page=${page - 1}`}>Previous</Link>
        : <span className="button secondary disabled" aria-disabled="true">Previous</span>}
      {page < totalPages
        ? <Link className="button secondary" href={`${path}?page=${page + 1}`}>Next</Link>
        : <span className="button secondary disabled" aria-disabled="true">Next</span>}
    </div>
  </footer>;
}

export function AdminListLoading() {
  return <div className="dashboard-content" aria-label="Loading records"><div className="skeleton heading-skeleton" /><div className="metrics-grid"><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /><div className="skeleton card-skeleton" /></div><div className="skeleton panel-skeleton" /></div>;
}

export function AdminDataUnavailable({ title, message }: { title: string; message: string }) {
  return <div className="dashboard-content"><section className="dashboard-error"><span className="alert-icon danger"><Icon name="alert" size={20} /></span><div><p className="eyebrow">Database connection required</p><h1>{title} data is unavailable</h1><p>{message}</p><code>Copy admin/.env.example to admin/.env.local, use the same ADMIN_DASHBOARD_TOKEN in backend/.env, then restart both applications.</code></div></section></div>;
}
