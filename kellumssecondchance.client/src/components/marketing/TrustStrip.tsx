import styles from './TrustStrip.module.css';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Container';
import { Roofline } from '@/components/brand/Roofline';
import { trustPoints } from '@/content/marketing';

/**
 * The credibility band directly under the hero.
 *
 * Every item is a statement about how the work is done, not a claim about
 * awards, years or customer counts that the business has not verified.
 */
export function TrustStrip() {
  return (
    <section className={styles.strip} aria-label="How we work">
      <Container width="wide">
        <Roofline tone="muted" className={styles.divider} />
        <ul className={styles.list}>
          {trustPoints.map((point, index) => (
            <li
              className={styles.item}
              key={point.title}
              data-reveal
              style={{ ['--reveal-delay' as string]: `${index * 70}ms` }}
            >
              <span className={styles.icon}>
                <Icon name={point.icon} size={20} strokeWidth={1.5} />
              </span>
              <span className={styles.body}>
                <span className={styles.title}>{point.title}</span>
                <span className={styles.description}>{point.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
