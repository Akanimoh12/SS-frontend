"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  pollDataExportStatus,
  requestDataExport,
  type DataExportStatus,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const DATA_EXPORT_QUERY_KEY = ["data-export", "status"] as const;

export function useDataExport() {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Poll status
  const pollQuery = useQuery({
    queryKey: DATA_EXPORT_QUERY_KEY,
    queryFn: () => pollDataExportStatus(jwt || undefined),
    enabled: isPolling && !!jwt,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "ready" || data?.status === "failed") {
        setIsPolling(false);
        return false;
      }
      return data?.polling_interval_ms ?? 5000;
    },
  });

  // Request export
  const requestMutation = useMutation({
    mutationFn: () => requestDataExport(jwt || undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(DATA_EXPORT_QUERY_KEY, data);
      if (data.status === "pending") {
        setIsPolling(true);
      }
    },
    onError: () => {
      toast.error("Failed to request data export");
    },
  });

  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    status: pollQuery.data?.status || null,
    downloadUrl: pollQuery.data?.download_url,
    expiresAt: pollQuery.data?.expires_at,
    isLoading: requestMutation.isPending || (isPolling && pollQuery.isLoading),
    isPolling,
    error: pollQuery.error || requestMutation.error,
    request: () => requestMutation.mutate(),
  };
}
