import type { CSSProperties } from 'react';
import styles from './Photo.module.css';
import { cn } from '@/lib/cn';
import type { ImageAsset } from '@/lib/api/types';

export type PhotoRatio =
  | 'auto'
  | 'square'
  | 'landscape'   /* 3:2  */
  | 'portrait'    /* 4:5  */
  | 'wide'        /* 2:1  */
  | 'cinema'      /* 21:9 */
  | 'tall';       /* 3:4  */

interface PhotoProps {
  image: ImageAsset;
  /**
   * Forces a display ratio regardless of the asset's own aspect. The image is
   * cover-cropped, so mixed-aspect galleries never break the layout.
   */
  ratio?: PhotoRatio;
  /** `sizes` attribute — always pass a realistic value for responsive layouts. */
  sizes?: string;
  /** Set on the LCP image only. Everything else stays lazy. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Adds a slow zoom on hover of the nearest `[data-photo-zoom]` ancestor. */
  zoomOnHover?: boolean;
  /** Renders a warm gradient scrim, for text laid over the image. */
  scrim?: 'none' | 'bottom' | 'full';
  objectPosition?: string;
  style?: CSSProperties;
}

const RATIO_CLASS: Record<PhotoRatio, string | undefined> = {
  auto: undefined,
  square: styles.square,
  landscape: styles.landscape,
  portrait: styles.portrait,
  wide: styles.wide,
  cinema: styles.cinema,
  tall: styles.tall,
};

/**
 * The only image element in the app.
 *
 * Always emits intrinsic width/height (no layout shift), lazy-loads by default,
 * and prefers modern formats when the asset manifest supplies them. Alt text is
 * required by the ImageAsset type; pass "" deliberately for decorative art.
 */
export function Photo({
  image,
  ratio = 'auto',
  sizes = '100vw',
  priority = false,
  className,
  imgClassName,
  zoomOnHover = false,
  scrim = 'none',
  objectPosition,
  style,
}: PhotoProps) {
  const decorative = image.alt.trim() === '';

  const img = (
    <img
      className={cn(styles.img, zoomOnHover && styles.zoom, imgClassName)}
      src={image.src}
      width={image.width}
      height={image.height}
      alt={image.alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      aria-hidden={decorative || undefined}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );

  return (
    <figure
      className={cn(styles.frame, RATIO_CLASS[ratio], scrim !== 'none' && styles.hasScrim, className)}
      style={style}
    >
      {image.sources && image.sources.length > 0 ? (
        <picture>
          {image.sources.map((source) => (
            <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />
          ))}
          {img}
        </picture>
      ) : (
        img
      )}
      {scrim !== 'none' ? (
        <span className={cn(styles.scrim, scrim === 'full' && styles.scrimFull)} aria-hidden="true" />
      ) : null}
    </figure>
  );
}
