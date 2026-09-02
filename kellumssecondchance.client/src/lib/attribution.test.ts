import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureFirstTouch, firstTouch } from './attribution';

describe('first-touch attribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    history.replaceState({}, '', '/services/kitchens?utm_source=google&utm_campaign=fall');
    Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://example.org/article' });
  });

  it('captures the first UTM touch and external referrer', () => {
    captureFirstTouch();
    expect(firstTouch()).toMatchObject({ utmSource: 'google', utmCampaign: 'fall', referrerUrl: 'https://example.org/article' });
  });

  it('does not overwrite the first touch later in the session', () => {
    captureFirstTouch();
    history.replaceState({}, '', '/about?utm_source=facebook');
    captureFirstTouch();
    expect(firstTouch().utmSource).toBe('google');
  });

  it('ignores malformed referrers and degrades safely when storage fails', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: 'not a url' });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => captureFirstTouch()).not.toThrow();
    set.mockRestore();
  });

  it('stores only the bounded acquisition allow-list, not query-string PII fields', () => {
    history.replaceState({}, '', '/?utm_source=x&email=private%40example.com&name=Private');
    captureFirstTouch();
    const value = JSON.stringify(firstTouch());
    expect(value).not.toContain('private@example.com');
    expect(value).not.toContain('Private');
  });
});
