export interface NavItem {
  readonly label: string;
  readonly to: string;
  /** Shown under the label in the mobile drawer. */
  readonly description?: string;
}

/** Primary navigation. Order here is the order everywhere. */
export const primaryNav: readonly NavItem[] = [
  { label: 'Home', to: '/', description: 'Start here' },
  { label: 'About', to: '/about', description: 'Who you would be working with' },
  { label: 'Services', to: '/services', description: 'What we take on' },
  { label: 'Gallery', to: '/gallery', description: 'Exterior work, up close' },
  { label: 'Projects', to: '/projects', description: 'Second chances we have built' },
  { label: 'Reviews', to: '/reviews', description: 'What homeowners say' },
  { label: 'FAQ', to: '/faq', description: 'Straight answers' },
  { label: 'Work With Us', to: '/work-with-us', description: 'Build what comes next' },
  { label: 'Bookings', to: '/bookings', description: 'Request a time' },
  { label: 'Contact', to: '/contact', description: "Let's talk about your exterior" },
];

export const footerNav: readonly { readonly title: string; readonly items: readonly NavItem[] }[] = [
  {
    title: 'Explore',
    items: [
      { label: 'Home', to: '/' },
      { label: 'Services', to: '/services' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'Projects', to: '/projects' },
      { label: 'About', to: '/about' },
      { label: 'Work With Us', to: '/work-with-us' },
    ],
  },
  {
    title: 'Get Started',
    items: [
      { label: 'Request an Estimate', to: '/request-estimate' },
      { label: 'Bookings', to: '/bookings' },
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
  { label: 'Roofing', to: '/services/roofing' },
  { label: 'Siding', to: '/services/siding' },
  { label: 'Gutters & Downspouts', to: '/services/gutters-and-downspouts' },
  { label: 'Decks', to: '/services/decks' },
  { label: 'Exterior Restoration', to: '/services/exterior-restoration' },
  { label: 'Concrete & Masonry', to: '/services/concrete-and-masonry' },
];

export const legalNav: readonly NavItem[] = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];
