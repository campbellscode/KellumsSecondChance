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

interface TransformationFeatureProps { projects: readonly ProjectDetail[]; }

interface Slide {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly before: ProjectDetail['images'][number];
  readonly after: ProjectDetail['images'][number];
  readonly problem: string;
  readonly approach: string;
  readonly result: string;
  readonly isExample: boolean;
}

const exampleImage = (
  id: number,
  kind: 'Before' | 'After',
  src: string,
  width: number,
  height: number,
  alt: string,
) => ({
  id,
  kind,
  src,
  width,
  height,
  alt,
  caption: null,
  displayOrder: kind === 'Before' ? 0 : 1,
  pairKey: 'comparison',
}) satisfies ProjectDetail['images'][number];

const EXTERIOR_EXAMPLES: readonly Slide[] = [
  {
    slug: 'example-roofing',
    category: 'Roofing',
    title: 'The Roof That Had Taken Enough',
    before: exampleImage(-1, 'Before', '/media/transformations/roofing-before.png', 1536, 1024, 'Example home exterior with a heavily weathered roof.'),
    after: exampleImage(-2, 'After', '/media/transformations/roofing-after.png', 1536, 1024, 'Same example home exterior shown with a refreshed dark roof.'),
    problem: 'The example begins with weathered roofing and a roofline whose age dominates the exterior.',
    approach: 'The transformation focuses on replacing the deteriorated visible surfaces and restoring a crisp roofline.',
    result: 'The refreshed roof gives the whole exterior a cleaner, more settled appearance.',
    isExample: true,
  },
  {
    slug: 'example-siding',
    category: 'Siding',
    title: 'The Exterior That Lost Its Edge',
    before: exampleImage(-3, 'Before', '/media/transformations/siding-before.png', 1536, 1024, 'Example home with faded and weathered exterior siding.'),
    after: exampleImage(-4, 'After', '/media/transformations/siding-after.png', 1536, 1024, 'Same example home shown with clean, refreshed siding and trim.'),
    problem: 'The example begins with faded siding and uneven surfaces that leave the elevation looking tired.',
    approach: 'The transformation focuses on a consistent siding treatment and stronger definition around the openings.',
    result: 'The exterior reads as one composed elevation again—cleaner, calmer and better defined.',
    isExample: true,
  },
  {
    slug: 'example-porches-railings',
    category: 'Porches & Railings',
    title: 'The Entrance That Needed Another Chance',
    before: exampleImage(-5, 'Before', '/media/transformations/porches-railings-before.png', 1536, 1024, 'Example front porch with aged dark railings and supports.'),
    after: exampleImage(-6, 'After', '/media/transformations/porches-railings-after.png', 1536, 1024, 'Same example front porch shown with refreshed white railings and supports.'),
    problem: 'The example begins with worn railings and an entrance whose details no longer complement the house.',
    approach: 'The transformation focuses on a refreshed railing treatment and cleaner architectural edges.',
    result: 'The entrance feels deliberate again, with a stronger frame and a more welcoming approach.',
    isExample: true,
  },
  {
    slug: 'example-decks',
    category: 'Decks',
    title: 'The Backyard That Stopped Being Used',
    before: exampleImage(-7, 'Before', '/media/transformations/deck-before.png', 768, 929, 'Example backyard deck with heavily weathered boards and railings.'),
    after: exampleImage(-8, 'After', '/media/transformations/deck-after.png', 768, 929, 'Same example backyard deck shown with refreshed decking and railings.'),
    problem: 'The example begins with weathered boards and railings that make the outdoor space feel neglected.',
    approach: 'The transformation focuses on rebuilding the visible deck surfaces into one clean, coherent setting.',
    result: 'The backyard gains an outdoor space that looks cared for and ready to be used again.',
    isExample: true,
  },
] as const;

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
      isExample: project.isSampleContent,
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
export function TransformationFeature({ projects }: TransformationFeatureProps) {
  const slides = useMemo(() => {
    const realProjects = projects.filter((project) => !project.isSampleContent);
    return realProjects.length > 0 ? toSlides(realProjects).slice(0, 4) : EXTERIOR_EXAMPLES;
  }, [projects]);
  const showingExamples = slides.every((slide) => slide.isExample);
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
          title="Drag the seam. See what the outside can become."
          lead="Weather, age and damage can change how a home looks and performs. These examples show how thoughtful exterior work can give it a second chance."
          size="lg"
          action={
            <Button as="link" to="/projects" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
              All transformations
            </Button>
          }
        />

        {showingExamples ? (
          <SampleContentNotice context="comparisons" className={styles.notice} />
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
              ratio="classic"
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

            {!current.isExample ? (
              <Button
                as="link"
                to={`/projects/${current.slug}`}
                variant="link"
                iconRight={<ArrowUpRight size={16} />}
              >
                Read the full case study
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
