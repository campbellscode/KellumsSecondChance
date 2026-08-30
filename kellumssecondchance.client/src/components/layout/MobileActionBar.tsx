import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Phone } from 'lucide-react';
import styles from './MobileActionBar.module.css';
import { useSiteContent } from '@/lib/siteContentContext';

/**
 * Sticky mobile contact bar.
 *
 * Hidden on the estimate flow itself, where it would compete with the form's
 * own actions. Falls back to a single full-width estimate link when the
 * business has not supplied a phone number.
 */
export function MobileActionBar() {
  const { phone } = useSiteContent();
  const { pathname } = useLocation();

  if (pathname.startsWith('/request-estimate') || pathname.startsWith('/admin')) return null;

  return (
    <div className={styles.bar}>
      {phone ? (
        <a className={styles.call} href={phone.href}>
          <Phone size={17} strokeWidth={2} aria-hidden="true" />
          <span>Call us</span>
        </a>
      ) : null}
      <Link className={styles.estimate} to="/request-estimate">
        <MessageSquareText size={17} strokeWidth={2} aria-hidden="true" />
        <span>Request an Estimate</span>
      </Link>
    </div>
  );
}
