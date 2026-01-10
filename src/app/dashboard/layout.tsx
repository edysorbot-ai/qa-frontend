import { AppSidebar } from "@/components/layout/app-sidebar";
import { PendingReferralHandler } from "@/components/pending-referral-handler";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PendingReferralHandler />
      <AppSidebar>{children}</AppSidebar>
    </>
  );
}
