import type { ElementType, ReactNode } from 'react';
import styles from './Container.module.css';
import { cn } from '@/lib/cn';

export type ContainerWidth = 'narrow' | 'prose' | 'default' | 'wide' | 'full';

interface ContainerProps {
  children: ReactNode;
  width?: ContainerWidth;
  as?: ElementType;
  className?: string;
  /** Removes the horizontal gutter — for full-bleed children that manage their own padding. */
  bleed?: boolean;
  id?: string;
}

/** The single horizontal-rhythm primitive. Nothing else should set page gutters. */
export function Container({
  children,
  width = 'default',
  as: Tag = 'div',
  className,
  bleed = false,
  id,
}: ContainerProps) {
  return (
    <Tag id={id} className={cn(styles.container, styles[width], bleed && styles.bleed, className)}>
      {children}
    </Tag>
  );
}
