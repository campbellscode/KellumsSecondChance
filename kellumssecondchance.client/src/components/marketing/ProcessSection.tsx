import { ArrowUpRight } from 'lucide-react';
import styles from './ProcessSection.module.css';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { processSteps } from '@/content/marketing';

interface ProcessSectionProps {
  /**
   * Drafting index shown beside the eyebrow. The host page owns the numbering,
   * because this section appears at a different position on each page.
   */
  eyebrowIndex?: string;
}

/**
 * The five-step process, drawn as a build sequence: a copper line runs down the
 * left, numbers sit in the margin like drawing callouts, and each step reveals
 * as it enters the viewport.
 */
export function ProcessSection({ eyebrowIndex }: ProcessSectionProps = {}) {
  return (
    <section className={styles.section} data-theme="dark" aria-labelledby="process-heading">
      <span className={styles.grid} aria-hidden="true" />
      <Container width="wide">
        <SectionHeading
          eyebrow="How it goes"
          eyebrowIndex={eyebrowIndex}
          id="process-heading"
          title={
            <>
              Five steps, and you always
              <br />
              know which one you are on.
            </>
          }
          lead="Most renovation stress comes from not knowing what happens next. So we made that the part we are strictest about."
          size="lg"
          action={
            <Button as="link" to="/request-estimate" iconRight={<ArrowUpRight size={17} />}>
              Start at step one
            </Button>
          }
        />

        <ol className={styles.steps}>
          {processSteps.map((step, index) => (
            <li
              className={styles.step}
              key={step.number}
              data-reveal
              style={{ ['--reveal-delay' as string]: `${index * 90}ms` }}
            >
              <div className={styles.marker}>
                <span className={styles.number}>{step.number}</span>
                <span className={styles.dot} aria-hidden="true" />
              </div>
              <div className={styles.content}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
                <p className={styles.stepDetail}>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
