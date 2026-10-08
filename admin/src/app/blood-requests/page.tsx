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
  getAdminBloodRequests,
  type AdminBloodRequestsData,
} from "@/lib/admin-collections-data";

export const metadata = {
  title: "Blood Requests | BloodBridge Admin",
  description: "Monitor blood requests across the BloodBridge network.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const numberFormatter = new Intl.NumberFormat("en-US");

function BloodRequestsTable({ data }: { data: AdminBloodRequestsData }) {
  return <section className="panel collection-panel" aria-label="Blood requests">
    <div className="panel-heading"><div><h2>All blood requests</h2><p>Request status and donor response progress across the network</p></div><span className="database-label">{numberFormatter.format(data.total)} total</span></div>
    <div className="table-scroll"><table className="collection-table">
      <thead><tr><th>Blood</th><th>Hospital</th><th>Units</th><th>Donor progress</th><th>Urgency</th><th>Status</th><th>Needed by</th><th>Created</th></tr></thead>
      <tbody>{data.requests.length ? data.requests.map((request) => <tr key={request.id}>
        <td><span className="blood-badge table-badge">{request.bloodType}</span></td>
        <td><span className="hospital-name-row"><strong className="hospital-name">{request.hospitalName}</strong><AdminHospitalVerificationBadge status={request.hospitalVerificationStatus} /></span><small>{request.city} · {request.internalReference}</small></td>
        <td>{numberFormatter.format(request.unitsNeeded)}</td>
        <td>{numberFormatter.format(request.donorProgress.responded)} / {numberFormatter.format(request.donorProgress.notified)} responded<small>{numberFormatter.format(request.donorProgress.confirmed)} confirmed</small></td>
        <td><span className={`status-pill ${request.urgency}`}>{request.urgency}</span></td>
        <td><span className={`user-status ${request.status === "active" ? "active" : request.status}`}>{request.status}</span></td>
        <td>{dateFormatter.format(new Date(request.neededBy))}</td>
        <td>{dateFormatter.format(new Date(request.createdAt))}</td>
      </tr>) : <tr><td className="empty-table" colSpan={8}>There are no blood requests yet.</td></tr>}</tbody>
    </table></div>
    <AdminPagination page={data.page} pageSize={data.pageSize} total={data.total} path="/blood-requests" />
  </section>;
}

async function BloodRequestsContent({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await connection();
  const { page: pageValue = "1" } = await searchParams;
  let data: AdminBloodRequestsData | null = null;
  let errorMessage: string | null = null;

  if (typeof pageValue !== "string" || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue))) {
    errorMessage = "The requested blood requests page number is invalid.";
  } else {
    try {
      data = await getAdminBloodRequests(Number(pageValue));
    } catch (error) {
      errorMessage = error instanceof AdminCollectionsDataError
        ? error.message
        : "Blood requests could not be loaded.";
    }
  }

  if (errorMessage) return <AdminDataUnavailable title="Blood requests" message={errorMessage} />;
  if (!data) return null;

  return <div className="dashboard-content">
    <AdminPageHeading eyebrow="Network operations" title="Blood requests" description="Track urgency, fulfillment, and donor responses across the network." />
    <section className="metrics-grid" aria-label="Blood request totals">
      <AdminMetric label="Total requests" value={data.total} icon="requests" tone="red" detail="All requests" />
      <AdminMetric label="Active" value={data.active} icon="activity" tone="gold" detail={`${numberFormatter.format(data.critical)} critical`} />
      <AdminMetric label="Fulfilled" value={data.fulfilled} icon="verification" tone="green" detail={`${numberFormatter.format(data.cancelled)} cancelled`} />
    </section>
    <BloodRequestsTable data={data} />
  </div>;
}

export default function BloodRequestsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  return <AdminPageShell activeItem="Blood Requests"><Suspense fallback={<AdminListLoading />}><BloodRequestsContent searchParams={searchParams} /></Suspense></AdminPageShell>;
}
