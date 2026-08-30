import { describe, expect, it } from 'vitest';
import {
  initialEstimateForm,
  toPayload,
  validateAll,
  validateField,
  validateStep,
} from './estimateFormModel';
import type { EstimateFormState } from './estimateFormModel';

function complete(overrides: Partial<EstimateFormState> = {}): EstimateFormState {
  return {
    ...initialEstimateForm,
    firstName: 'Dana',
    lastName: 'Okonkwo',
    email: 'dana@example.com',
    phone: '(555) 010-2233',
    projectTypeSlugs: ['kitchen-remodeling'],
    propertyType: 'SingleFamily',
    addressLine: '12 Maple Street',
    city: 'Example City',
    postalCode: '12345',
    timeline: 'OneToThreeMonths',
    budgetRange: 'From15kTo35k',
    description: 'Our kitchen layout does not work for two people cooking at the same time.',
    preferredContactMethod: 'Email',
    ...overrides,
  };
}

describe('estimate form validation', () => {
  it('accepts a fully completed form', () => {
    expect(validateAll(complete())).toEqual({});
  });

  it('reports every missing field on an empty form', () => {
    const errors = validateAll(initialEstimateForm);

    expect(errors.projectTypeSlugs).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.propertyType).toBeDefined();
    expect(errors.postalCode).toBeDefined();
    expect(errors.timeline).toBeDefined();
    expect(errors.budgetRange).toBeDefined();
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it('validates each step in isolation', () => {
    // Step 1 is complete; the fields on later steps must not leak into it.
    const state = complete({ firstName: '', lastName: '', email: '' });

    expect(validateStep(0, state)).toEqual({});
    expect(Object.keys(validateStep(3, state))).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email']),
    );
  });

  it.each([
    ['', 'empty'],
    ['not-an-email', 'no @'],
    ['missing@domain', 'no dot in the domain'],
    ['@example.com', 'no local part'],
  ])('rejects the email %s (%s)', (email) => {
    expect(validateField('email', complete({ email }))).toBeDefined();
  });

  it('accepts a normal email address', () => {
    expect(validateField('email', complete({ email: 'first.last@example.co.uk' }))).toBeUndefined();
  });

  it('treats the phone number as optional by default', () => {
    expect(validateField('phone', complete({ phone: '' }))).toBeUndefined();
  });

  it.each(['Phone', 'Text'] as const)(
    'requires a phone number once %s is the preferred contact method',
    (preferredContactMethod) => {
      const state = complete({ phone: '', preferredContactMethod });

      expect(validateField('phone', state)).toBeDefined();
    },
  );

  it('rejects a phone number that is not a phone number', () => {
    expect(validateField('phone', complete({ phone: 'call me maybe' }))).toBeDefined();
  });

  it('requires a description with some substance', () => {
    expect(validateField('description', complete({ description: 'help' }))).toBeDefined();
    expect(validateField('description', complete({ description: '' }))).toBeDefined();
  });

  it('rejects a description beyond the server column limit', () => {
    expect(validateField('description', complete({ description: 'x'.repeat(4001) }))).toBeDefined();
  });

  it.each(['', '!!', 'far-too-long-postal-code'])('rejects the postal code %s', (postalCode) => {
    expect(validateField('postalCode', complete({ postalCode }))).toBeDefined();
  });

  it('accepts common postal code formats', () => {
    expect(validateField('postalCode', complete({ postalCode: '12345' }))).toBeUndefined();
    expect(validateField('postalCode', complete({ postalCode: '12345-6789' }))).toBeUndefined();
    expect(validateField('postalCode', complete({ postalCode: 'A1B 2C3' }))).toBeUndefined();
  });

  it('requires at least one project type', () => {
    expect(validateField('projectTypeSlugs', complete({ projectTypeSlugs: [] }))).toBeDefined();
    expect(validateField('projectTypeSlugs', complete({ projectTypeSlugs: ['flooring'] }))).toBeUndefined();
  });
});

describe('estimate payload', () => {
  it('trims values and converts blanks to null', () => {
    const payload = toPayload(
      complete({
        firstName: '  Dana ',
        email: ' dana@example.com  ',
        city: '   ',
        addressLine: '',
      }),
      42_000,
    );

    expect(payload.firstName).toBe('Dana');
    expect(payload.email).toBe('dana@example.com');
    expect(payload.city).toBeNull();
    expect(payload.addressLine).toBeNull();
  });

  it('carries the elapsed time used by the server bot check', () => {
    expect(toPayload(complete(), 42_000).elapsedMs).toBe(42_000);
  });

  it('sends null for an untouched honeypot', () => {
    expect(toPayload(complete(), 42_000).companyWebsite).toBeNull();
  });

  it('forwards a filled honeypot so the server can reject the submission', () => {
    const payload = toPayload(complete({ companyWebsite: 'https://spam.example' }), 42_000);

    expect(payload.companyWebsite).toBe('https://spam.example');
  });

  it('falls back to the NotSure options rather than sending an empty enum', () => {
    const payload = toPayload(complete({ timeline: '', budgetRange: '', propertyType: '' }), 1000);

    expect(payload.timeline).toBe('NotSure');
    expect(payload.budgetRange).toBe('NotSure');
    expect(payload.propertyType).toBe('Other');
  });
});
