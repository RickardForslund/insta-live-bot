import type { Config } from '../config.js';
import { OpenAiCompatibleProvider } from './llm.js';
import { StubAnswerProvider } from './stub.js';
import type { AnswerProvider } from './types.js';

export function createAnswerProvider(config: Config, fetchImpl: typeof fetch): AnswerProvider {
  if (!config.llmApiKey) return new StubAnswerProvider();
  return new OpenAiCompatibleProvider(config, fetchImpl);
}
