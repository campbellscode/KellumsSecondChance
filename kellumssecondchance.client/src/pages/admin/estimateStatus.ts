import type { EstimateRequestStatus } from '@/lib/api/types';
import type { PillTone } from './components/AdminUi';

/**
 * The lead pipeline, in the words a renovation business uses.
 *
 * The server's enum names are developer language ("EstimateScheduled"); these
 * are what appears on screen. `next` drives the one-click action on the detail
 * screen, so the common path is a single button rather than a dropdown.
 */
interface StatusMeta {
  readonly label: string;
  readonly tone: PillTone;
  /** What this stage means, shown under the status control. */
  readonly meaning: string;
  /** The usual next step, if there is an obvious one. */
  readonly next?: { readonly status: EstimateRequestStatus; readonly label: string };
}

export const STATUS_ORDER: readonly EstimateRequestStatus[] = [
  'New',
  'Contacted',
  'EstimateScheduled',
  'EstimateSent',
  'Won',
  'Lost',
  'Archived',
];

export const STATUS_META: Record<EstimateRequestStatus, StatusMeta> = {
  New: {
    label: 'New',
    tone: 'warn',
    meaning: 'Nobody has spoken to this person yet.',
    next: { status: 'Contacted', label: 'Mark as contacted' },
  },
  Contacted: {
    label: 'Contacted',
    tone: 'info',
    meaning: 'You have reached them, but nothing is booked.',
    next: { status: 'EstimateScheduled', label: 'Book a visit' },
  },
  EstimateScheduled: {
    label: 'Visit booked',
    tone: 'info',
    meaning: 'A visit to see the space is arranged.',
    next: { status: 'EstimateSent', label: 'Estimate sent' },
  },
  EstimateSent: {
    label: 'Estimate sent',
    tone: 'info',
    meaning: 'They have your price and are deciding.',
    next: { status: 'Won', label: 'Mark as won' },
  },
  Won: {
    label: 'Won',
    tone: 'live',
    meaning: 'The work was agreed.',
  },
  Lost: {
    label: 'Lost',
    tone: 'danger',
    meaning: 'It did not go ahead.',
  },
  Archived: {
    label: 'Archived',
    tone: 'draft',
    meaning: 'Filed away and out of the working list.',
  },
};

/* --------------------------------------------------------- other enums */

export const TIMELINE_LABEL: Record<string, string> = {
  NotSure: 'Not sure yet',
  Immediately: 'As soon as possible',
  WithinOneMonth: 'Within a month',
  OneToThreeMonths: 'One to three months',
  ThreeToSixMonths: 'Three to six months',
  JustPlanning: 'Just planning ahead',
};

export const BUDGET_LABEL: Record<string, string> = {
  NotSure: 'Not sure yet',
  Under5k: 'Under $5,000',
  From5kTo15k: '$5,000 – $15,000',
  From15kTo35k: '$15,000 – $35,000',
  From35kTo75k: '$35,000 – $75,000',
  Over75k: 'Over $75,000',
};

export const PROPERTY_LABEL: Record<string, string> = {
  SingleFamily: 'Single-family home',
  Townhouse: 'Townhouse',
  Condo: 'Condominium',
  MultiFamily: 'Multi-family',
  Rental: 'Rental property',
  Other: 'Other',
};

export const CONTACT_LABEL: Record<string, string> = {
  NoPreference: 'No preference',
  Phone: 'Phone call',
  Email: 'Email',
  Text: 'Text message',
};
