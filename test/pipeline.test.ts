import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { TtlSet } from '../src/dedupe.js';
import { handleLiveComment } from '../src/pipeline.js';
import type { LiveComment } from '../src/types.js';
import { testConfig } from './helpers.js';

function comment(text: string, commentId = 'c1'): LiveComment {
  return {
    commentId,
    text,
    username: 'tittare',
    userId: 'u1',
    mediaId: 'live-1',
    igAccountId: 'ig',
  };
}

describe('handleLiveComment', () => {
  it('ignores chatter that is not a command and drops webhook retries', async () => {
    const ctx = createApp({ config: testConfig() });
    const first = await handleLiveComment(comment('hej på er'), {
      config: ctx.config,
      registry: ctx.registry,
      hub: ctx.hub,
      dedupe: new TtlSet(1000),
    });
    expect(first.reason).toBe('not-a-command');

    const dedupe = new TtlSet(1000);
    const deps = {
      config: ctx.config,
      registry: ctx.registry,
      hub: ctx.hub,
      dedupe,
    };
    const seen = await handleLiveComment(comment('!hej', 'same'), deps);
    const retry = await handleLiveComment(comment('!hej', 'same'), deps);
    expect(seen.handled).toBe(true);
    expect(retry.reason).toBe('duplicate');
    expect(ctx.hub.latest?.answer).toContain('@tittare');
  });

  it('shows the stub answer and skips the DM while private replies are off', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const ctx = createApp({ config: testConfig(), fetchImpl });
    const dedupe = new TtlSet(1000);
    const result = await handleLiveComment(comment('!fråga Vad är huvudstaden i Sverige?'), {
      config: ctx.config,
      registry: ctx.registry,
      hub: ctx.hub,
      dedupe,
      fetchImpl,
    });

    expect(result.handled).toBe(true);
    expect(result.command).toBe('fråga');
    expect(result.overlay?.question).toBe('Vad är huvudstaden i Sverige?');
    expect(result.overlay?.answer).toContain('Platshållarsvar');
    expect(result.privateReply).toEqual({ status: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(ctx.hub.latest?.id).toBe(result.overlay?.id);
  });

  it('sends a private reply when the flag is on', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ recipient_id: 'user-1', message_id: 'mid' }),
    );
    const config = testConfig({ privateRepliesEnabled: true });
    const ctx = createApp({ config, fetchImpl });
    const result = await handleLiveComment(comment('!fråga Hej?'), {
      config,
      registry: ctx.registry,
      hub: ctx.hub,
      dedupe: new TtlSet(1000),
      fetchImpl,
    });
    expect(result.privateReply).toEqual({
      status: 'sent',
      messageId: 'mid',
      recipientId: 'user-1',
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
