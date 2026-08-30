import { describe, expect, it } from 'vitest';
import { NO_ERRORS, orNull, sameValue, slugify, toDateInput, toFormErrors } from './adminForm';
import { ApiError } from '@/lib/api/client';

describe('slugify', () => {
  it('mirrors the server so the preview matches what is stored', () => {
    expect(slugify('Maple Street Kitchen')).toBe('maple-street-kitchen');
    expect(slugify("Dana's 1920s Bungalow")).toBe('dana-s-1920s-bungalow');
    expect(slugify('  Trailing and leading  ')).toBe('trailing-and-leading');
  });

  it('collapses runs of punctuation rather than emitting empty segments', () => {
    // "a---b" would fail the server's slug pattern and be rejected on save.
    expect(slugify('Kitchen -- & -- Bath')).toBe('kitchen-bath');
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('orNull', () => {
  it('treats an all-whitespace field as not supplied', () => {
    // This is what keeps an empty string out of the database, and therefore
    // keeps an empty tel: link out of the header.
    expect(orNull('   ')).toBeNull();
    expect(orNull('')).toBeNull();
    expect(orNull(null)).toBeNull();
    expect(orNull(undefined)).toBeNull();
  });

  it('trims a supplied value', () => {
    expect(orNull('  hello@example.com ')).toBe('hello@example.com');
  });
});

describe('toFormErrors', () => {
  it('puts a field message under its own field', () => {
    const error = new ApiError('Some of those details need another look.', 400, {
      title: 'Some of those details need another look.',
      errors: { Slug: ['That address is already in use.'] },
    });

    const result = toFormErrors(error);

    expect(result.fields.slug).toBe('That address is already in use.');
    // With a field-level message there is no need for a banner as well.
    expect(result.summary).toBeNull();
  });

  it('promotes a model-level message to the summary', () => {
    const error = new ApiError('Rejected', 400, {
      errors: { '': ['Fill in both halves of the phone number, or neither.'] },
    });

    const result = toFormErrors(error);

    expect(result.summary).toBe('Fill in both halves of the phone number, or neither.');
    expect(result.fields).toEqual({});
  });

  it('falls back to the problem title when nothing is field-specific', () => {
    const error = new ApiError('That project no longer exists.', 404, null);

    expect(toFormErrors(error).summary).toBe('That project no longer exists.');
  });

  it('never throws on a non-API failure', () => {
    expect(toFormErrors(new Error('Network down')).summary).toBe('Network down');
    expect(toFormErrors('something odd').summary).toBe('That could not be saved.');
  });

  it('starts from no errors', () => {
    expect(NO_ERRORS.summary).toBeNull();
    expect(NO_ERRORS.fields).toEqual({});
  });
});

describe('sameValue', () => {
  it('detects an unchanged form so the save button stays disabled', () => {
    const a = { title: 'Kitchen', highlights: ['Oak'], isActive: false };
    const b = { title: 'Kitchen', highlights: ['Oak'], isActive: false };

    expect(sameValue(a, b)).toBe(true);
  });

  it('detects a change anywhere in the draft', () => {
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameValue({ list: ['x'] }, { list: ['x', 'y'] })).toBe(false);
  });
});

describe('toDateInput', () => {
  it('accepts what the API sends for a date', () => {
    expect(toDateInput('2025-04-29')).toBe('2025-04-29');
  });

  it('gives an empty value for a date that was never set', () => {
    expect(toDateInput(null)).toBe('');
  });
});
