"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type KycReviewActionsProps = {
  requestId: string;
  status: "pending" | "verified" | "rejected";
};

export function KycReviewActions({ requestId, status }: KycReviewActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const review = async (nextStatus: "verified" | "rejected") => {
    const confirmation = nextStatus === "verified"
      ? "Approve this hospital verification request?"
      : "Delete this submission from the pending queue? It will be retained with rejected status, and the hospital can resubmit.";
    if (!window.confirm(confirmation)) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/kyc-requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : "The verification request could not be updated.";
        throw new Error(message);
      }
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error
        ? reviewError.message
        : "The verification request could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="kyc-review-actions">
    {status === "pending" ? <>
      <button className="button primary" disabled={saving} onClick={() => void review("verified")} type="button">
        {saving ? "Saving…" : "Approve"}
      </button>
      <button className="button danger" disabled={saving} onClick={() => void review("rejected")} type="button">
        Delete
      </button>
    </> : <p>This request has already been {status}.</p>}
    {error ? <p className="kyc-review-error" role="alert">{error}</p> : null}
  </div>;
}
