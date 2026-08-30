import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  FileQuestion,
  Hammer,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquareQuote,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import styles from './AdminLayout.module.css';
import { AdminFeedbackProvider } from './components/AdminFeedbackProvider';
import { useDirtyGuard } from './components/adminFeedback';
import { Seo } from '@/lib/seo/Seo';
import { LogoMark } from '@/components/brand/Logo';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { adminLogout, adminMe } from '@/lib/api/endpoints';
import { antiforgeryToken, clearAntiforgeryToken } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { cn } from '@/lib/cn';
import type { AdminUser } from '@/lib/api/types';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/estimate-requests', label: 'Estimate requests', icon: Inbox, end: false },
  { to: '/admin/projects', label: 'Projects', icon: Hammer, end: false },
  { to: '/admin/services', label: 'Services', icon: Sparkles, end: false },
  { to: '/admin/testimonials', label: 'Reviews', icon: MessageSquareQuote, end: false },
  { to: '/admin/faqs', label: 'Questions', icon: FileQuestion, end: false },
  { to: '/admin/service-areas', label: 'Service areas', icon: MapPin, end: false },
  { to: '/admin/site-settings', label: 'Business details', icon: Settings, end: false },
];

/**
 * Protected admin shell.
 *
 * Authorisation is enforced server-side on every /api/admin endpoint; this
 * client check only decides what to render. A 401/403 from `me` redirects to
 * the sign-in page rather than showing an empty console.
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [attempt, setAttempt] = useState(0);

  /*
   * The session probe lives entirely inside the effect and only sets state from
   * its async callbacks — no synchronous setState during the effect body, so no
   * cascading render. `retry` bumps a nonce to run it again.
   *
   * This check only decides what to RENDER. Authorisation is enforced on the
   * server for every /api/admin endpoint regardless of what happens here.
   */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adminMe(controller.signal)
      .then((me) => {
        if (!active) return;
        setUser(me);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (error instanceof ApiError && error.isUnauthorized) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setState('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [navigate, attempt]);

  const retry = useCallback(() => {
    setState('checking');
    setAttempt((n) => n + 1);
  }, []);

  if (state === 'checking') {
    return (
      <div className={styles.centred} data-theme="dark">
        <LoadingState label="Checking your session" variant="inline" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.centred} data-theme="dark">
        <ErrorState
          title="We could not sign you in just now"
          description="Your website did not answer. Check your internet connection and try again — if it keeps happening, get in touch with whoever looks after the site."
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <AdminFeedbackProvider>
      <AdminShell user={user} />
    </AdminFeedbackProvider>
  );
}

/**
 * The shell proper.
 *
 * Split out so it sits INSIDE the feedback provider and can therefore use
 * `useDirtyGuard()` to intercept navigation while a form has unsaved work.
 */
function AdminShell({ user }: { user: AdminUser | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const guard = useDirtyGuard();

  /*
   * The drawer's open state is scoped to the route it was opened on, so any
   * navigation — a link, or the browser's Back button — closes it without an
   * effect that would set state during render and cascade.
   */
  const [menu, setMenu] = useState({ open: false, path: location.pathname });
  const menuOpen = menu.open && menu.path === location.pathname;
  const setMenuOpen = useCallback(
    (open: boolean) => setMenu({ open, path: location.pathname }),
    [location.pathname],
  );

  const menuButton = useRef<HTMLButtonElement>(null);

  useScrollLock(menuOpen);

  /*
   * The drawer is a small-screen affordance and CSS hides it from 64rem up.
   * Without this, opening it on a phone and then widening the window (or
   * rotating a tablet) would leave `menuOpen` true: no visible drawer, but the
   * page still scroll-locked behind it.
   */
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 64rem)');
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, [setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, setMenuOpen]);

  /*
   * Every link in the shell goes through the dirty guard. Without this, the
   * browser-level beforeunload prompt would cover a reload but not a click on
   * "Projects" — which is how work actually gets lost in a single-page console.
   */
  const guardedNavigate = (to: string) => (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    guard.confirmDiscard(() => navigate(to));
  };

  const signOut = () => {
    guard.confirmDiscard(() => {
      void (async () => {
        try {
          await adminLogout(await antiforgeryToken());
        } catch {
          /* Signing out locally regardless is the safer outcome. */
        }
        clearAntiforgeryToken();
        navigate('/admin/login', { replace: true });
      })();
    });
  };

  const navList = (
    <ul className={styles.navList}>
      {NAV.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={guardedNavigate(item.to)}
            className={({ isActive }) => cn(styles.navLink, isActive && styles.navLinkActive)}
          >
            <item.icon size={16} strokeWidth={1.7} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.shell} data-theme="dark">
      <Seo title="Admin" description="Kellum’s content administration." path="/admin" noIndex />

      <a className={styles.skipLink} href="#admin-main">
        Skip to content
      </a>

      <header className={styles.topbar}>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-drawer"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span className="u-visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>

        <NavLink to="/admin" className={styles.brand} onClick={guardedNavigate('/admin')}>
          <LogoMark size={24} tone="onDark" />
          <span className={styles.brandText}>Kellum&rsquo;s Admin</span>
        </NavLink>

        <div className={styles.session}>
          {user ? <span className={styles.user}>{user.displayName || user.email}</span> : null}
          <a className={styles.viewSiteTop} href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            <span className={styles.viewSiteLabel}>View site</span>
          </a>
          <button type="button" className={styles.signOut} onClick={signOut}>
            <LogOut size={15} aria-hidden="true" />
            <span className={styles.signOutLabel}>Sign out</span>
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Admin sections">
          {navList}
          <a className={styles.viewSite} href="/" target="_blank" rel="noreferrer">
            View the public site
          </a>
        </nav>

        {/*
          The drawer is display:none by default and only shown by .drawerOpen.
          Visibility must be opt-in: a `display` value on the base class would
          beat the user-agent [hidden] rule and leave it permanently on screen.
        */}
        <div
          id="admin-nav-drawer"
          className={cn(styles.drawer, menuOpen && styles.drawerOpen)}
          hidden={!menuOpen}
        >
          <nav aria-label="Admin sections">{navList}</nav>
        </div>
        {menuOpen ? (
          <button
            type="button"
            className={styles.scrim}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main id="admin-main" className={styles.main} tabIndex={-1}>
          <Suspense fallback={<LoadingState label="Loading" variant="inline" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
