import { ArrowUpRight, Globe, GraduationCap, Youtube } from "lucide-react";

export const staffLinks = [
  { title: "Bethlehem Inn Website", description: "Official Bethlehem Inn public website.", href: "https://bethleheminn.org/", icon: Globe },
  { title: "Bethlehem Inn YouTube", description: "Official Bethlehem Inn Bend YouTube page.", href: "https://www.youtube.com/@BethlehemInnBend", icon: Youtube },
  { title: "Onboarding Portal", description: "Bethlehem Inn staff onboarding and training portal.", href: "https://bionboarding.netlify.app/", icon: GraduationCap },
] as const;

export function LinksPage() {
  return (
    <div className="page-width page-stack links-page">
      <header className="page-header">
        <h1>Links</h1>
        <p>Official Bethlehem Inn destinations, all in one place.</p>
      </header>
      <ul className="staff-links" aria-label="Bethlehem Inn links">
        {staffLinks.map(({ title, description, href, icon: Icon }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="staff-link">
              <span className="staff-link__icon"><Icon aria-hidden="true" size={26} /></span>
              <span className="staff-link__copy"><strong>{title}</strong><span>{description}</span></span>
              <ArrowUpRight aria-hidden="true" size={21} />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
