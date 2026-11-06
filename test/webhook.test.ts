import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { testConfig } from './helpers.js';

const payload = {
  object: 'instagram',
  entry: [
    {
      id: 'ig-account',
      time: 10,
      changes: [
        {
          field: 'live_comments',
          value: {
            from: { id: 'user-1', username: 'tittare' },
            comment_id: 'comment-77',
            text: '!fråga Vad är huvudstaden i Sverige?',
            media: { id: 'live-1' },
          },
        },
      ],
    },
  ],
};

function signed(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('webhook routes', () => {
  it('echoes hub.challenge when the verify token matches', async () => {
    const { app } = createApp({ config: testConfig() });
    const response = await request(app).get('/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test-verify',
      'hub.challenge': '12345',
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.text).toBe('12345');
  });

  it('rejects a bad verify token', async () => {
    const { app } = createApp({ config: testConfig() });
    const response = await request(app).get('/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'nope',
      'hub.challenge': '12345',
    });
    expect(response.status).toBe(403);
  });

  it('accepts a signed live_comments delivery and shows the answer', async () => {
    const ctx = createApp({ config: testConfig() });
    const body = JSON.stringify(payload);
    const response = await request(ctx.app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signed(body, 'test-secret'))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.text).toBe('EVENT_RECEIVED');
    await ctx.tasks.drain();
    expect(ctx.hub.latest?.question).toBe('Vad är huvudstaden i Sverige?');
    expect(ctx.hub.latest?.username).toBe('tittare');
  });

  it('rejects a missing or invalid signature before touching the overlay', async () => {
    const ctx = createApp({ config: testConfig() });
    const body = JSON.stringify(payload);
    const response = await request(ctx.app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signed(body, 'wrong-secret'))
      .send(body);

    expect(response.status).toBe(401);
    await ctx.tasks.drain();
    expect(ctx.hub.latest).toBeNull();
  });

  it('rejects invalid JSON', async () => {
    const ctx = createApp({ config: testConfig() });
    const body = '{';
    const response = await request(ctx.app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signed(body, 'test-secret'))
      .send(body);
    expect(response.status).toBe(400);
  });
});
