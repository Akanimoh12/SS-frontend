"use client";

import { useParams } from "next/navigation";
import { DebtorConfirmation } from "@/components/debtor/DebtorConfirmation";

/**
 * Public debtor confirmation landing page (#574). Lives outside the dashboard
 * route groups, so it needs no wallet connection or login.
 */
export default function DebtorConfirmationPage() {
  const params = useParams<{ token: string }>();
  return <DebtorConfirmation token={params.token ?? ""} />;
}
