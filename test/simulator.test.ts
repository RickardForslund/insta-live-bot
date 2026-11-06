import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import request from 'supertest';
import { WebSocket } from 'ws';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { testConfig } from './helpers.js';

describe('simulator and overlay', () => {
  it('serves the overlay page and hides the simulator when it is disabled', async () => {
    const enabled = createApp({ config: testConfig({ simulatorEnabled: true }) });
    const page = await request(enabled.app).get('/overlay');
    expect(page.status).toBe(200);
    expect(page.text).toContain('id="card"');
    expect(page.text).toContain('/overlay/overlay.js');

    const dev = await request(enabled.app).get('/dev');
    expect(dev.status).toBe(200);
    expect(dev.text).toContain('/dev/simulate');

    const disabled = createApp({ config: testConfig({ simulatorEnabled: false }) });
    const hidden = await request(disabled.app).get('/dev');
    expect(hidden.status).toBe(404);
  });

  it('pushes a simulated question onto the overlay websocket', async () => {
    const ctx = createApp({ config: testConfig() });
    const server = createServer(ctx.app);
    const wss = ctx.attachWebSocket(server);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const messages: string[] = [];
    let ws: WebSocket | undefined;
    try {
      const address = server.address() as AddressInfo;
      ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
      // Buffer frames immediately. The hello frame can arrive in the same
      // tick as `open`, before a later listener would be attached.
      ws.on('message', (data) => {
        messages.push(data.toString());
      });
      await once(ws, 'open');
      await waitFor(() => messages.length > 0);
      expect(JSON.parse(messages[0] ?? '{}')).toMatchObject({ type: 'hello', card: null });

      const response = await request(ctx.app).post('/dev/simulate').send({
        username: 'tittare',
        text: '!fråga Vad är huvudstaden i Sverige?',
      });

      expect(response.status).toBe(200);
      expect(response.body.handled).toBe(true);
      expect(response.body.overlay.answer).toContain('huvudstaden i Sverige');
      expect(response.body.privateReply).toEqual({ status: 'disabled' });

      await waitFor(() => messages.some((raw) => raw.includes('"show"')));
      const shown = JSON.parse(messages.find((raw) => raw.includes('"show"')) ?? '{}') as {
        type: string;
        card: { question: string; username: string };
      };
      expect(shown.type).toBe('show');
      expect(shown.card.question).toBe('Vad är huvudstaden i Sverige?');
      expect(shown.card.username).toBe('tittare');
    } finally {
      ws?.close();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('requires comment text', async () => {
    const { app } = createApp({ config: testConfig() });
    const response = await request(app).post('/dev/simulate').send({ text: '   ' });
    expect(response.status).toBe(400);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 2_000) throw new Error('timed out waiting for a websocket message');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('loadConfig', () => {
  it('keeps private replies off and the simulator on in development', () => {
    const config = loadConfig({ NODE_ENV: 'development' });
    expect(config.privateRepliesEnabled).toBe(false);
    expect(config.simulatorEnabled).toBe(true);
    expect(config.graphApiVersion).toBe('v25.0');
    expect(config.commandPrefix).toBe('!');
  });

  it('turns the simulator off in production unless asked', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).simulatorEnabled).toBe(false);
    expect(loadConfig({ NODE_ENV: 'production', SIMULATOR_ENABLED: 'true' }).simulatorEnabled).toBe(
      true,
    );
  });

  it('normalises a Graph version without the v prefix', () => {
    expect(loadConfig({ GRAPH_API_VERSION: '25.0' }).graphApiVersion).toBe('v25.0');
  });
});
