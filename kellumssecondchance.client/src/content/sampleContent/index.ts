/**
 * Barrel for the bundled sample content.
 *
 * Imported ONLY by the lazy fallback in lib/api/endpoints.ts, so this whole
 * module — every service, project, review and FAQ — stays out of the initial
 * bundle and is fetched only if the API is unreachable.
 */
export { sampleServices, sampleServiceSummaries } from './services';
export { sampleProjects, sampleProjectSummaries, sampleProjectCategories } from './projects';
export { sampleTestimonials } from './testimonials';
export { sampleFaqs, faqCategories } from './faqs';
export { sampleServiceAreas } from './serviceAreas';
export { sampleSiteContent } from './siteContent';
