import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { freshReaderUrl, loadReaderReceipt } from "../lib/delivery";
import "./ReaderFreshness.css";

/** Preserve the static GitHub/build contract; never silently leave an open Reader on an old release. */
export function ReaderFreshness() {
  const location = useLocation();
  const [available, setAvailable] = useState<string | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let active = true;
    const check = async (navigation = false) => {
      try {
        const receipt = await loadReaderReceipt();
        if (active && receipt.buildId !== import.meta.env.VITE_READER_BUILD_ID) {
          const url = freshReaderUrl(window.location.href, import.meta.env.VITE_READER_BUILD_ID, receipt.buildId);
          if (navigation && url) window.location.replace(url);
          else setAvailable(receipt.buildId);
        }
      } catch { /* A failed freshness check never removes already loaded content. */ }
    };
    void check(true);
    const onFocus = () => { if (document.visibilityState === "visible") void check(); };
    const timer = window.setInterval(onFocus, 60_000);
    document.addEventListener("visibilitychange", onFocus);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", onFocus); };
  }, [location.pathname, location.search]);
  return available ? <div className="reader-freshness" role="status">New Staff Hub updates are available. <button className="button button--secondary" onClick={() => {
    const url = freshReaderUrl(window.location.href, import.meta.env.VITE_READER_BUILD_ID, available);
    if (url) window.location.replace(url);
    else window.location.reload();
  }}>Load latest updates</button></div> : null;
}
