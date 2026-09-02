import type {
  BudgetRange,
  EstimateRequestPayload,
  PreferredContactMethod,
  ProjectTimeline,
  PropertyType,
} from '@/lib/api/types';
import { firstTouch } from '@/lib/attribution';

/**
 * Client-side model for the estimate request.
 *
 * Validation here exists purely to give fast, kind feedback. It is NOT a
 * security boundary — the server revalidates every field independently, and
 * anything rejected there comes back as a per-field message.
 */

export interface EstimateFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  projectTypeSlugs: string[];
  propertyType: PropertyType | '';
  addressLine: string;
  city: string;
  postalCode: string;
  timeline: ProjectTimeline | '';
  budgetRange: BudgetRange | '';
  description: string;
  preferredContactMethod: PreferredContactMethod;
  referralSource: string;
  companyWebsite: string;
}

export const initialEstimateForm: EstimateFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  projectTypeSlugs: [],
  propertyType: '',
  addressLine: '',
  city: '',
  postalCode: '',
  timeline: '',
  budgetRange: '',
  description: '',
  preferredContactMethod: 'NoPreference',
  referralSource: '',
  companyWebsite: '',
};

export const propertyTypeOptions: readonly { value: PropertyType; label: string; description?: string }[] = [
  { value: 'SingleFamily', label: 'Single-family home' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Condo', label: 'Condo or apartment' },
  { value: 'MultiFamily', label: 'Multi-family' },
  { value: 'Rental', label: 'Rental property' },
  { value: 'Other', label: 'Something else' },
];

export const timelineOptions: readonly { value: ProjectTimeline; label: string; description: string }[] = [
  { value: 'Immediately', label: 'As soon as possible', description: 'Something is broken or urgent' },
  { value: 'WithinOneMonth', label: 'Within a month', description: 'Ready to move once we agree a plan' },
  { value: 'OneToThreeMonths', label: 'One to three months', description: 'Planning ahead' },
  { value: 'ThreeToSixMonths', label: 'Three to six months', description: 'Getting organised early' },
  { value: 'JustPlanning', label: 'Just exploring', description: 'Working out what is possible' },
  { value: 'NotSure', label: 'Not sure yet', description: 'Happy to talk it through' },
];

export const budgetOptions: readonly { value: BudgetRange; label: string; description?: string }[] = [
  { value: 'Under5k', label: 'Under $5,000' },
  { value: 'From5kTo15k', label: '$5,000 – $15,000' },
  { value: 'From15kTo35k', label: '$15,000 – $35,000' },
  { value: 'From35kTo75k', label: '$35,000 – $75,000' },
  { value: 'Over75k', label: 'Over $75,000' },
  { value: 'NotSure', label: 'I genuinely do not know', description: 'That is a normal answer' },
];

export const contactMethodOptions: readonly { value: PreferredContactMethod; label: string }[] = [
  { value: 'Phone', label: 'Phone call' },
  { value: 'Text', label: 'Text message' },
  { value: 'Email', label: 'Email' },
  { value: 'NoPreference', label: 'Whatever is easiest' },
];

export const referralOptions: readonly { value: string; label: string }[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Search', label: 'Google or another search engine' },
  { value: 'Referral', label: 'Someone recommended you' },
  { value: 'Social', label: 'Social media' },
  { value: 'Repeat', label: 'You have worked on my home before' },
  { value: 'Signage', label: 'Saw a sign or a vehicle' },
  { value: 'Other', label: 'Somewhere else' },
];

export type FieldErrors = Partial<Record<keyof EstimateFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Deliberately permissive: 7–15 digits after stripping punctuation. */
const PHONE_DIGITS = /^\+?[\d\s().-]{7,20}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/;

/** Which fields belong to which step, so a step only validates its own. */
export const STEP_FIELDS: readonly (readonly (keyof EstimateFormState)[])[] = [
  ['projectTypeSlugs', 'description'],
  ['propertyType', 'postalCode', 'city', 'addressLine'],
  ['timeline', 'budgetRange'],
  ['firstName', 'lastName', 'email', 'phone', 'preferredContactMethod', 'referralSource'],
];

export function validateField(
  field: keyof EstimateFormState,
  state: EstimateFormState,
): string | undefined {
  switch (field) {
    case 'projectTypeSlugs':
      return state.projectTypeSlugs.length === 0
        ? 'Pick at least one — you can choose more than one.'
        : undefined;

    case 'description': {
      const trimmed = state.description.trim();
      if (trimmed.length === 0) return 'Tell us a little about what you have in mind.';
      if (trimmed.length < 20) return 'A sentence or two helps us understand the job.';
      if (trimmed.length > 4000) return 'That is longer than we can accept — please shorten it a little.';
      return undefined;
    }

    case 'propertyType':
      return state.propertyType === '' ? 'Let us know what kind of property this is.' : undefined;

    case 'postalCode': {
      const trimmed = state.postalCode.trim();
      if (trimmed.length === 0) return 'We need a ZIP or postal code to check we cover your area.';
      if (!POSTAL_PATTERN.test(trimmed)) return 'That does not look like a valid ZIP or postal code.';
      return undefined;
    }

    case 'city':
      return state.city.trim().length > 120 ? 'That is too long for a city name.' : undefined;

    case 'addressLine':
      return state.addressLine.trim().length > 250 ? 'That address is too long.' : undefined;

    case 'timeline':
      return state.timeline === '' ? 'Roughly when would you like this done?' : undefined;

    case 'budgetRange':
      return state.budgetRange === '' ? 'Pick a range — “not sure” is a valid answer.' : undefined;

    case 'firstName': {
      const trimmed = state.firstName.trim();
      if (trimmed.length === 0) return 'We need a first name.';
      if (trimmed.length > 80) return 'That name is too long.';
      return undefined;
    }

    case 'lastName': {
      const trimmed = state.lastName.trim();
      if (trimmed.length === 0) return 'We need a last name.';
      if (trimmed.length > 80) return 'That name is too long.';
      return undefined;
    }

    case 'email': {
      const trimmed = state.email.trim();
      if (trimmed.length === 0) return 'We need an email address to reply to.';
      if (!EMAIL_PATTERN.test(trimmed)) return 'That does not look like a valid email address.';
      if (trimmed.length > 254) return 'That email address is too long.';
      return undefined;
    }

    case 'phone': {
      const trimmed = state.phone.trim();
      // Phone is optional unless the visitor asked to be phoned or texted.
      const needsPhone =
        state.preferredContactMethod === 'Phone' || state.preferredContactMethod === 'Text';
      if (trimmed.length === 0) {
        return needsPhone ? 'You asked us to call or text, so we need a number.' : undefined;
      }
      if (!PHONE_DIGITS.test(trimmed)) return 'That does not look like a valid phone number.';
      return undefined;
    }

    default:
      return undefined;
  }
}

export function validateStep(step: number, state: EstimateFormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of STEP_FIELDS[step] ?? []) {
    const message = validateField(field, state);
    if (message) errors[field] = message;
  }
  return errors;
}

export function validateAll(state: EstimateFormState): FieldErrors {
  return STEP_FIELDS.reduce<FieldErrors>(
    (all, _fields, index) => ({ ...all, ...validateStep(index, state) }),
    {},
  );
}

export function toPayload(state: EstimateFormState, elapsedMs: number): EstimateRequestPayload {
  const trim = (value: string) => value.trim();
  const orNull = (value: string) => (trim(value).length > 0 ? trim(value) : null);

  const attribution=firstTouch();
  return {
    firstName: trim(state.firstName),
    lastName: trim(state.lastName),
    email: trim(state.email),
    phone: orNull(state.phone),
    projectTypeSlugs: state.projectTypeSlugs,
    propertyType: (state.propertyType || 'Other') as PropertyType,
    addressLine: orNull(state.addressLine),
    city: orNull(state.city),
    postalCode: trim(state.postalCode),
    timeline: (state.timeline || 'NotSure') as ProjectTimeline,
    budgetRange: (state.budgetRange || 'NotSure') as BudgetRange,
    description: trim(state.description),
    preferredContactMethod: state.preferredContactMethod,
    referralSource: orNull(state.referralSource),
    landingPage: attribution.landingPage ?? null, referrerUrl: attribution.referrerUrl ?? null,
    utmSource: attribution.utmSource ?? null, utmMedium: attribution.utmMedium ?? null,
    utmCampaign: attribution.utmCampaign ?? null, utmTerm: attribution.utmTerm ?? null, utmContent: attribution.utmContent ?? null,
    companyWebsite: orNull(state.companyWebsite),
    elapsedMs,
  };
}
