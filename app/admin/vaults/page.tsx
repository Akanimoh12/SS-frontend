"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VaultReconciliationView } from "@/components/admin/VaultReconciliationView";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminRole } from "@/lib/adminAuth";

/** Admin-only route for issue #596. */
export default function VaultsPage() {
  const { jwt, isConnecting } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isConnecting) return;
    setIsAdmin(hasAdminRole(jwt));
  }, [jwt, isConnecting]);

  useEffect(() => {
    if (isAdmin === false) router.replace("/investor");
  }, [isAdmin, router]);

  if (isConnecting || isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <main className="container mx-auto flex justify-center px-4 py-16" data-testid="vaults-denied">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-3 pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold">Access Denied</h1>
            <p className="text-sm text-muted-foreground">
              Connect an admin wallet to view vault reconciliation.
            </p>
            <Link href="/investor" className="text-sm text-primary hover:underline">
              Back to portfolio
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Vaults</h1>
        <p className="text-sm text-muted-foreground">
          Per-invoice vault balances checked against the contract holding.
        </p>
      </div>
      <VaultReconciliationView />
    </main>
  );
}
