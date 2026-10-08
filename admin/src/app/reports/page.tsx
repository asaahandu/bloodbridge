import { AdminPageShell, AdminPageHeading } from "@/components/admin-page";
import { SupportInbox } from "@/components/support-inbox";

export const metadata = {
  title: "Reports | BloodBridge Admin",
  description: "Review and reply to customer support conversations.",
};

export default function ReportsPage() {
  return (
    <AdminPageShell activeItem="Reports">
      <div className="dashboard-content">
        <AdminPageHeading
          eyebrow="Reports"
          title="Customer support"
          description="Review customer conversations and send replies from the BloodBridge support team."
        />
        <SupportInbox />
      </div>
    </AdminPageShell>
  );
}
