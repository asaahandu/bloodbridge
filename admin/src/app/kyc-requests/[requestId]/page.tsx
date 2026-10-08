import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  AdminDataUnavailable,
  AdminHospitalVerificationBadge,
  AdminListLoading,
  AdminPageHeading,
  AdminPageShell,
} from "@/components/admin-page";
import { KycReviewActions } from "@/components/kyc-review-actions";
import {
  AdminCollectionsDataError,
  getAdminKycRequest,
  type AdminKycRequestDetail,
} from "@/lib/admin-collections-data";

export const metadata = {
  title: "KYC Submission | BloodBridge Admin",
  description: "Hospital verification information and supporting documents.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const sizeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${sizeFormatter.format(size / 1024)} KB`
    : `${sizeFormatter.format(size / (1024 * 1024))} MB`;
}

function KycSubmissionDetails({ request }: { request: AdminKycRequestDetail }) {
  return <div className="dashboard-content">
    <AdminPageHeading eyebrow="Hospital verification" title={<>{request.hospitalName} <AdminHospitalVerificationBadge status={request.hospitalVerificationStatus} /></>} description="Information and supporting documents submitted for hospital verification." />
    <section className="panel submission-panel">
      <div className="panel-heading"><div><h2>Submitted information</h2><p>Hospital account and verification submission details</p></div><span className={`user-status ${request.status}`}>{request.status}</span></div>
      <div className="submission-details">
        <div className="submission-detail"><span>Hospital name submitted</span><div className="hospital-name-row"><strong>{request.hospitalName}</strong><AdminHospitalVerificationBadge status={request.hospitalVerificationStatus} /></div></div>
        <div className="submission-detail"><span>Account contact</span><strong>{request.hospitalEmail || "Email unavailable"}<br />{request.hospitalPhone || "Phone unavailable"}</strong></div>
        <div className="submission-detail"><span>Registered location</span><strong>{request.cityRegion || "Location unavailable"}</strong></div>
        <div className="submission-detail"><span>Submitted</span><strong>{dateFormatter.format(new Date(request.submittedAt))}</strong></div>
      </div>
      <div className="panel-heading"><div><h2>Supporting documents</h2><p>Documents attached to this verification request</p></div><span>{request.documents.length} file{request.documents.length === 1 ? "" : "s"}</span></div>
      {request.documents.length ? <div className="submission-documents">{request.documents.map((document) => {
        const documentUrl = `/api/admin/kyc-requests/${encodeURIComponent(request.id)}/documents/${document.index}`;
        return <article className="submission-document" key={`${document.index}-${document.name}`}>
          <header><strong>{document.name}</strong><span>{document.mimeType} · {formatFileSize(document.size)}</span></header>
          {document.mimeType === "application/pdf"
            ? <iframe title={document.name} src={documentUrl} />
            : <a href={documentUrl} target="_blank" rel="noreferrer" aria-label={`Open ${document.name} in a new tab`}><Image src={documentUrl} alt={document.name} width={1200} height={900} unoptimized /></a>}
        </article>;
      })}</div> : <p className="empty-table">No supporting documents were attached.</p>}
      <div className="submission-actions">
        <KycReviewActions requestId={request.id} status={request.status} />
        <Link className="button secondary" href="/kyc-requests">Back to KYC requests</Link>
      </div>
    </section>
  </div>;
}

async function KycSubmissionContent({ params }: { params: Promise<{ requestId: string }> }) {
  await connection();
  const { requestId } = await params;
  let request: AdminKycRequestDetail | null = null;
  let errorMessage: string | null = null;
  if (!/^[a-f\d]{24}$/i.test(requestId)) {
    errorMessage = "The requested KYC submission could not be found.";
  } else {
    try {
      request = await getAdminKycRequest(requestId);
    } catch (error) {
      errorMessage = error instanceof AdminCollectionsDataError
        ? error.message
        : "The KYC submission could not be loaded.";
    }
  }

  return errorMessage
    ? <AdminDataUnavailable title="KYC submission" message={errorMessage} />
    : request ? <KycSubmissionDetails request={request} /> : null;
}

export default async function KycSubmissionPage({ params }: { params: Promise<{ requestId: string }> }) {
  return <AdminPageShell activeItem="KYC Requests">
    <Suspense fallback={<AdminListLoading />}><KycSubmissionContent params={params} /></Suspense>
  </AdminPageShell>;
}
