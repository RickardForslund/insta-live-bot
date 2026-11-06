import { describe, expect, it, vi } from 'vitest';
import { listLiveMedia, sendPrivateReply } from '../src/instagram/client.js';
import { testConfig } from './helpers.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('sendPrivateReply', () => {
  it('does not call Graph when the feature flag is off', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await sendPrivateReply({
      config: testConfig({ privateRepliesEnabled: false }),
      commentId: 'c1',
      text: 'hej',
      fetchImpl,
    });
    expect(result).toEqual({ status: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips the call when the token or account id is missing', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await sendPrivateReply({
      config: testConfig({ privateRepliesEnabled: true, igAccessToken: '' }),
      commentId: 'c1',
      text: 'hej',
      fetchImpl,
    });
    expect(result).toEqual({ status: 'skipped', reason: 'missing IG_ACCESS_TOKEN' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts one message addressed by comment_id', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ recipient_id: 'user-1', message_id: 'm1' }),
    );
    const config = testConfig({ privateRepliesEnabled: true });
    const result = await sendPrivateReply({
      config,
      commentId: 'comment-9',
      text: 'Stockholm.',
      fetchImpl,
    });

    expect(result).toEqual({ status: 'sent', messageId: 'm1', recipientId: 'user-1' });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://graph.instagram.com/v25.0/17890000000000000/messages');
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(JSON.parse(String(init?.body))).toEqual({
      recipient: { comment_id: 'comment-9' },
      message: { text: 'Stockholm.' },
    });
  });

  it('clips a message to the Instagram text limit', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ message_id: 'm1' }));
    await sendPrivateReply({
      config: testConfig({ privateRepliesEnabled: true }),
      commentId: 'c1',
      text: 'a'.repeat(1200),
      fetchImpl,
    });
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as { message: { text: string } };
    expect(body.message.text.length).toBe(1000);
    expect(body.message.text.endsWith('…')).toBe(true);
  });

  it('returns the Graph error message on a non-2xx response', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { message: 'Comment is too old', code: 100 } }, 400),
    );
    const result = await sendPrivateReply({
      config: testConfig({ privateRepliesEnabled: true }),
      commentId: 'c1',
      text: 'hej',
      fetchImpl,
    });
    expect(result).toEqual({
      status: 'error',
      message: 'Graph API 400 (100): Comment is too old',
    });
  });
});

describe('listLiveMedia', () => {
  it('requests the live_media edge with a bearer token', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ data: [] }));
    const result = await listLiveMedia({ config: testConfig(), fetchImpl });
    expect(result).toEqual({ ok: true, data: { data: [] } });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain('/v25.0/17890000000000000/live_media');
    expect(String(url)).toContain('fields=id%2Cmedia_type');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-token');
  });
});
