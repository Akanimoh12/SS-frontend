"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { fetchMyInvoiceReports, type InvoiceReport } from "@/lib/api";

const STATUS_BADGE_COLORS: Record<
  InvoiceReport["status"],
  { bg: string; text: string }
> = {
  pending: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  approved: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-300",
  },
  rejected: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
  },
  needs_more_info: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
  },
};

function StatusBadge({ status }: { status: InvoiceReport["status"] }) {
  const colors = STATUS_BADGE_COLORS[status];
  const label =
    status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    forged_invoice: "Forged Invoice",
    duplicate_listing: "Duplicate Listing",
    issuer_misrepresentation: "Issuer Misrepresentation",
    other: "Other",
  };
  return (
    <span className="text-sm text-muted-foreground">
      {labels[category] || category}
    </span>
  );
}

export default function MyReportsPage() {
  const { jwt } = useAuth();
  const {
    data: reports,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => fetchMyInvoiceReports(jwt || undefined),
    enabled: Boolean(jwt),
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">My Reports</h1>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
            <p className="text-muted-foreground">Failed to load reports</p>
          </CardContent>
        </Card>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No reports submitted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card
              key={report.report_id}
              data-testid={`report-${report.report_id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-muted-foreground">
                      Ref: {report.report_id}
                    </p>
                    <CategoryBadge category={report.reason} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted:{" "}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
              </CardHeader>
              {report.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
