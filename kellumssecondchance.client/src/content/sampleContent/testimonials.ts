import type { Testimonial } from '@/lib/api/types';

/**
 * ============================================================================
 *  SAMPLE TESTIMONIALS — NOT REAL CUSTOMER STATEMENTS
 * ============================================================================
 *
 *  ⚠ EVERY record here is `isSampleContent: true`. These are illustrative
 *    examples written to show the shape and tone of a real review. They are NOT
 *    statements from real Kellum's customers and must never be presented as if
 *    they were.
 *
 *  The UI reads `isSampleContent` and labels these visibly wherever they appear.
 *  When real reviews arrive, add them with `isSampleContent: false` and delete
 *  these — the labelling disappears on its own.
 *
 *  Structured data (aggregate rating) is deliberately NOT emitted while any
 *  displayed review is sample content. See lib/seo/structuredData.ts.
 * ============================================================================
 */

export const sampleTestimonials: readonly Testimonial[] = [
  {
    id: 1,
    firstName: 'Sample',
    lastInitial: 'A',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'They found water damage under our shower that two other contractors had walked right past. Instead of quietly covering it up, they pulled us in, showed us the subfloor, and explained what it would take. That is the moment we knew we had picked the right crew.',
    projectCategory: 'Bathroom Renovations',
    reviewedOn: '2025-06-20',
    isFeatured: true,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 2,
    firstName: 'Sample',
    lastInitial: 'B',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'What I noticed most was the cleanup. Every single evening the floors were swept, the tools were stacked, and the plastic was back up. Six weeks of work and we never once felt like we had lost our house.',
    projectCategory: 'Kitchen Remodeling',
    reviewedOn: '2025-04-29',
    isFeatured: true,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 3,
    firstName: 'Sample',
    lastInitial: 'C',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'We expected to be told the whole deck had to come out. They pulled boards, checked the framing, and told us most of it was fine. It cost us less than we had budgeted, which is not something I have ever said about a contractor before.',
    projectCategory: 'Decks & Exteriors',
    reviewedOn: '2025-08-01',
    isFeatured: true,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 4,
    firstName: 'Sample',
    lastInitial: 'D',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'Our basement had been a storage room for eleven years. It is now where the kids do homework and we watch films. I keep going down there just because I can.',
    projectCategory: 'Basement Finishing',
    reviewedOn: '2025-03-11',
    isFeatured: false,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 5,
    firstName: 'Sample',
    lastInitial: 'E',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'The trim work is the part I show people. The mitres are still tight a year later and the profiles actually match what is upstairs. Whoever ran that saw knew exactly what they were doing.',
    projectCategory: 'Carpentry & Trim',
    reviewedOn: '2025-01-16',
    isFeatured: false,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 6,
    firstName: 'Sample',
    lastInitial: 'F',
    location: 'Example neighbourhood',
    rating: 4,
    quote:
      'A material delay pushed us back about a week, which was frustrating. But they told me the day they found out rather than the day it mattered, and they had a plan. I would still hire them again without hesitating.',
    projectCategory: 'Interior Renovations',
    reviewedOn: '2024-12-04',
    isFeatured: false,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 7,
    firstName: 'Sample',
    lastInitial: 'G',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'I manage six units and turnovers are usually a three-week headache of chasing people. They walked the unit, sent me a list, and it was done in eleven days with photos of everything.',
    projectCategory: 'Rental Property Turnovers',
    reviewedOn: '2025-06-02',
    isFeatured: false,
    isSampleContent: true,
    source: 'Direct',
  },
  {
    id: 8,
    firstName: 'Sample',
    lastInitial: 'H',
    location: 'Example neighbourhood',
    rating: 5,
    quote:
      'They walked our house and told us one of the three things on our list was not worth doing yet. Turning down work to give us honest advice is why we called them back six months later for the big project.',
    projectCategory: 'Repair & Restoration',
    reviewedOn: '2025-02-08',
    isFeatured: true,
    isSampleContent: true,
    source: 'Direct',
  },
];
