import type { AnswerProvider } from '../answers/types.js';
import { log } from '../logger.js';
import { clampText } from '../util.js';
import type { Command } from './types.js';

/** Keep stream cards and DMs readable. Instagram text messages allow 1000 characters. */
const MAX_ANSWER_CHARS = 700;

export function createQuestionCommand(provider: AnswerProvider): Command {
  return {
    name: 'fråga',
    aliases: ['fraga', 'ask', 'q'],
    description: 'Ställ en fråga som visas med svar i sändningen',
    usage: 'fråga <text>',
    async execute(ctx) {
      const question = ctx.args.trim();
      if (!question) {
        const answer = `Skriv en fråga efter kommandot, till exempel ${ctx.prefix}fråga Vad är klockan?`;
        return {
          overlay: { kind: 'info', question: 'Tom fråga', answer },
          privateReplyText: answer,
        };
      }

      let answer: string;
      try {
        answer = clampText(
          await provider.answer({ question, username: ctx.comment.username }),
          MAX_ANSWER_CHARS,
        );
      } catch (error) {
        log.warn('Answer provider failed', error instanceof Error ? error.message : error);
        answer = 'Kunde inte generera ett svar just nu. Försök igen om en stund.';
      }
      if (!answer) answer = 'Jag fick inget svar att visa.';

      return {
        overlay: { kind: 'question', question, answer },
        privateReplyText: answer,
      };
    },
  };
}
