import { Suspense, useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FileQuestion,
  Hammer,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquareQuote,
  Settings,
} from 'lucide-react';
import styles from './AdminLayout.module.css';
import { Seo } from '@/lib/seo/Seo';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { adminLogout, adminMe, getAntiforgeryToken } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import type { AdminUser } from '@/lib/api/types';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/estimate-requests', label: 'Estimate requests', icon: Inbox, end: false },
  { to: '/admin/projects', label: 'Projects', icon: Hammer, end: false },
  { to: '/admin/services', label: 'Services', icon: Settings, end: false },
  { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote, end: false },
  { to: '/admin/faqs', label: 'FAQs', icon: FileQuestion, end: false },
  { to: '/admin/service-areas', label: 'Service areas', icon: MapPin, end: false },
  { to: '/admin/site-settings', label: 'Site settings', icon: Settings, end: false },
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

  const signOut = async () => {
    try {
      const { token } = await getAntiforgeryToken();
      await adminLogout(token);
    } catch {
      /* Signing out locally regardless is the safer outcome. */
    }
    navigate('/admin/login', { replace: true });
  };

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
          title="We could not verify your session"
          description="The admin API did not respond. Check that the server is running and try again."
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <div className={styles.shell} data-theme="dark">
      <Seo title="Admin" description="Kellum's content administration." path="/admin" noIndex />

      <a className={styles.skipLink} href="#admin-main">
        Skip to content
      </a>

      <header className={styles.topbar}>
        <NavLink to="/admin" className={styles.brand}>
          <LogoMark size={26} still />
          <span className={styles.brandText}>Kellum&rsquo;s Admin</span>
        </NavLink>

        <div className={styles.session}>
          {user ? <span className={styles.user}>{user.displayName || user.email}</span> : null}
          <Button variant="ghost" size="sm" onClick={signOut} iconLeft={<LogOut size={15} />}>
            Sign out
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Admin sections">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(styles.navLink, isActive && styles.navLinkActive)}
                >
                  <item.icon size={16} strokeWidth={1.7} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <NavLink to="/" className={styles.viewSite}>
            View the public site
          </NavLink>
        </nav>

        <main id="admin-main" className={styles.main} tabIndex={-1}>
          <Suspense fallback={<LoadingState label="Loading" variant="inline" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
