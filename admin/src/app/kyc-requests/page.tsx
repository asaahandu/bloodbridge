import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";

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
  getAdminKycRequests,
  type AdminKycRequestsData,
} from "@/lib/admin-collections-data";

export const metadata = {
  title: "KYC Requests | BloodBridge Admin",
  description: "Review hospital verification submissions across BloodBridge.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const numberFormatter = new Intl.NumberFormat("en-US");

function KycRequestsTable({ data }: { data: AdminKycRequestsData }) {
  return <section className="panel collection-panel" aria-label="Hospital verification requests">
    <div className="panel-heading"><div><h2>All verification requests</h2><p>Hospital account contact details and submitted document metadata</p></div><span className="database-label">{numberFormatter.format(data.total)} total</span></div>
    <div className="table-scroll"><table className="collection-table kyc-table">
      <thead><tr><th>Hospital</th><th>Contact</th><th>Location</th><th>Status</th><th>Documents</th><th>Submitted</th><th><span className="sr-only">Submission details</span></th></tr></thead>
      <tbody>{data.requests.length ? data.requests.map((request) => <tr key={request.id}>
        <td><span className="hospital-name-row"><strong className="user-name">{request.hospitalName}</strong><AdminHospitalVerificationBadge status={request.hospitalVerificationStatus} /></span></td>
        <td><strong className="user-contact">{request.hospitalEmail || "Email unavailable"}</strong><small>{request.hospitalPhone || "Phone unavailable"}</small></td>
        <td>{request.cityRegion || "Location unavailable"}</td>
        <td><span className={`user-status ${request.status}`}>{request.status}</span></td>
        <td>{request.documents.length === 0
          ? "No documents"
          : <ul className="document-list">{request.documents.map((document) => <li key={document.name}>{document.name}</li>)}</ul>}</td>
        <td>{dateFormatter.format(new Date(request.submittedAt))}</td>
        <td><Link className="button secondary view-submission-button" href={`/kyc-requests/${request.id}`}>View submission</Link></td>
      </tr>) : <tr><td className="empty-table" colSpan={7}>There are no verification requests yet.</td></tr>}</tbody>
    </table></div>
    <AdminPagination page={data.page} pageSize={data.pageSize} total={data.total} path="/kyc-requests" />
  </section>;
}

async function KycRequestsContent({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await connection();
  const { page: pageValue = "1" } = await searchParams;
  let data: AdminKycRequestsData | null = null;
  let errorMessage: string | null = null;

  if (typeof pageValue !== "string" || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue))) {
    errorMessage = "The requested KYC requests page number is invalid.";
  } else {
    try {
      data = await getAdminKycRequests(Number(pageValue));
    } catch (error) {
      errorMessage = error instanceof AdminCollectionsDataError
        ? error.message
        : "KYC requests could not be loaded.";
    }
  }

  if (errorMessage) return <AdminDataUnavailable title="KYC requests" message={errorMessage} />;
  if (!data) return null;

  return <div className="dashboard-content">
    <AdminPageHeading eyebrow="Hospital verification" title="KYC requests" description="Review verification submissions from hospitals seeking verified network access." />
    <section className="metrics-grid" aria-label="KYC request totals">
      <AdminMetric label="Total requests" value={data.total} icon="verification" tone="red" detail="All submissions" />
      <AdminMetric label="Pending review" value={data.pending} icon="activity" tone="gold" detail="Awaiting verification" />
      <AdminMetric label="Verified" value={data.verified} icon="shield" tone="green" detail={`${numberFormatter.format(data.rejected)} rejected`} />
    </section>
    <KycRequestsTable data={data} />
  </div>;
}

export default function KycRequestsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  return <AdminPageShell activeItem="KYC Requests"><Suspense fallback={<AdminListLoading />}><KycRequestsContent searchParams={searchParams} /></Suspense></AdminPageShell>;
}
