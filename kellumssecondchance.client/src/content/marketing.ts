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
    description: 'Careful exterior renovation, repair and restoration work for your home.',
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
    icon: 'sparkles',
    title: 'We see the potential.',
    description:
      'We look at what a space — and a person — can become, then bring the care and effort needed to move it forward.',
  },
  {
    icon: 'hard-hat',
    title: 'We do the work.',
    description:
      'Opportunity means little without accountability. Everyone representing Kellum’s is expected to learn, show up and build to one professional standard.',
  },
  {
    icon: 'home',
    title: 'We respect your home.',
    description:
      'Exterior work happens at your home, so care for the property and clear communication both matter.',
  },
  {
    icon: 'ruler',
    title: 'We take pride in the details.',
    description:
      'The work behind the finish matters as much as the finish itself. We build carefully because what comes next should last.',
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
      'Use the form, call, or send details about the exterior work you have in mind.',
    detail: 'Takes about five minutes',
  },
  {
    number: '02',
    title: 'We look at the property',
    description:
      'We discuss the property and the exterior work you want to address before defining the project.',
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
    title: 'We complete the exterior work',
    description:
      'The agreed exterior renovation, repair or restoration work moves forward.',
    detail: 'You always know what happens next',
  },
  {
    number: '05',
    title: 'You enjoy the difference',
    description:
      'We review the completed exterior project with you.',
    detail: 'Finished means finished',
  },
];

export const storySection = {
  eyebrow: 'Our purpose',
  title: 'Second chances are what we build.',
  paragraphs: [
    'We started with a simple belief: what something is today does not have to determine what it becomes tomorrow.',
    'For homes, that means seeing beyond tired, weathered and damaged exteriors. We help homeowners see what the outside of their home can become.',
    'We believe potential deserves to be seen in people, too. Kellum’s wants to create opportunities for people who are ready to work, learn, grow and take pride in building something exceptional.',
  ],
  pullQuote: 'Homes deserve second chances. People do too.',
} as const;

export const ctaSection = {
  eyebrow: "Let's talk about your exterior",
  title: 'What part of your home deserves a second chance?',
  body: "Tell us what you have been thinking about. We will help you figure out what comes next — even if that turns out to be waiting, or calling somebody else.",
} as const;
