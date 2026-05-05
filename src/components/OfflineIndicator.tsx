"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, Cloud } from "lucide-react";

/**
 * Detects online/offline state and shows a small banner when offline.
 * The banner auto-dismisses ~5s after the user goes back online.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showRecoveredBanner, setShowRecoveredBanner] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOnline(false);
      setShowRecoveredBanner(false);
    };
    const goOnline = () => {
      setOnline(true);
      setShowRecoveredBanner(true);
      setTimeout(() => setShowRecoveredBanner(false), 5000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (online && !showRecoveredBanner) return null;

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-300/8 p-3 flex items-start gap-3"
        >
          <CloudOff className="h-4 w-4 shrink-0 mt-0.5 text-amber-200/90" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-mono uppercase tracking-[0.18em] text-amber-200/90">
              Offline mode
            </p>
            <p className="mt-0.5 text-[12px] text-white/65 leading-relaxed">
              Sky positions, planets, and bright satellites work fine. Predictions for less-tracked satellites may be slightly stale until you reconnect.
            </p>
          </div>
        </motion.div>
      )}
      {showRecoveredBanner && (
        <motion.div
          key="online"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="overflow-hidden rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-3 flex items-center gap-3"
        >
          <Cloud className="h-4 w-4 shrink-0 text-emerald-200/90" />
          <p className="text-[12px] text-emerald-100/85 font-mono uppercase tracking-[0.18em]">
            Back online · refreshing data
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
