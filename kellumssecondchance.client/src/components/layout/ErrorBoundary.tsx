import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence for a render crash.
 *
 * Shows a designed, on-brand page with a way forward rather than a blank screen
 * or a raw stack trace. The error detail is deliberately not rendered — it can
 * leak internals and means nothing to a homeowner.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept for local diagnosis; production builds strip the dev branch.
    if (import.meta.env.DEV) {
      console.error('Unhandled UI error', error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.wrap} data-theme="dark">
        <Container width="narrow" className={styles.inner}>
          <Logo layout="stacked" markSize={48} still />
          <h1 className={styles.title}>Something on our end broke.</h1>
          <p className={styles.body}>
            That is on us, not you. Reloading usually fixes it. If it keeps happening, please get in
            touch and tell us what you were trying to do — we would genuinely like to know.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => window.location.reload()}>Reload the page</Button>
            <Button as="a" href="/" variant="secondary">
              Back to the homepage
            </Button>
          </div>
        </Container>
      </div>
    );
  }
}
