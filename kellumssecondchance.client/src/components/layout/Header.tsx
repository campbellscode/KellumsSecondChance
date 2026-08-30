import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Phone, X } from 'lucide-react';
import styles from './Header.module.css';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { primaryNav } from '@/content/navigation';
import { business } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';
import { useStickyHeader } from '@/lib/hooks/useStickyHeader';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { cn } from '@/lib/cn';

export function Header() {
  const { isScrolled, isHidden } = useStickyHeader();
  const { phone } = useSiteContent();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /*
   * The drawer stores the path it was opened on rather than a plain boolean.
   * Navigating changes the path, so the drawer closes itself — no effect, and
   * no chance of a stale-open drawer on a fast route change.
   */
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const menuOpen = openedOnPath === location.pathname;

  const closeMenu = useCallback(() => setOpenedOnPath(null), []);
  const toggleMenu = useCallback(
    () => setOpenedOnPath((current) => (current === location.pathname ? null : location.pathname)),
    [location.pathname],
  );

  useScrollLock(menuOpen);

  // Escape closes and returns focus to the toggle.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeMenu();
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  // Focus trap: keep Tab inside the drawer while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        styles.header,
        isScrolled && styles.scrolled,
        isHidden && !menuOpen && styles.hidden,
        menuOpen && styles.menuOpen,
      )}
    >
      <div className={styles.bar}>
        <Link to="/" className={styles.brand} aria-label={`${business.legalName} — home`}>
          <Logo markSize={32} />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {primaryNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(styles.navLink, isActive && styles.navLinkActive)}
                >
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {phone ? (
            <a className={styles.phone} href={phone.href}>
              <Phone size={15} strokeWidth={2} aria-hidden="true" />
              <span className={styles.phoneNumber}>{phone.display}</span>
              <span className="u-visually-hidden">Call {business.legalName}</span>
            </a>
          ) : null}

          <Button as="link" to="/request-estimate" size="sm" className={styles.cta}>
            Request an Estimate
          </Button>

          <button
            type="button"
            ref={toggleRef}
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={toggleMenu}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            <span className="u-visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {/* Progress seam: the copper hairline that anchors the header. */}
      <span className={styles.seam} aria-hidden="true" />

      <div
        className={cn(styles.drawer, menuOpen && styles.drawerOpen)}
        id="site-menu"
        ref={panelRef}
        hidden={!menuOpen}
      >
        <nav aria-label="Site" className={styles.drawerNav}>
          <ul className={styles.drawerList}>
            {primaryNav.map((item, index) => (
              <li key={item.to} style={{ ['--i' as string]: index }}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(styles.drawerLink, isActive && styles.drawerLinkActive)}
                >
                  <span className={styles.drawerIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.drawerText}>
                    <span className={styles.drawerLabel}>{item.label}</span>
                    {item.description ? (
                      <span className={styles.drawerDescription}>{item.description}</span>
                    ) : null}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.drawerFooter}>
          <Button as="link" to="/request-estimate" size="lg" fullWidth>
            Request an Estimate
          </Button>
          {phone ? (
            <Button as="a" href={phone.href} variant="secondary" size="lg" fullWidth iconLeft={<Phone size={17} />}>
              {phone.display}
            </Button>
          ) : (
            <Button as="link" to="/contact" variant="secondary" size="lg" fullWidth>
              Other ways to reach us
            </Button>
          )}
          <p className={styles.drawerTagline}>{business.tagline}</p>
        </div>
      </div>

      {menuOpen ? (
        <button type="button" className={styles.scrim} onClick={closeMenu}>
          <span className="u-visually-hidden">Close menu</span>
        </button>
      ) : null}
    </header>
  );
}
