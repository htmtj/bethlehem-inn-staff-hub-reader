import { useCallback, useEffect, useState, type PropsWithChildren } from "react";
import { Menu, Search, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { SearchDialog } from "./SearchDialog";

const navItems = [
  { label: "Home", href: "/" },
  { label: "News", href: "/news" },
  { label: "Upcoming", href: "/upcoming" },
  { label: "Departments", href: "/departments" },
  { label: "Resources", href: "/resources" },
];

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="site-shell">
      <div aria-hidden={searchOpen} className="beta-bar" inert={searchOpen ? true : undefined}>Phase 1 beta · Sample content only</div>
      <header aria-hidden={searchOpen} className="site-header" inert={searchOpen ? true : undefined}>
        <div className="site-header__inner">
          <Link aria-label="Bethlehem Inn Staff Hub home" className="brand" to="/">
            <img alt="" height="52" src="/brand/bi-logo.png" width="52" />
            <span>Bethlehem Inn <strong>Staff Hub</strong></span>
          </Link>
          <nav aria-label="Primary navigation" className={menuOpen ? "primary-nav is-open" : "primary-nav"}>
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
                end={item.href === "/"}
                key={item.href}
                to={item.href}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button className="header-search" onClick={() => setSearchOpen(true)} type="button">
              <Search aria-hidden="true" size={20} />
              <span>Search the Staff Hub</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="mobile-menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              <span>{menuOpen ? "Close" : "Menu"}</span>
            </button>
            <button
              aria-label="Search"
              className="mobile-search-button"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <Search aria-hidden="true" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </header>
      <main aria-hidden={searchOpen} id="main-content" inert={searchOpen ? true : undefined}>{children}</main>
      <footer aria-hidden={searchOpen} className="site-footer" inert={searchOpen ? true : undefined}>
        <div className="page-width site-footer__inner">
          <img alt="Bethlehem Inn — shelter, help, hope" src="/brand/bi-wordmark.jpg" />
          <p>Phase 1 beta · Sample content only</p>
          <p>Reader experience proof — no confidential information.</p>
        </div>
      </footer>
      <SearchDialog onClose={closeSearch} open={searchOpen} />
    </div>
  );
}
