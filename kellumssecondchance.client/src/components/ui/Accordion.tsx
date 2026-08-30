import { useCallback, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import styles from './Accordion.module.css';
import { cn } from '@/lib/cn';

export interface AccordionItemData {
  readonly id: string | number;
  readonly question: ReactNode;
  readonly answer: ReactNode;
}

interface AccordionProps {
  items: readonly AccordionItemData[];
  /** Allow several panels open at once. Defaults to single-open. */
  allowMultiple?: boolean;
  /** ids open on first render. */
  defaultOpen?: readonly (string | number)[];
  className?: string;
  /** Heading level for each question button's wrapper. */
  headingLevel?: 2 | 3 | 4;
}

/**
 * Accessible disclosure list.
 *
 * Each question is a real <button> inside a heading, wired to its panel with
 * aria-controls/aria-expanded. Up/Down/Home/End move between questions the way
 * the APG accordion pattern specifies. The height animation is CSS-only and is
 * skipped entirely under prefers-reduced-motion.
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className,
  headingLevel = 3,
}: AccordionProps) {
  const [open, setOpen] = useState<Set<string | number>>(() => new Set(defaultOpen));
  const baseId = useId();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const Heading = `h${headingLevel}` as const;

  const toggle = useCallback(
    (id: string | number) => {
      setOpen((current) => {
        const next = new Set(allowMultiple ? current : []);
        if (current.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [allowMultiple],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const last = items.length - 1;
      let target: number | null = null;
      if (event.key === 'ArrowDown') target = index === last ? 0 : index + 1;
      else if (event.key === 'ArrowUp') target = index === 0 ? last : index - 1;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = last;
      if (target === null) return;
      event.preventDefault();
      buttonsRef.current[target]?.focus();
    },
    [items.length],
  );

  return (
    <div className={cn(styles.accordion, className)}>
      {items.map((item, index) => {
        const isOpen = open.has(item.id);
        const buttonId = `${baseId}-b-${index}`;
        const panelId = `${baseId}-p-${index}`;
        return (
          <div className={cn(styles.item, isOpen && styles.isOpen)} key={item.id}>
            <Heading className={styles.heading}>
              <button
                type="button"
                id={buttonId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                ref={(el) => {
                  buttonsRef.current[index] = el;
                }}
              >
                <span className={styles.question}>{item.question}</span>
                <span className={styles.icon} aria-hidden="true">
                  <Plus size={19} strokeWidth={1.9} />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={styles.panel}
              hidden={!isOpen}
            >
              <div className={styles.panelInner}>{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
