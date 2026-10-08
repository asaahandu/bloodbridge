import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";

const navigation: Array<{
  label: string;
  href: string;
  icon: IconName;
}> = [
  { label: "Overview", href: "/", icon: "dashboard" },
  { label: "Users", href: "/users", icon: "donors" },
  { label: "Blood Requests", href: "/blood-requests", icon: "requests" },
  { label: "Campaigns", href: "/campaigns", icon: "campaign" },
  { label: "KYC Requests", href: "/kyc-requests", icon: "verification" },
  { label: "Reports", href: "/reports", icon: "reports" },
];

export type NavigationItem =
  | "Overview"
  | "Users"
  | "Blood Requests"
  | "Campaigns"
  | "KYC Requests"
  | "Reports";

export function Brand() {
  return <Link className="brand" href="/" aria-label="BloodBridge admin home"><span className="brand-mark"><Icon name="drop" size={21} /></span><span><strong>BloodBridge</strong><small>Admin console</small></span></Link>;
}

function NavItems({ activeItem }: { activeItem: NavigationItem }) {
  return <nav className="sidebar-nav" aria-label="Admin navigation">
    {navigation.map((item) => {
      const active = item.label === activeItem;
      return <Link aria-current={active ? "page" : undefined} className={active ? "nav-link active" : "nav-link"} href={item.href} key={item.label}><Icon name={item.icon} size={19} /><span>{item.label}</span></Link>;
    })}
  </nav>;
}

export function Sidebar({ activeItem = "Overview" }: { activeItem?: NavigationItem }) {
  return <aside className="sidebar"><Brand /><NavItems activeItem={activeItem} /><div className="sidebar-footer"><div className="admin-profile"><span className="avatar">BA</span><span className="profile-copy"><strong>BloodBridge Admin</strong><small>Super administrator</small></span><button className="icon-button subtle" type="button" aria-label="Open account menu"><Icon name="more" size={18} /></button></div><button className="logout-button" type="button"><Icon name="logout" size={18} />Sign out</button></div></aside>;
}

export function MobileNavigation({ activeItem = "Overview" }: { activeItem?: NavigationItem }) {
  return <details className="mobile-navigation"><summary className="icon-button" aria-label="Open navigation"><Icon name="menu" size={22} /></summary><div className="mobile-nav-panel"><Brand /><NavItems activeItem={activeItem} /></div></details>;
}
