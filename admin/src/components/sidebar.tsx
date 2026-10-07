import { Icon, type IconName } from "@/components/icons";

const navigation: Array<{
  label: string;
  href: string;
  icon: IconName;
  active?: boolean;
}> = [
  { label: "Overview", href: "#top", icon: "dashboard", active: true },
  { label: "Users", href: "#users", icon: "donors" },
  { label: "Blood Requests", href: "#blood-requests", icon: "requests" },
  { label: "Campaigns", href: "#campaigns", icon: "campaign" },
  { label: "KYC Requests", href: "#kyc-requests", icon: "verification" },
  { label: "Reports", href: "#reports", icon: "reports" },
];

export function Brand() {
  return <a className="brand" href="#top" aria-label="BloodBridge admin home"><span className="brand-mark"><Icon name="drop" size={21} /></span><span><strong>BloodBridge</strong><small>Admin console</small></span></a>;
}

function NavItems() {
  return <nav className="sidebar-nav" aria-label="Admin navigation">
    {navigation.map((item) => <a className={item.active ? "nav-link active" : "nav-link"} href={item.href} key={item.label}><Icon name={item.icon} size={19} /><span>{item.label}</span></a>)}
  </nav>;
}

export function Sidebar() {
  return <aside className="sidebar"><Brand /><NavItems /><div className="sidebar-footer"><div className="admin-profile"><span className="avatar">BA</span><span className="profile-copy"><strong>BloodBridge Admin</strong><small>Super administrator</small></span><button className="icon-button subtle" type="button" aria-label="Open account menu"><Icon name="more" size={18} /></button></div><button className="logout-button" type="button"><Icon name="logout" size={18} />Sign out</button></div></aside>;
}

export function MobileNavigation() {
  return <details className="mobile-navigation"><summary className="icon-button" aria-label="Open navigation"><Icon name="menu" size={22} /></summary><div className="mobile-nav-panel"><Brand /><NavItems /></div></details>;
}
