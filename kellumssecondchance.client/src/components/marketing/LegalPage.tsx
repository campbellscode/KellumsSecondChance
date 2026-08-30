import type { ReactNode } from 'react';
import styles from './LegalPage.module.css';
import { PageHero } from './PageHero';
import { Container } from '@/components/ui/Container';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';

export interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly body: ReactNode;
}

interface LegalPageProps {
  title: string;
  eyebrow: string;
  description: string;
  path: string;
  lead: string;
  /** Displayed as the "last reviewed" date. Update when the text changes. */
  updated: string;
  /** Rendered above the sections when the text still needs legal review. */
  reviewNotice?: string;
  sections: readonly LegalSection[];
}

/** Shared shell for the privacy notice and terms pages. */
export function LegalPage({
  title,
  eyebrow,
  description,
  path,
  lead,
  updated,
  reviewNotice,
  sections,
}: LegalPageProps) {
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: title, path },
  ];

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        structuredData={graph(organizationSchema(), breadcrumbSchema(crumbs))}
      />

      <PageHero eyebrow={eyebrow} title={title} lead={lead} crumbs={crumbs} layout="plain" />

      <section className={styles.section}>
        <Container width="wide">
          <div className={styles.layout}>
            <nav className={styles.toc} aria-label="On this page">
              <p className={styles.tocTitle}>On this page</p>
              <ul>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.heading}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.content}>
              <p className={styles.updated}>Last reviewed: {updated}</p>

              {reviewNotice ? (
                <p className={styles.reviewNotice}>
                  <strong>Needs legal review.</strong> {reviewNotice}
                </p>
              ) : null}

              {sections.map((section) => (
                <section className={styles.block} key={section.id} id={section.id}>
                  <h2 className={styles.heading}>{section.heading}</h2>
                  <div className={styles.body}>{section.body}</div>
                </section>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
