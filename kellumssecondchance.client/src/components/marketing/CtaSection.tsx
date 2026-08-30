import { ArrowUpRight, Phone } from 'lucide-react';
import styles from './CtaSection.module.css';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { editorialMedia } from '@/content/media';
import { ctaSection } from '@/content/marketing';
import { useSiteContent } from '@/lib/siteContentContext';
import { cn } from '@/lib/cn';

interface CtaSectionProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryLabel?: string;
  className?: string;
}

/** The closing conversion band. Used at the foot of every public page. */
export function CtaSection({
  eyebrow = ctaSection.eyebrow,
  title = ctaSection.title,
  body = ctaSection.body,
  primaryLabel = 'Request an Estimate',
  className,
}: CtaSectionProps) {
  const { phone } = useSiteContent();

  return (
    <section className={cn(styles.section, className)} data-theme="dark" aria-labelledby="cta-heading">
      <Photo
        image={editorialMedia.cta}
        className={styles.backdrop}
        sizes="100vw"
        imgClassName={styles.backdropImg}
      />
      <span className={styles.veil} aria-hidden="true" />
      <span className={styles.grid} aria-hidden="true" />

      <Container width="default" className={styles.inner}>
        <Eyebrow className={styles.eyebrow}>{eyebrow}</Eyebrow>
        <h2 id="cta-heading" className={styles.title} data-reveal>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>

        <div className={styles.actions}>
          <Button as="link" to="/request-estimate" size="lg" iconRight={<ArrowUpRight size={18} />}>
            {primaryLabel}
          </Button>
          {phone ? (
            <Button as="a" href={phone.href} size="lg" variant="secondary" iconLeft={<Phone size={17} />}>
              {phone.display}
            </Button>
          ) : (
            <Button as="link" to="/contact" size="lg" variant="secondary">
              Other ways to reach us
            </Button>
          )}
        </div>

        <p className={styles.reassurance}>
          No obligation, no pressure. If it turns out we are not the right people for the job, we will
          tell you that too.
        </p>
      </Container>
    </section>
  );
}
