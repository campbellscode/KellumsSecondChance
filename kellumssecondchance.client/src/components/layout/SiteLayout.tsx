import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './SiteLayout.module.css';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileActionBar } from './MobileActionBar';
import { ScrollToTop } from './ScrollToTop';
import { LoadingState } from '@/components/ui/States';
import { Container } from '@/components/ui/Container';
import { useScrollReveal } from '@/lib/hooks/useScrollReveal';

export function SiteLayout() {
  const location = useLocation();
  // Re-scan for reveal targets whenever the route changes.
  useScrollReveal(location.pathname);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense
          fallback={
            <Container className={styles.routeFallback}>
              <LoadingState label="Loading this page" variant="detail" count={1} />
            </Container>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileActionBar />
    </div>
  );
}
