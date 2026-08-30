/**
 * Marketing copy that is genuinely editorial rather than business data.
 *
 * Nothing here asserts an unverified fact — no years in business, no project
 * counts, no awards, no guarantees. Every claim is about *how* the work is
 * approached, which is a promise the business can actually keep.
 */

export interface TrustPoint {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export const trustPoints: readonly TrustPoint[] = [
  {
    icon: 'hammer',
    title: 'Quality Craftsmanship',
    description: 'Tight joints, flat walls, square openings. The details you notice and the ones you never will.',
  },
  {
    icon: 'message-circle',
    title: 'Clear Communication',
    description: 'You hear about a problem the day we find it, not on the final invoice.',
  },
  {
    icon: 'calendar-check',
    title: 'Dependable Scheduling',
    description: 'A start date we can hold, and an honest answer when something moves.',
  },
  {
    icon: 'shield-check',
    title: 'Respect for Your Home',
    description: 'Containment up, floors protected, site swept before we leave for the day.',
  },
  {
    icon: 'ruler',
    title: 'Detail-Driven Workmanship',
    description: 'Finished means finished. Good enough has never been the target.',
  },
];

export interface ValueProp {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

export const whyKellums: readonly ValueProp[] = [
  {
    icon: 'clock',
    title: 'We show up.',
    description:
      'When we say Tuesday, we mean Tuesday. If something changes, you hear it from us first — with a plan attached, not an apology on its own.',
  },
  {
    icon: 'hard-hat',
    title: 'We build it right.',
    description:
      'The blocking behind the tile, the flashing at the ledger, the subfloor nobody photographs. That work decides whether a renovation lasts ten years or two.',
  },
  {
    icon: 'home',
    title: 'We respect your home.',
    description:
      'A renovation should not mean losing control of your house. Dust containment, protected floors and a site that gets cleaned every evening are not extras.',
  },
  {
    icon: 'sparkles',
    title: 'We care about the finish.',
    description:
      'We walk the punch list with you and we do not call it done until you would. The last five percent is the part people live with.',
  },
  {
    icon: 'message-square-quote',
    title: 'We tell you the truth.',
    description:
      'Including when the answer is "that is not worth doing yet" or "you need a different trade for this." Honest advice costs us a job sometimes. It is still the right call.',
  },
  {
    icon: 'file-text',
    title: 'We put it in writing.',
    description:
      'Scope, price and changes are documented before work happens. Nothing lands on your bill that you have not seen and agreed to.',
  },
];

export interface ProcessStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly detail: string;
}

export const processSteps: readonly ProcessStep[] = [
  {
    number: '01',
    title: 'Tell us what needs a second chance',
    description:
      'A form, a phone call, or a few photos of the room that has been bothering you. You do not need a plan yet — that is our job.',
    detail: 'Takes about five minutes',
  },
  {
    number: '02',
    title: 'We walk the space',
    description:
      'Renovation work cannot be priced from a photograph. We come out, look at what is actually there, and tell you what we find — including anything you did not ask about.',
    detail: 'On site, at your convenience',
  },
  {
    number: '03',
    title: 'We build the plan',
    description:
      'Scope, materials, sequence and price, written down. Where something is genuinely unknown until a wall is open, we name it rather than burying it in a number.',
    detail: 'In writing, before anything starts',
  },
  {
    number: '04',
    title: 'We transform the space',
    description:
      'Containment goes up, the work happens, and the site gets cleaned every evening. You get one point of contact and a straight answer whenever you want one.',
    detail: 'You always know what happens next',
  },
  {
    number: '05',
    title: 'You enjoy the difference',
    description:
      'We walk it together, build the punch list together, and finish it. Then we get out of your house and let you have your room back.',
    detail: 'Finished means finished',
  },
];

export const storySection = {
  eyebrow: 'The Second Chance Story',
  title: 'Homes do not always need replacing. Sometimes they need somebody to see what they could be.',
  paragraphs: [
    'Almost every house has a room that got written off. The kitchen everyone works around. The basement full of boxes. The bathroom that has needed help since before you moved in. It is rarely that the room is beyond saving — it is that nobody has looked at it properly and said what it could become.',
    'That is the whole idea behind the name. We take on outdated, worn, damaged, unfinished and underused spaces, and we give them a second chance. Not a patch. Not a cover-up. A genuine rebuild of the part of your home you had stopped believing in.',
    'The work is not glamorous. It is measuring twice, protecting floors, flattening walls that have not been flat since the fifties, and caring about the joint that nobody will ever look at closely. That is the job, and we happen to love it.',
  ],
  pullQuote: 'We would rather fix the cause than sell you a cover-up.',
} as const;

export const ctaSection = {
  eyebrow: "Let's talk about your space",
  title: 'What part of your home deserves a second chance?',
  body: "Tell us what you have been thinking about. We will help you figure out what comes next — even if that turns out to be waiting, or calling somebody else.",
} as const;
