import type { Command } from './types.js';

/** Small command that does not call the answer generator. Copy this to add your own. */
export const helloCommand: Command = {
  name: 'hej',
  aliases: ['hello', 'hi'],
  description: 'Hälsa tillbaka',
  usage: 'hej',
  async execute(ctx) {
    const answer = `Hej @${ctx.comment.username}! Skriv ${ctx.prefix}fråga och din fråga så svarar jag.`;
    return {
      overlay: {
        kind: 'info',
        question: 'Hej!',
        answer,
      },
      privateReplyText: null,
    };
  },
};
