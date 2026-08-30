import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './ProjectsPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { ProjectCard } from '@/components/marketing/ProjectCard';
import { CtaSection } from '@/components/marketing/CtaSection';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SampleContentNotice } from '@/components/ui/SampleContentNotice';
import { useAsync } from '@/lib/hooks/useAsync';
import { getProjectCategories, getProjects } from '@/lib/api/endpoints';
import { editorialMedia } from '@/content/media';
import { useSiteContent } from '@/lib/siteContentContext';
import { cn } from '@/lib/cn';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Projects', path: '/projects' },
];


export default function ProjectsPage() {
  const { site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS)),
    [site],
  );

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const categoriesLoader = useCallback((signal: AbortSignal) => getProjectCategories(signal), []);
  const categories = useAsync(categoriesLoader);

  const projectsLoader = useCallback((signal: AbortSignal) => getProjects({}, signal), []);
  const projects = useAsync(projectsLoader);

  const filtered = useMemo(() => {
    const all = projects.data ?? [];
    const needle = deferredSearch.trim().toLowerCase();
    return all.filter((project) => {
      if (category !== 'all' && project.categorySlug !== category) return false;
      if (!needle) return true;
      return (
        project.title.toLowerCase().includes(needle) ||
        project.summary.toLowerCase().includes(needle) ||
        project.category.toLowerCase().includes(needle) ||
        (project.location?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [projects.data, category, deferredSearch]);

  const activeCategoryName =
    categories.data?.find((c) => c.slug === category)?.name ?? 'this category';

  // Only label the gallery while seeded examples are actually on show; the
  // notice disappears on its own once real case studies replace them.
  const hasSampleProjects = (projects.data ?? []).some((p) => p.isSampleContent);

  return (
    <>
      <Seo
        title="Second Chances We Have Built"
        description="Kitchen, bathroom, basement and whole-home renovation case studies — what was wrong, what we did about it, and how the room turned out."
        path="/projects"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Second chances we have built"
        title="See what is possible."
        lead="Not a photo dump. Every project here is a case study: the original problem, the approach, and what the room is actually like now."
        crumbs={CRUMBS}
        image={editorialMedia.process}
        layout="panel"
      />

      <section className={styles.gallery} aria-labelledby="gallery-heading">
        <Container width="wide">
          <h2 id="gallery-heading" className="u-visually-hidden">
            Project gallery
          </h2>

          {hasSampleProjects ? <SampleContentNotice context="projects" className={styles.notice} /> : null}

          {/* ---- Filter bar ---------------------------------------------- */}
          <div className={styles.controls}>
            <div className={styles.filters} role="group" aria-label="Filter projects by category">
              <button
                type="button"
                className={cn(styles.filter, category === 'all' && styles.filterActive)}
                onClick={() => setCategory('all')}
                aria-pressed={category === 'all'}
              >
                All work
                <span className={styles.filterCount}>{(projects.data ?? []).length}</span>
              </button>
              {(categories.data ?? []).map((item) => (
                <button
                  type="button"
                  key={item.slug}
                  className={cn(styles.filter, category === item.slug && styles.filterActive)}
                  onClick={() => setCategory(item.slug)}
                  aria-pressed={category === item.slug}
                >
                  {item.name}
                  <span className={styles.filterCount}>{item.count}</span>
                </button>
              ))}
            </div>

            <div className={styles.searchWrap}>
              <label className="u-visually-hidden" htmlFor="project-search">
                Search projects
              </label>
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                id="project-search"
                type="search"
                className={styles.search}
                placeholder="Search projects"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
              />
              {search ? (
                <button type="button" className={styles.searchClear} onClick={() => setSearch('')}>
                  <X size={15} aria-hidden="true" />
                  <span className="u-visually-hidden">Clear search</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* ---- Results -------------------------------------------------- */}
          {projects.isLoading ? (
            <LoadingState label="Loading projects" variant="cards" count={6} />
          ) : projects.status === 'error' ? (
            <ErrorState
              title="The gallery is not loading"
              description="Our project gallery is temporarily unavailable. It is usually back within a minute or two."
              onRetry={projects.reload}
            />
          ) : (projects.data ?? []).length === 0 ? (
            <EmptyState
              title="No projects published yet"
              description="Our case studies are being put together. In the meantime, tell us about your project and we will walk you through similar work we have done."
              action={
                <Button as="link" to="/request-estimate" size="sm">
                  Request an estimate
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? `Nothing matches “${search}”` : `No ${activeCategoryName} projects yet`}
              description={
                search
                  ? 'Try a different word, or clear the search to see everything.'
                  : 'We have not published a case study in this category yet. It does not mean we have not done the work — ask us.'
              }
              action={
                <div className={styles.emptyActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setCategory('all');
                    }}
                  >
                    Show everything
                  </Button>
                  <Button as="link" to="/contact" size="sm">
                    Ask about this work
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <p className={styles.count} role="status" aria-live="polite">
                Showing {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
                {category !== 'all' ? ` in ${activeCategoryName}` : ''}
              </p>

              <ul className={styles.grid}>
                {filtered.map((project, index) => (
                  <li
                    key={project.slug}
                    className={cn(styles.gridItem, index % 5 === 0 && styles.gridItemWide)}
                  >
                    <ProjectCard
                      project={project}
                      variant="tile"
                      index={index}
                      priority={index === 0}
                      sizes={
                        index % 5 === 0
                          ? '(min-width: 68rem) 58vw, 92vw'
                          : '(min-width: 68rem) 30vw, (min-width: 44rem) 46vw, 92vw'
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Container>
      </section>

      <CtaSection
        eyebrow="Your project next"
        title="What would yours look like?"
        body="Send us the room you have been putting off. We will tell you honestly what is possible and what it takes."
      />
    </>
  );
}
