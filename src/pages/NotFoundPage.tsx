import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page-width not-found">
      <span>404</span>
      <h1>We couldn’t find that page</h1>
      <p>The link may be outdated, or the sample item may have moved.</p>
      <Link className="button button--primary" to="/"><ArrowLeft aria-hidden="true" size={18} /> Return home</Link>
    </div>
  );
}
