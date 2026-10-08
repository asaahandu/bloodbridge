import { connection } from "next/server";
import { Suspense } from "react";

import {
  AdminDataUnavailable,
  AdminHospitalVerificationBadge,
  AdminListLoading,
  AdminMetric,
  AdminPageHeading,
  AdminPageShell,
  AdminPagination,
} from "@/components/admin-page";
import {
  AdminCollectionsDataError,
  getAdminCampaigns,
  type AdminCampaignsData,
} from "@/lib/admin-collections-data";

export const metadata = {
  title: "Campaigns | BloodBridge Admin",
  description: "View blood donation campaigns across the BloodBridge network.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const numberFormatter = new Intl.NumberFormat("en-US");

function CampaignsTable({ data }: { data: AdminCampaignsData }) {
  return <section className="panel collection-panel" aria-label="Blood donation campaigns">
    <div className="panel-heading"><div><h2>All campaigns</h2><p>Donation events submitted by partner hospitals</p></div><span className="database-label">{numberFormatter.format(data.total)} total</span></div>
    <div className="table-scroll"><table className="collection-table campaigns-table">
      <thead><tr><th>Campaign</th><th>Hospital</th><th>Date</th><th>Location</th><th>Documents</th><th>Created</th></tr></thead>
      <tbody>{data.campaigns.length ? data.campaigns.map((campaign) => <tr key={campaign.id}>
        <td><strong className="user-name">{campaign.title}</strong><small className="campaign-description">{campaign.description}</small></td>
        <td><span className="hospital-name-row"><span className="hospital-account-name">{campaign.hospitalName}</span><AdminHospitalVerificationBadge status={campaign.hospitalVerificationStatus} /></span></td>
        <td>{dateFormatter.format(new Date(campaign.date))}<small><span className={`user-status ${campaign.upcoming ? "active" : "past"}`}>{campaign.upcoming ? "upcoming" : "past"}</span></small></td>
        <td>{campaign.location}</td>
        <td>{campaign.images.length === 0 ? "No images" : `${campaign.images.length} image${campaign.images.length === 1 ? "" : "s"}`}</td>
        <td>{dateFormatter.format(new Date(campaign.createdAt))}</td>
      </tr>) : <tr><td className="empty-table" colSpan={6}>There are no campaigns yet.</td></tr>}</tbody>
    </table></div>
    <AdminPagination page={data.page} pageSize={data.pageSize} total={data.total} path="/campaigns" />
  </section>;
}

async function CampaignsContent({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await connection();
  const { page: pageValue = "1" } = await searchParams;
  let data: AdminCampaignsData | null = null;
  let errorMessage: string | null = null;

  if (typeof pageValue !== "string" || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue))) {
    errorMessage = "The requested campaigns page number is invalid.";
  } else {
    try {
      data = await getAdminCampaigns(Number(pageValue));
    } catch (error) {
      errorMessage = error instanceof AdminCollectionsDataError
        ? error.message
        : "Campaigns could not be loaded.";
    }
  }

  if (errorMessage) return <AdminDataUnavailable title="Campaigns" message={errorMessage} />;
  if (!data) return null;

  return <div className="dashboard-content">
    <AdminPageHeading eyebrow="Community outreach" title="Campaigns" description="View upcoming and past donation drives from partner hospitals." />
    <section className="metrics-grid" aria-label="Campaign totals">
      <AdminMetric label="Total campaigns" value={data.total} icon="campaign" tone="red" detail="All campaigns" />
      <AdminMetric label="Upcoming" value={data.upcoming} icon="activity" tone="green" detail="Scheduled events" />
      <AdminMetric label="Past campaigns" value={data.past} icon="reports" tone="dark" detail="Completed dates" />
    </section>
    <CampaignsTable data={data} />
  </div>;
}

export default function CampaignsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  return <AdminPageShell activeItem="Campaigns"><Suspense fallback={<AdminListLoading />}><CampaignsContent searchParams={searchParams} /></Suspense></AdminPageShell>;
}
