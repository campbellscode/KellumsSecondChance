import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react';
import styles from './Hero.module.css';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { heroMedia } from '@/content/media';
import { business } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';

const SPECIALTIES = [
  'Residential Renovations',
  'Remodeling',
  'Repairs & Restoration',
  'Interior & Exterior',
] as const;

export function Hero() {
  const { phone } = useSiteContent();

  return (
    <section className={styles.hero} data-theme="dark" aria-labelledby="hero-heading">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            <span className={styles.kickerRule} aria-hidden="true" />
            {business.legalName}
          </p>

          <h1 id="hero-heading" className={styles.headline}>
            <span className={styles.headlineLine}>Your home</span>
            <span className={styles.headlineLine}>deserves a</span>
            <span className={styles.headlineAccent}>second chance.</span>
          </h1>

          <p className={styles.promise}>{business.promise}</p>

          <div className={styles.actions}>
            <Button as="link" to="/request-estimate" size="lg" iconRight={<ArrowUpRight size={18} />}>
              Request Your Estimate
            </Button>
            <Button as="link" to="/projects" size="lg" variant="secondary">
              See Our Transformations
            </Button>
          </div>

          {phone ? (
            <a className={styles.phoneLink} href={phone.href}>
              <Phone size={15} strokeWidth={2} aria-hidden="true" />
              <span>
                Or call <strong>{phone.display}</strong>
              </span>
            </a>
          ) : null}

          <ul className={styles.specialties}>
            {SPECIALTIES.map((item) => (
              <li key={item} className={styles.specialty}>
                <span className={styles.specialtyTick} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.showcase}>
          <div className={styles.sliderFrame}>
            <span className={styles.frameTickTl} aria-hidden="true" />
            <span className={styles.frameTickBr} aria-hidden="true" />
            <BeforeAfterSlider
              before={heroMedia.before}
              after={heroMedia.after}
              label="Kitchen transformation"
              initial={42}
              ratio="landscape"
              priority
              sizes="(min-width: 76rem) 46vw, (min-width: 48rem) 60vw, 92vw"
              className={styles.slider}
            />
            <p className={styles.sliderCaption}>
              <span className={styles.sliderCaptionLabel}>Drag the seam</span>
              <span className={styles.sliderCaptionText}>
                Every project starts as the picture on the left.
              </span>
            </p>
          </div>

          <Photo
            image={heroMedia.detail}
            ratio="portrait"
            className={styles.detail}
            sizes="(min-width: 76rem) 15vw, 0px"
          />
        </div>
      </div>

      <a className={styles.scrollCue} href="#the-second-chance-story">
        <span className={styles.scrollCueLine} aria-hidden="true" />
        <ArrowDown size={15} strokeWidth={2} aria-hidden="true" />
        <span>Why we do it this way</span>
      </a>
    </section>
  );
}
