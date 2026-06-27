// src/lib/hooks/use-offline.ts
"use client";
import { useEffect, useState } from "react";
import { useSyncStore } from "@/lib/store/sync.store";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const setStatus = useSyncStore((s) => s.setStatus);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setStatus("idle");
    }
    function handleOffline() {
      setIsOnline(false);
      setStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial state
    if (!navigator.onLine) {
      setStatus("offline");
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setStatus]);

  return { isOnline };
}
