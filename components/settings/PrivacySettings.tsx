"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cancelAccountDeletion, requestAccountDeletion, type DeletionBlockingReason } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useDataExport } from "@/hooks/useDataExport";

const DELETION_CONFIRMATION_PHRASE = "delete my account";

export function PrivacySettings() {
  const { jwt } = useAuth();

  if (!jwt) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect your wallet to manage privacy settings.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <DataExportCard />
      <AccountDeletionCard token={jwt} />
    </div>
  );
}

function DataExportCard() {
  const { status, downloadUrl, expiresAt, isLoading, request, error } = useDataExport();
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <Card data-testid="data-export-card">
      <CardHeader>
        <CardTitle>Data export</CardTitle>
        <CardDescription>Download a copy of your personal data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Export failed"}
            </AlertDescription>
          </Alert>
        )}

        {status === "pending" && (
          <Alert data-testid="export-pending">
            <AlertDescription>Your data export is being prepared...</AlertDescription>
          </Alert>
        )}

        {status === "ready" && downloadUrl && !isExpired && (
          <Alert data-testid="export-ready">
            <AlertDescription>
              Your data export is ready.
              {expiresAt && (
                <span> Expires {new Date(expiresAt).toLocaleString()}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isExpired && (
          <Alert data-testid="export-expired">
            <AlertDescription>Download link expired. Request a new export.</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {status === "ready" && downloadUrl && !isExpired ? (
            <Button asChild>
              <a href={downloadUrl} download>
                Download export
              </a>
            </Button>
          ) : (
            <Button onClick={() => request()} disabled={isLoading || status === "pending"}>
              {status === "pending" ? "Pending..." : "Request export"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountDeletionCard({ token }: { token: string }) {
  const [showForm, setShowForm] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [pendingGracePeriodEnd, setPendingGracePeriodEnd] = useState<string | null>(null);
  const [blockingReasons, setBlockingReasons] = useState<DeletionBlockingReason[]>([]);

  const request = useMutation({
    mutationFn: () => requestAccountDeletion(token),
    onSuccess: (data) => {
      setPendingGracePeriodEnd(data.grace_period_end);
      setShowForm(false);
      setConfirmPhrase("");
      toast.success("Account deletion requested. You have 14 days to cancel.");
    },
    onError: (err: any) => {
      if (err.status === 409 && err.blocking_reasons) {
        setBlockingReasons(err.blocking_reasons);
      } else {
        toast.error("Failed to request account deletion");
      }
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelAccountDeletion(token),
    onSuccess: () => {
      setPendingGracePeriodEnd(null);
      setBlockingReasons([]);
      toast.success("Deletion cancelled. Your account is restored.");
    },
    onError: () => {
      toast.error("Failed to cancel deletion");
    },
  });

  const phraseIsCorrect = confirmPhrase === DELETION_CONFIRMATION_PHRASE;
  const daysRemaining = pendingGracePeriodEnd
    ? Math.ceil((new Date(pendingGracePeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card data-testid="account-deletion-card">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>Permanently delete your account and all associated data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockingReasons.length > 0 && (
          <Alert variant="destructive" data-testid="deletion-blocked">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Cannot delete account. Resolve these first:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {blockingReasons.map((r, i) => (
                    <li key={i}>
                      {r.reason}
                      {r.details && ` — ${r.details}`}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {pendingGracePeriodEnd && (
          <Alert data-testid="deletion-pending">
            <AlertDescription>
              <div className="space-y-3">
                <p>
                  Your account deletion is scheduled. You have <strong>{daysRemaining} days</strong> to cancel.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  data-testid="cancel-deletion-btn"
                >
                  {cancel.isPending ? "Cancelling..." : "Cancel deletion"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!pendingGracePeriodEnd && blockingReasons.length === 0 && !showForm && (
          <Button variant="destructive" onClick={() => setShowForm(true)}>
            Request deletion
          </Button>
        )}

        {showForm && !pendingGracePeriodEnd && (
          <div className="space-y-4 rounded-md border p-4">
            <Alert variant="destructive">
              <AlertDescription>
                This will permanently delete your account and all data. This cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-phrase">
                Type the confirmation phrase to continue:
              </Label>
              <p className="text-sm font-mono text-muted-foreground">
                {DELETION_CONFIRMATION_PHRASE}
              </p>
              <Input
                id="confirm-phrase"
                placeholder="Type confirmation phrase"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                data-testid="deletion-confirm-input"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => request.mutate()}
                disabled={!phraseIsCorrect || request.isPending}
                data-testid="submit-deletion-btn"
              >
                {request.isPending ? "Submitting..." : "Delete my account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setConfirmPhrase("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
