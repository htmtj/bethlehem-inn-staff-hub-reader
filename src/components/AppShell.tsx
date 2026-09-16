import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Menu, Search, ShieldCheck, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { SearchDialog } from "./SearchDialog";
import { ReaderFreshness } from "./ReaderFreshness";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Updates", href: "/news" },
  { label: "Calendar", href: "/upcoming" },
  { label: "Departments", href: "/departments" },
  { label: "Links", href: "/links" },
];

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef<HTMLButtonElement>(null);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [menuOpen]);

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
      <header aria-hidden={searchOpen} className="site-header" inert={searchOpen ? true : undefined}>
        <div className="site-header__inner">
          <Link aria-label="Bethlehem Inn Staff Hub home" className="brand" to="/">
            <img alt="" height="52" src="/brand/bi-logo.png" width="52" />
            <span>Bethlehem Inn <strong>Staff Hub</strong></span>
          </Link>
          <nav id="primary-navigation" aria-label="Primary navigation" className={menuOpen ? "primary-nav is-open" : "primary-nav"}>
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
            <Link className="mobile-admin-link" to="/admin">
              <ShieldCheck aria-hidden="true" size={17} /> Staff Admin
            </Link>
          </nav>
          <div className="header-actions">
            <Link aria-label="Staff Admin" className="header-admin-link" title="Staff Admin" to="/admin">
              <ShieldCheck aria-hidden="true" size={17} /> <span>Staff Admin</span>
            </Link>
            <button aria-label="Search the Staff Hub" className="header-search" onClick={() => setSearchOpen(true)} type="button">
              <Search aria-hidden="true" size={20} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="mobile-menu-button"
              ref={menuButton}
              onClick={() => setMenuOpen((value) => !value)}
              onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}
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
      <main aria-hidden={searchOpen} id="main-content" inert={searchOpen ? true : undefined}><ReaderFreshness />{children}</main>
      <footer aria-hidden={searchOpen} className="site-footer" inert={searchOpen ? true : undefined}>
        <div className="page-width site-footer__inner">
          <img alt="Bethlehem Inn — shelter, help, hope" src="/brand/bi-wordmark.jpg" />
          <p>Staff updates, events, and useful links.</p>
        </div>
      </footer>
      <SearchDialog onClose={closeSearch} open={searchOpen} />
    </div>
  );
}
