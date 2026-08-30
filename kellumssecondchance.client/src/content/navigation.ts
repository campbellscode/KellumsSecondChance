export interface NavItem {
  readonly label: string;
  readonly to: string;
  /** Shown under the label in the mobile drawer. */
  readonly description?: string;
}

/** Primary navigation. Order here is the order everywhere. */
export const primaryNav: readonly NavItem[] = [
  { label: 'Home', to: '/', description: 'Start here' },
  { label: 'Services', to: '/services', description: 'What we take on' },
  { label: 'Projects', to: '/projects', description: 'Second chances we have built' },
  { label: 'About', to: '/about', description: 'Who you would be working with' },
  { label: 'Reviews', to: '/reviews', description: 'What homeowners say' },
  { label: 'FAQ', to: '/faq', description: 'Straight answers' },
  { label: 'Contact', to: '/contact', description: "Let's talk about your space" },
];

export const footerNav: readonly { readonly title: string; readonly items: readonly NavItem[] }[] = [
  {
    title: 'Explore',
    items: [
      { label: 'Home', to: '/' },
      { label: 'Services', to: '/services' },
      { label: 'Projects', to: '/projects' },
      { label: 'About', to: '/about' },
    ],
  },
  {
    title: 'Get Started',
    items: [
      { label: 'Request an Estimate', to: '/request-estimate' },
      { label: 'Contact', to: '/contact' },
      { label: 'Service Area', to: '/service-area' },
      { label: 'Reviews', to: '/reviews' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
];

/**
 * Services surfaced in the footer.
 *
 * Deliberately a short static list rather than a fetch: the footer renders on
 * every page and must not depend on the API being reachable. Keep the slugs in
 * step with the service catalogue.
 */
export const footerServiceLinks: readonly NavItem[] = [
  { label: 'Kitchen Remodeling', to: '/services/kitchen-remodeling' },
  { label: 'Bathroom Renovations', to: '/services/bathroom-renovations' },
  { label: 'Basement Finishing', to: '/services/basement-finishing' },
  { label: 'Interior Renovations', to: '/services/interior-renovations' },
  { label: 'Carpentry & Trim', to: '/services/carpentry-and-trim' },
  { label: 'Decks & Exteriors', to: '/services/decks-and-exteriors' },
];

export const legalNav: readonly NavItem[] = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];
