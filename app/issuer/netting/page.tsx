"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NettingPage } from "@/components/issuers/NettingPage";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Issuer-only netting route for issue #595. */
export default function IssuerNettingPage() {
  usePageTitle("Netting agreements");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) return null;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Issuer netting</h1>
      <NettingPage />
    </main>
  );
}
