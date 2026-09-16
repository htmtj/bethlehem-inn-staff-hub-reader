import { ArrowUpRight, Globe, GraduationCap, Youtube } from "lucide-react";

import { staffLinks } from "../lib/staffLinks";
export { staffLinks } from "../lib/staffLinks";
const icons = [Globe, Youtube, GraduationCap];

export function LinksPage() {
  return (
    <div className="page-width page-stack links-page">
      <header className="page-header">
        <h1>Links</h1>
        <p>Official Bethlehem Inn destinations, all in one place.</p>
      </header>
      <ul className="staff-links" aria-label="Bethlehem Inn links">
        {staffLinks.map(({ title, description, href }, index) => { const Icon = icons[index]; return (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="staff-link">
              <span className="staff-link__icon"><Icon aria-hidden="true" size={26} /></span>
              <span className="staff-link__copy"><strong>{title}</strong><span>{description}</span></span>
              <ArrowUpRight aria-hidden="true" size={21} />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          </li>
        ); })}
      </ul>
    </div>
  );
}
