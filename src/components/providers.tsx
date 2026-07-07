"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoadingProvider } from "@/components/shared/loading-context";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Never auto-refetch - only on explicit invalidation
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false, // Don't refetch when component remounts
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </QueryClientProvider>
  );
}
