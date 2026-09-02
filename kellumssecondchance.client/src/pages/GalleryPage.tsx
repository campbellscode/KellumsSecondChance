import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './GalleryPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { PageHero } from '@/components/marketing/PageHero';
import { Container } from '@/components/ui/Container';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { apiRequest } from '@/lib/api/client';
import type { GalleryImage } from '@/lib/api/types';

const CRUMBS = [{ name: 'Home', path: '/' }, { name: 'Gallery', path: '/gallery' }];

export default function GalleryPage() {
  const [images, setImages] = useState<readonly GalleryImage[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  useScrollLock(active !== null);

  const close = () => {
    setActive(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  };
  const move = useCallback((delta: number) => setActive((current) => current === null ? null : (current + delta + images.length) % images.length), [images.length]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<GalleryImage[]>('/api/gallery', { signal: controller.signal })
      .then((result) => { setImages(result); setLoadState('ready'); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setLoadState('error'); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (active === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-gallery-dialog] button'));
        if (controls.length === 0) return;
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, move]);

  return <>
    <Seo title="Gallery" description="View exterior renovation and restoration imagery from Kellum’s Second Chance Renovations in Cincinnati, Ohio." path="/gallery" />
    <PageHero eyebrow="Our work" title="Built to be looked at twice." lead="A closer look at the homes, details and exterior transformations that define our work." crumbs={CRUMBS} layout="plain" />
    <section className={styles.section} aria-labelledby="gallery-heading">
      <Container width="wide">
        <div className={styles.intro}><h2 id="gallery-heading">Exterior details, up close.</h2><p>Curated exterior imagery. Individual photographs are presented without unverified project claims.</p></div>
        {loadState === 'loading' ? <LoadingState label="Loading gallery" /> : loadState === 'error' ? <ErrorState title="The gallery could not be loaded" description="Please try again." onRetry={() => { setLoadState('loading'); setAttempt((n) => n + 1); }} /> : images.length === 0 ? <EmptyState title="Gallery photographs are coming soon" /> : <ul className={styles.grid}>
          {images.map((image, index) => <li key={image.id} className={styles.item} style={{ '--ratio': `${image.width} / ${image.height}` } as React.CSSProperties}>
            <button type="button" className={styles.open} aria-label={`Open gallery image ${index + 1} of ${images.length}`} onClick={(event) => { openerRef.current = event.currentTarget; setActive(index); }}>
              <img src={image.imageUrl} width={image.width} height={image.height} alt={image.altText} loading="lazy" decoding="async" />
            </button>
          </li>)}
        </ul>}
      </Container>
    </section>
    {active !== null && images[active] ? <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Gallery image ${active + 1} of ${images.length}`} data-gallery-dialog onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label="Close gallery"><X aria-hidden="true" /></button>
      <button type="button" className={`${styles.step} ${styles.previous}`} onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft aria-hidden="true" /></button>
      <figure className={styles.lightbox}><img src={images[active].imageUrl} width={images[active].width} height={images[active].height} alt={images[active].altText} /><figcaption>{images[active].caption ? `${images[active].caption} · ` : ''}{active + 1} / {images.length}</figcaption></figure>
      <button type="button" className={`${styles.step} ${styles.next}`} onClick={() => move(1)} aria-label="Next image"><ChevronRight aria-hidden="true" /></button>
    </div> : null}
  </>;
}
