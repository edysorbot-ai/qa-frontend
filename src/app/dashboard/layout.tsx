import { AppSidebar } from "@/components/layout/app-sidebar";
import { PendingReferralHandler } from "@/components/pending-referral-handler";
import { LowCreditWarning } from "@/components/low-credit-warning";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PendingReferralHandler />
      <AppSidebar>
        <LowCreditWarning />
        {children}
      </AppSidebar>
    </>
  );
}
