import type { Command } from './types.js';

export const helpCommand: Command = {
  name: 'hjälp',
  aliases: ['help', 'hjalp'],
  description: 'Visa tillgängliga kommandon',
  usage: 'hjälp',
  async execute(ctx) {
    const lines = ctx.registry.list().map((command) => {
      return `${ctx.prefix}${command.usage} — ${command.description}`;
    });
    const answer = lines.join('\n');
    return {
      overlay: {
        kind: 'help',
        question: 'Tillgängliga kommandon',
        answer,
      },
      privateReplyText: answer,
    };
  },
};
