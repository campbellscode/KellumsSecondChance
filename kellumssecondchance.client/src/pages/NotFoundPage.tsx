import { ArrowUpRight } from 'lucide-react';
import styles from './NotFoundPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LogoMark } from '@/components/brand/Logo';

const LINKS = [
  { label: 'Our services', to: '/services' },
  { label: 'Project case studies', to: '/projects' },
  { label: 'About Kellum’s', to: '/about' },
  { label: 'Common questions', to: '/faq' },
];

export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found"
        description="That page does not exist. Here is where to go instead."
        path="/404"
        noIndex
      />

      <section className={styles.section} data-theme="dark">
        <span className={styles.grid} aria-hidden="true" />
        <Container width="narrow" className={styles.inner}>
          <LogoMark size={52} tone="onDark" className={styles.mark} />
          <Eyebrow className={styles.eyebrow}>Error 404</Eyebrow>
          <h1 className={styles.title}>This page needs a second chance too.</h1>
          <p className={styles.body}>
            The address you followed does not lead anywhere. It might have moved, or the link might
            have had a typo in it. Either way, nothing is broken on your end.
          </p>

          <div className={styles.actions}>
            <Button as="link" to="/" iconRight={<ArrowUpRight size={17} />}>
              Back to the homepage
            </Button>
            <Button as="link" to="/request-estimate" variant="secondary">
              Request an estimate
            </Button>
          </div>

          <nav className={styles.links} aria-label="Popular pages">
            <p className={styles.linksTitle}>Or try one of these</p>
            <ul>
              {LINKS.map((link) => (
                <li key={link.to}>
                  <Button as="link" to={link.to} variant="link" iconRight={<ArrowUpRight size={14} />}>
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>
    </>
  );
}
