import type { AnswerProvider, AnswerRequest } from './types.js';

/** Used when no LLM API key is configured, so the overlay still works locally. */
export class StubAnswerProvider implements AnswerProvider {
  readonly name = 'stub';

  answer(request: AnswerRequest): Promise<string> {
    return Promise.resolve(
      `Platshållarsvar (ingen LLM är konfigurerad): “${request.question.trim()}”.`,
    );
  }
}
