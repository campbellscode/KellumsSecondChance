import styles from './WhyKellums.module.css';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { whyKellums } from '@/content/marketing';

interface WhyKellumsProps {
  /** Drafting index shown beside the eyebrow; the host page owns the numbering. */
  eyebrowIndex?: string;
}

/**
 * The trust section.
 *
 * Every statement is about conduct — showing up, communicating, cleaning up —
 * because those are promises the business can keep. There are no guarantees,
 * certifications or superlatives here that have not been verified.
 */
export function WhyKellums({ eyebrowIndex }: WhyKellumsProps = {}) {
  return (
    <section className={styles.section} aria-labelledby="why-heading">
      <Container width="wide">
        <SectionHeading
          eyebrow="Why Kellum’s"
          eyebrowIndex={eyebrowIndex}
          id="why-heading"
          title="Craftsmanship with purpose. Standards without exceptions."
          lead="We believe in potential, and we believe opportunity and responsibility belong together. Respect, accountability and pride apply to everyone who represents Kellum’s."
          size="lg"
        />

        <ul className={styles.list}>
          {whyKellums.map((item, index) => (
            <li
              className={styles.item}
              key={item.title}
              data-reveal
              style={{ ['--reveal-delay' as string]: `${(index % 3) * 80}ms` }}
            >
              <span className={styles.number} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.icon}>
                <Icon name={item.icon} size={21} strokeWidth={1.5} />
              </span>
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.description}>{item.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
