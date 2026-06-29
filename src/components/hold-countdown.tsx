"use client";

import { useEffect, useState } from "react";

// Ticks down to the hold's expiry. When it hits zero it reloads so the server
// can render the "hold expired" state (and stop accepting the deposit).
export function HoldCountdown({
  expiresAtISO,
  expiredLabel,
}: {
  expiresAtISO: string;
  expiredLabel: string;
}) {
  const target = new Date(expiresAtISO).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        // Let the server re-render the expired state.
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining <= 0) {
    return <span className="font-semibold text-red-700">{expiredLabel}</span>;
  }

  const totalSec = Math.floor(remaining / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return (
    <span className="font-mono text-lg font-semibold tabular-nums" dir="ltr">
      {mm}:{ss}
    </span>
  );
}
