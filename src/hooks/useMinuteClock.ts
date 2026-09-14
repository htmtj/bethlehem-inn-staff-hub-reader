import { useEffect, useState } from "react";

/** Re-evaluate date eligibility while a page stays open, and when returning to the tab. */
export function useMinuteClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return now;
}
