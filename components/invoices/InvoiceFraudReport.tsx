"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/context/WalletContext";
import {
  fetchInvoiceReportStatus,
  submitInvoiceReport,
  type InvoiceReportReason,
  INVOICE_REPORT_REASONS,
} from "@/lib/api";

const FRAUD_CATEGORIES: { value: InvoiceReportReason; label: string }[] = [
  { value: "forged_invoice", label: "Forged Invoice" },
  { value: "duplicate_listing", label: "Duplicate Listing" },
  { value: "issuer_misrepresentation", label: "Issuer Misrepresentation" },
  { value: "other", label: "Other" },
];

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 3;

export const invoiceReportStatusQueryKey = (
  invoiceId: string,
  wallet?: string | null,
) => ["invoice", invoiceId, "report-status", wallet] as const;

async function evidenceHash(evidence: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(evidence.trim()),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

interface UploadedFile {
  file: File;
  progress: number;
}

export function InvoiceUnderReviewBanner({ invoiceId }: { invoiceId: string }) {
  const { data } = useQuery({
    queryKey: invoiceReportStatusQueryKey(invoiceId),
    queryFn: () => fetchInvoiceReportStatus(invoiceId),
  });
  if (!data?.active_reports) return null;

  return (
    <div
      role="status"
      data-testid="invoice-under-review"
      className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <strong>Under Review.</strong> This invoice has an active investor report
      and is being reviewed.
    </div>
  );
}

export function InvoiceFraudReport({
  invoiceId,
  isInvestor,
}: {
  invoiceId: string;
  isInvestor: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirmation">("form");
  const [reason, setReason] = useState<InvoiceReportReason | "">("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [reportId, setReportId] = useState<string>("");
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: invoiceReportStatusQueryKey(invoiceId, address),
    queryFn: () => fetchInvoiceReportStatus(invoiceId, address),
    enabled: isInvestor && Boolean(address),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!address || !reason) throw new Error("Select a fraud category");
      return submitInvoiceReport(invoiceId, {
        reason,
        evidence_hash: await evidenceHash(description),
        wallet: address,
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["invoice", invoiceId, "report-status"],
      });
      setReportId(data.report_id);
      setStep("confirmation");
      toast.success("Report submitted successfully");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report",
      ),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    validateAndAddFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  };

  const validateAndAddFiles = (files: File[]) => {
    const errors: string[] = [];

    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Only PDF, PNG, and JPG files are allowed`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds 10 MB limit`);
        return;
      }
      if (uploadedFiles.length + 1 > MAX_FILES) {
        errors.push("Maximum 3 files allowed");
        return;
      }

      setUploadedFiles((prev) => [...prev, { file, progress: 100 }]);
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setStep("form");
    setReason("");
    setDescription("");
    setUploadedFiles([]);
    setReportId("");
    setOpen(false);
  };

  if (!isInvestor || !address) return null;

  if (status.data?.reported_by_wallet) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        data-testid="report-submitted"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" /> Report Submitted
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) handleReset();
        setOpen(newOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          data-testid="report-invoice"
        >
          <AlertTriangle className="mr-2 h-4 w-4" /> Report Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Report invoice</DialogTitle>
              <DialogDescription>
                Your report is confidential and will be reviewed by the platform
                team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                Fraud Category *
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as InvoiceReportReason)
                  }
                  data-testid="report-reason"
                >
                  <option value="">Select a category</option>
                  {FRAUD_CATEGORIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
                <Textarea
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="report-description"
                  placeholder="Explain why you're reporting this invoice..."
                />
                <span className="block text-right text-xs text-muted-foreground">
                  {description.length}/500
                </span>
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Evidence Files{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional, up to 3 files)
                  </span>
                </label>
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-primary/50 transition"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  data-testid="file-upload-zone"
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                    data-testid="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      Drag files here or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG up to 10 MB each
                    </p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <span className="truncate">{item.file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                onClick={() => submit.mutate()}
                disabled={!reason || submit.isPending}
                data-testid="submit-report"
              >
                {submit.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Report
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report Submitted</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Your report has been submitted</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reference Number:{" "}
                  <span
                    className="font-mono font-bold"
                    data-testid="report-reference"
                  >
                    {reportId}
                  </span>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleReset} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
