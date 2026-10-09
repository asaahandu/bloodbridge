"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserActionsProps = {
  userId: string;
  fullName: string;
  suspended: boolean;
};

export function UserActions({ userId, fullName, suspended }: UserActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateSuspension() {
    const action = suspended ? "reactivate" : "suspend";
    if (!window.confirm(`Are you sure you want to ${action} ${fullName}?`)) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : `Could not ${action} this user.`;
        throw new Error(message);
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} this user.`);
    } finally {
      setPending(false);
    }
  }

  async function deleteUser() {
    if (!window.confirm(
      `Permanently delete ${fullName} and all linked records? This action cannot be undone.`,
    )) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : "Could not delete this user.";
        throw new Error(message);
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not delete this user.");
    } finally {
      setPending(false);
    }
  }

  return <div className="user-actions-cell">
    <div className="user-action-buttons">
      <button
        className="button secondary user-action-button"
        disabled={pending}
        onClick={updateSuspension}
        type="button"
      >
        {pending ? "Working..." : suspended ? "Reactivate" : "Suspend"}
      </button>
      <button
        className="button danger user-action-button"
        disabled={pending}
        onClick={deleteUser}
        type="button"
      >
        Delete
      </button>
    </div>
    {error ? <small className="user-action-error" role="alert">{error}</small> : null}
  </div>;
}
