import type { Config } from '../config.js';
import { isRecord } from '../util.js';
import type { AnswerProvider, AnswerRequest } from './types.js';

const REQUEST_TIMEOUT_MS = 20_000;

/** OpenAI-compatible `POST /chat/completions` client. */
export class OpenAiCompatibleProvider implements AnswerProvider {
  readonly name = 'openai-compatible';

  constructor(
    private readonly config: Config,
    private readonly fetchImpl: typeof fetch,
  ) {}

  async answer(request: AnswerRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(`${this.config.llmBaseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.config.llmApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.llmModel,
          temperature: 0.4,
          messages: [
            { role: 'system', content: this.config.llmSystemPrompt },
            {
              role: 'user',
              content: `${request.username} frågar: ${request.question}`,
            },
          ],
        }),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(`LLM HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
      }

      let parsed: unknown = null;
      try {
        parsed = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        throw new Error('LLM response was not JSON');
      }
      const text = extractChatText(parsed).trim();
      if (!text) throw new Error('LLM response did not include message content');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function extractChatText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return '';
  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return '';
  return readContent(choice.message.content);
}

function readContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (isRecord(part) && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('');
}
