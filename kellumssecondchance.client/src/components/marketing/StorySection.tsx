import { ArrowUpRight } from 'lucide-react';
import styles from './StorySection.module.css';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { Button } from '@/components/ui/Button';
import { storySection } from '@/content/marketing';
import { editorialMedia } from '@/content/media';

/**
 * The editorial "why" section — asymmetric, image-anchored, and the first place
 * the Second Chance idea is explained rather than asserted.
 */
export function StorySection() {
  return (
    <section className={styles.section} id="the-second-chance-story" aria-labelledby="story-heading">
      <Container width="wide">
        <div className={styles.layout}>
          <div className={styles.media}>
            <div className={styles.mediaPrimary} data-photo-zoom data-reveal>
              <Photo
                image={editorialMedia.storyPortrait}
                ratio="portrait"
                zoomOnHover
                sizes="(min-width: 68rem) 34vw, 92vw"
              />
              <span className={styles.mediaTickTl} aria-hidden="true" />
            </div>
            <div className={styles.mediaSecondary} data-photo-zoom data-reveal style={{ ['--reveal-delay' as string]: '140ms' }}>
              <Photo
                image={editorialMedia.story}
                ratio="landscape"
                zoomOnHover
                sizes="(min-width: 68rem) 22vw, 60vw"
              />
            </div>
            <p className={styles.mediaCaption}>
              <span className={styles.mediaCaptionIndex}>Fig. 01</span>
              Finish carpentry and trim detail
            </p>
          </div>

          <div className={styles.copy}>
            <Eyebrow index="01">{storySection.eyebrow}</Eyebrow>
            <h2 id="story-heading" className={styles.title} data-reveal>
              {storySection.title}
            </h2>

            <div className={styles.body}>
              {storySection.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>

            <blockquote className={styles.quote}>
              <span className={styles.quoteSeam} aria-hidden="true" />
              <p>{storySection.pullQuote}</p>
            </blockquote>

            <Button as="link" to="/about" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
              More about how we work
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
