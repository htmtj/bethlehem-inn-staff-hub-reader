import { useEffect, useState } from "react";

/** Re-evaluate date eligibility while a page stays open, and when returning to the tab. */
export function useMinuteClock() {
  const [, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  // Also use the current clock on ordinary renders (for example, a just-completed publish).
  // Returning the last timer tick can misclassify a new publication as future-dated.
  return Date.now();
}
