import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin client's antiforgery handling.
 *
 * Two behaviours are worth locking down. A token is fetched ONCE and reused, so
 * a busy screen does not fire a token request per save. And when the server
 * says the token is stale, exactly one silent retry happens — a person should
 * not be shown a failure the client can resolve, but an endless retry loop
 * would be worse than the failure.
 */

type FetchArgs = [RequestInfo | URL, RequestInit | undefined];

/**
 * `vi.resetModules()` gives each test its own module graph, so a statically
 * imported ApiError would be a DIFFERENT class from the one the code under test
 * throws and `instanceof` would never match. The shape is asserted instead.
 */
async function captureRejection(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('Expected the call to fail, but it resolved.');
  } catch (error) {
    return error as { name?: string; status?: number; message?: string };
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function problemResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

describe('admin API antiforgery', () => {
  let calls: FetchArgs[];

  beforeEach(() => {
    calls = [];
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(handler: (url: string, init: RequestInit | undefined) => Response) {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        calls.push([input, init]);
        return Promise.resolve(handler(String(input), init));
      }),
    );
  }

  it('fetches the token once and reuses it across mutations', async () => {
    stubFetch((url) => {
      if (url.includes('antiforgery')) return jsonResponse({ token: 'token-1' });
      return new Response(null, { status: 204 });
    });

    const admin = await import('./admin');

    await admin.deleteFaq(1);
    await admin.deleteFaq(2);
    await admin.deleteFaq(3);

    const tokenRequests = calls.filter(([url]) => String(url).includes('antiforgery'));
    expect(tokenRequests).toHaveLength(1);

    const mutations = calls.filter(([url]) => String(url).includes('/faqs/'));
    expect(mutations).toHaveLength(3);
    for (const [, init] of mutations) {
      expect((init?.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('token-1');
    }
  });

  it('refreshes the token and retries once when the server says it is stale', async () => {
    let issued = 0;
    let mutationAttempts = 0;

    stubFetch((url) => {
      if (url.includes('antiforgery')) {
        issued += 1;
        return jsonResponse({ token: `token-${issued}` });
      }

      mutationAttempts += 1;
      if (mutationAttempts === 1) {
        // What ValidateAntiforgeryHeaderAttribute returns for an expired token.
        return problemResponse(
          { title: 'Your session could not be verified.', status: 400, code: 'antiforgery' },
          400,
        );
      }
      return new Response(null, { status: 204 });
    });

    const admin = await import('./admin');

    await admin.deleteFaq(7);

    expect(mutationAttempts).toBe(2);
    expect(issued).toBe(2);

    const lastMutation = calls.filter(([url]) => String(url).includes('/faqs/')).at(-1)!;
    expect((lastMutation[1]?.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('token-2');
  });

  it('gives up after one retry rather than looping', async () => {
    let mutationAttempts = 0;

    stubFetch((url) => {
      if (url.includes('antiforgery')) return jsonResponse({ token: 'token' });
      mutationAttempts += 1;
      return problemResponse(
        { title: 'Your session could not be verified.', status: 400, code: 'antiforgery' },
        400,
      );
    });

    const admin = await import('./admin');

    const error = await captureRejection(admin.deleteFaq(7));

    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(400);
    expect(mutationAttempts).toBe(2);
  });

  it('does not retry a genuine validation failure', async () => {
    let mutationAttempts = 0;

    stubFetch((url) => {
      if (url.includes('antiforgery')) return jsonResponse({ token: 'token' });
      mutationAttempts += 1;
      // A 400 WITHOUT the antiforgery marker is the user's mistake, not a
      // stale token — retrying it would just fail again more slowly.
      return problemResponse(
        {
          title: 'Some of those details need another look.',
          status: 400,
          errors: { Question: ['Word it the way a customer would ask it.'] },
        },
        400,
      );
    });

    const admin = await import('./admin');

    const error = await captureRejection(
      admin.createFaq({
        question: '',
        answer: '',
        category: 'General',
        categorySlug: 'general',
        needsReview: false,
        reviewNote: null,
        isActive: true,
        displayOrder: 0,
      }),
    );

    expect(error.name).toBe('ApiError');
    expect(mutationAttempts).toBe(1);
  });

  it('does not poison later attempts when the token request itself fails', async () => {
    let tokenAttempts = 0;

    stubFetch((url) => {
      if (url.includes('antiforgery')) {
        tokenAttempts += 1;
        if (tokenAttempts === 1) return new Response(null, { status: 500 });
        return jsonResponse({ token: 'token-recovered' });
      }
      return new Response(null, { status: 204 });
    });

    const admin = await import('./admin');

    await expect(admin.deleteFaq(1)).rejects.toBeTruthy();
    // A cached rejected promise here would break every later save in the
    // session and force a page reload.
    await expect(admin.deleteFaq(2)).resolves.toBeUndefined();
    expect(tokenAttempts).toBe(2);
  });

  it('sends multipart uploads without a JSON content type', async () => {
    stubFetch((url) => {
      if (url.includes('antiforgery')) return jsonResponse({ token: 'token' });
      return jsonResponse({ id: 1, src: '/uploads/x.png' }, 201);
    });

    const admin = await import('./admin');

    await admin.uploadProjectImage(4, {
      file: new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' }),
      kind: 'Gallery',
      altText: 'A finished kitchen',
    });

    const upload = calls.find(([url]) => String(url).includes('/images'))!;
    const headers = upload[1]?.headers as Record<string, string>;

    // The browser has to pick the multipart boundary itself.
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['X-CSRF-TOKEN']).toBe('token');
    expect(upload[1]?.body).toBeInstanceOf(FormData);
  });
});
