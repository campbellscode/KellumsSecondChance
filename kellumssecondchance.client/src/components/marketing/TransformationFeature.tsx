import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './TransformationFeature.module.css';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { cn } from '@/lib/cn';
import type { ProjectDetail } from '@/lib/api/types';

interface TransformationFeatureProps {
  projects: readonly ProjectDetail[];
  /** Renders the sample-content label when the comparisons are seeded examples. */
  isSampleContent?: boolean;
}

interface Slide {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly before: ProjectDetail['images'][number];
  readonly after: ProjectDetail['images'][number];
  readonly problem: string;
  readonly approach: string;
  readonly result: string;
}

function toSlides(projects: readonly ProjectDetail[]): Slide[] {
  const slides: Slide[] = [];
  for (const project of projects) {
    const before = project.images.find((i) => i.kind === 'Before');
    const after = project.images.find((i) => i.kind === 'After');
    if (!before || !after) continue;
    slides.push({
      slug: project.slug,
      title: project.title,
      category: project.category,
      before,
      after,
      problem: project.challenge,
      approach: project.transformation,
      result: project.outcome ?? project.summary,
    });
  }
  return slides;
}

/**
 * THE SECOND CHANCE EFFECT.
 *
 * The homepage's centrepiece: a tabbed set of before/after comparisons, each
 * with the original problem, what was done and what came of it. Seeded examples
 * are labelled via `isSampleContent`. Tabs follow the APG
 * pattern (arrow keys move, Home/End jump, only the active tab is tabbable).
 */
export function TransformationFeature({
  projects,
  isSampleContent = false,
}: TransformationFeatureProps) {
  const slides = useMemo(() => toSlides(projects), [projects]);
  const [active, setActive] = useState(0);

  if (slides.length === 0) return null;

  const current = slides[Math.min(active, slides.length - 1)];

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = slides.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (event.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`transformation-tab-${next}`)?.focus();
  };

  return (
    <section className={styles.section} data-theme="dark" aria-labelledby="transformation-heading">
      <span className={styles.grid} aria-hidden="true" />
      <Container width="wide">
        <SectionHeading
          eyebrow="The Second Chance Effect"
          eyebrowIndex="02"
          id="transformation-heading"
          title="Drag the seam. Watch a room come back."
          lead="Each of these started as a space somebody had written off. Nothing here was replaced because it was beyond saving — it was rebuilt because it was worth it."
          size="lg"
          action={
            <Button as="link" to="/projects" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
              All transformations
            </Button>
          }
        />

        {isSampleContent ? (
          <SampleContentNotice what="comparisons" className={styles.notice} />
        ) : null}

        <div className={styles.tabsWrap}>
          <div className={styles.tabs} role="tablist" aria-label="Featured transformations">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.slug}
                id={`transformation-tab-${index}`}
                role="tab"
                aria-selected={index === active}
                aria-controls="transformation-panel"
                tabIndex={index === active ? 0 : -1}
                className={cn(styles.tab, index === active && styles.tabActive)}
                onClick={() => setActive(index)}
                onKeyDown={onKeyDown}
              >
                <span className={styles.tabIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.tabLabel}>{slide.category}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={styles.panel}
          /* One panel, one stable id: an inactive tab must not reference an
             element that is not in the document. */
          id="transformation-panel"
          role="tabpanel"
          aria-labelledby={`transformation-tab-${active}`}
          tabIndex={0}
        >
          <div className={styles.sliderColumn}>
            <BeforeAfterSlider
              key={current.slug}
              before={current.before}
              after={current.after}
              label={current.title}
              initial={48}
              ratio="landscape"
              sizes="(min-width: 68rem) 56vw, 92vw"
              className={styles.slider}
            />
            <span className={styles.sliderTick} aria-hidden="true" />
          </div>

          <div className={styles.detail}>
            <p className={styles.detailCategory}>{current.category}</p>
            <h3 className={styles.detailTitle}>{current.title}</h3>

            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt className={styles.factTerm}>The problem</dt>
                <dd className={styles.factValue}>{current.problem}</dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factTerm}>What we did</dt>
                <dd className={styles.factValue}>{current.approach}</dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factTerm}>The result</dt>
                <dd className={styles.factValue}>{current.result}</dd>
              </div>
            </dl>

            <Button
              as="link"
              to={`/projects/${current.slug}`}
              variant="link"
              iconRight={<ArrowUpRight size={16} />}
            >
              Read the full case study
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
