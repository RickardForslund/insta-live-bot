import type { AnswerProvider } from '../answers/types.js';
import { helpCommand } from './help.js';
import { helloCommand } from './hello.js';
import { createQuestionCommand } from './question.js';
import type { CommandRegistry } from './registry.js';

export function registerBuiltinCommands(registry: CommandRegistry, provider: AnswerProvider): void {
  registry.register(helpCommand);
  registry.register(helloCommand);
  registry.register(createQuestionCommand(provider));
}
