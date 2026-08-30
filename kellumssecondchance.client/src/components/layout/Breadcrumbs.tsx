import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './Breadcrumbs.module.css';
import { cn } from '@/lib/cn';
import type { Crumb } from '@/lib/seo/structuredData';

interface BreadcrumbsProps {
  /** Ordered trail. The last entry is rendered as the current page. */
  items: readonly Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn(styles.nav, className)}>
      <ol className={styles.list}>
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className={styles.item} key={crumb.path}>
              {isLast ? (
                <span className={styles.current} aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link className={styles.link} to={crumb.path}>
                    {crumb.name}
                  </Link>
                  <ChevronRight size={13} className={styles.sep} aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
