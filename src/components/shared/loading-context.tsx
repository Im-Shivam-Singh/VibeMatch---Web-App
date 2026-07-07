"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Global loading state for API latency indication
interface LoadingState {
  pendingRequests: number;
  showIndicator: boolean;
  startRequest: () => void;
  endRequest: () => void;
}

const LoadingContext = createContext<LoadingState | null>(null);

// Latency threshold - only show indicator after this delay
const LATENCY_THRESHOLD_MS = 500;

// Global singleton for non-React access (used by api.ts)
let globalLoadingState: LoadingState | null = null;

export function setGlobalLoadingState(state: LoadingState) {
  globalLoadingState = state;
}

export function getGlobalLoadingState(): LoadingState | null {
  return globalLoadingState;
}

// Helper functions for API to use
export function trackRequestStart() {
  if (globalLoadingState) {
    globalLoadingState.startRequest();
  }
}

export function trackRequestEnd() {
  if (globalLoadingState) {
    globalLoadingState.endRequest();
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestCountRef = useRef(0);

  const startRequest = useCallback(() => {
    requestCountRef.current += 1;
    setPendingRequests(requestCountRef.current);

    // Only show indicator after latency threshold
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (requestCountRef.current > 0) {
          setShowIndicator(true);
        }
      }, LATENCY_THRESHOLD_MS);
    }
  }, []);

  const endRequest = useCallback(() => {
    requestCountRef.current = Math.max(0, requestCountRef.current - 1);
    setPendingRequests(requestCountRef.current);

    if (requestCountRef.current === 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setShowIndicator(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Set global reference for api.ts to use
  useEffect(() => {
    globalLoadingState = { pendingRequests, showIndicator, startRequest, endRequest };
    return () => {
      globalLoadingState = null;
    };
  }, [pendingRequests, showIndicator, startRequest, endRequest]);

  return (
    <LoadingContext.Provider value={{ pendingRequests, showIndicator, startRequest, endRequest }}>
      {children}
      <LatencyIndicator show={showIndicator} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    // Return a no-op fallback if context not available (e.g., during SSR)
    return {
      pendingRequests: 0,
      showIndicator: false,
      startRequest: () => {},
      endRequest: () => {},
    };
  }
  return context;
}

// The actual loading indicator component
function LatencyIndicator({ show }: { show: boolean }) {
  return (
    <>
      {show && (
        <div
          className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-3 py-2 rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium">Loading...</span>
        </div>
      )}
    </>
  );
}
