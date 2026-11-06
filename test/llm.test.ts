import { describe, expect, it, vi } from 'vitest';
import { createAnswerProvider } from '../src/answers/create.js';
import { extractChatText, OpenAiCompatibleProvider } from '../src/answers/llm.js';
import { testConfig } from './helpers.js';

describe('createAnswerProvider', () => {
  it('uses the stub until an API key is set', () => {
    expect(createAnswerProvider(testConfig(), fetch).name).toBe('stub');
    expect(createAnswerProvider(testConfig({ llmApiKey: 'sk-test' }), fetch).name).toBe(
      'openai-compatible',
    );
  });
});

describe('OpenAiCompatibleProvider', () => {
  it('reads the assistant message from a chat completion', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        choices: [{ message: { role: 'assistant', content: 'Stockholm.' } }],
      }),
    );
    const provider = new OpenAiCompatibleProvider(
      testConfig({ llmApiKey: 'sk-test', llmModel: 'demo-model' }),
      fetchImpl,
    );
    await expect(provider.answer({ question: 'Huvudstad?', username: 'tittare' })).resolves.toBe(
      'Stockholm.',
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe('demo-model');
    expect(body.messages[0]?.role).toBe('system');
    expect(body.messages[1]?.content).toContain('Huvudstad?');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-test');
  });

  it('joins array content parts', () => {
    expect(
      extractChatText({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'Hej' },
                { type: 'text', text: '!' },
              ],
            },
          },
        ],
      }),
    ).toBe('Hej!');
  });

  it('throws when the API returns an error status', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('nope', { status: 500 }));
    const provider = new OpenAiCompatibleProvider(testConfig({ llmApiKey: 'sk-test' }), fetchImpl);
    await expect(provider.answer({ question: 'Hej', username: 'a' })).rejects.toThrow(
      /LLM HTTP 500/,
    );
  });
});
