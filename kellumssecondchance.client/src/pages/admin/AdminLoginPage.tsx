import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import styles from './AdminLoginPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { adminLogin, adminMe, getAntiforgeryToken } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    const controller = new AbortController();
    adminMe(controller.signal)
      .then(() => navigate('/admin', { replace: true }))
      .catch(() => {
        /* Not signed in — stay on the form. */
      });
    return () => controller.abort();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { token } = await getAntiforgeryToken();
      await adminLogin({ email: email.trim(), password }, token);
      navigate('/admin', { replace: true });
    } catch (caught) {
      /*
       * Deliberately generic: distinguishing "no such account" from "wrong
       * password" tells an attacker which addresses are real.
       */
      if (caught instanceof ApiError && caught.isRateLimited) {
        setError('Too many attempts. Wait a minute before trying again.');
      } else if (caught instanceof ApiError && caught.status === 0) {
        setError('Could not reach the server. Check that the API is running.');
      } else {
        setError('That email address and password combination was not recognised.');
      }
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page} data-theme="dark">
      <Seo title="Admin sign in" description="Sign in to manage site content." path="/admin/login" noIndex />

      <main className={styles.card}>
        <LogoMark size={44} still className={styles.mark} />
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Staff access to estimate requests and site content.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            optionalLabel={false}
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextInput
            label="Password"
            name="password"
            type="password"
            required
            optionalLabel={false}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            loadingLabel="Signing in…"
            iconRight={<LogIn size={17} />}
          >
            Sign in
          </Button>
        </form>

        <p className={styles.note}>
          Accounts are created by an administrator from the server. There is no public sign-up.
        </p>
      </main>
    </div>
  );
}
