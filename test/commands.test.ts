import { describe, expect, it } from 'vitest';
import { StubAnswerProvider } from '../src/answers/stub.js';
import { registerBuiltinCommands } from '../src/commands/builtin.js';
import { CommandRegistry } from '../src/commands/registry.js';
import type { CommandContext } from '../src/commands/types.js';
import type { LiveComment } from '../src/types.js';

function context(registry: CommandRegistry, text: string, args: string): CommandContext {
  const comment: LiveComment = {
    commentId: 'c1',
    text,
    username: 'tittare',
    userId: 'u1',
    mediaId: 'm1',
    igAccountId: 'ig',
  };
  return {
    comment,
    args,
    prefix: '!',
    registry,
    hideAfterMs: 1000,
  };
}

describe('command registry', () => {
  const registry = new CommandRegistry();
  registerBuiltinCommands(registry, new StubAnswerProvider());

  it('resolves aliases to the canonical command', () => {
    expect(registry.resolve('fraga')?.name).toBe('fråga');
    expect(registry.resolve('HELP')?.name).toBe('hjälp');
    expect(registry.resolve('hi')?.name).toBe('hej');
    expect(registry.resolve('okänd')).toBeUndefined();
  });

  it('lists each command once', () => {
    const names = registry.list().map((command) => command.name);
    expect(names).toEqual(['hjälp', 'hej', 'fråga']);
  });

  it('rejects a duplicate name', () => {
    expect(() => registry.register(registry.resolve('hej')!)).not.toThrow();
    expect(() =>
      registry.register({
        name: 'hej',
        description: 'annan',
        usage: 'hej',
        async execute() {
          return { overlay: null, privateReplyText: null };
        },
      }),
    ).toThrow(/Duplicate command/);
  });

  it('renders help from the registry', async () => {
    const result = await registry.resolve('hjälp')!.execute(context(registry, '!hjälp', ''));
    expect(result.overlay?.kind).toBe('help');
    expect(result.overlay?.answer).toContain('!fråga <text>');
    expect(result.overlay?.answer).toContain('!hjälp');
    expect(result.privateReplyText).toBe(result.overlay?.answer);
  });

  it('answers a question with the stub provider', async () => {
    const result = await registry
      .resolve('fråga')!
      .execute(context(registry, '!fråga hej', 'Vad är 2+2?'));
    expect(result.overlay).toMatchObject({
      kind: 'question',
      question: 'Vad är 2+2?',
    });
    expect(result.overlay?.answer).toContain('Vad är 2+2?');
    expect(result.overlay?.answer).toContain('Platshållarsvar');
    expect(result.privateReplyText).toBe(result.overlay?.answer);
  });

  it('asks for text when a question command is empty', async () => {
    const result = await registry.resolve('fråga')!.execute(context(registry, '!fråga', ''));
    expect(result.overlay?.question).toBe('Tom fråga');
    expect(result.overlay?.answer).toContain('!fråga');
  });

  it('turns a provider failure into a visible fallback', async () => {
    const failing = new CommandRegistry();
    registerBuiltinCommands(failing, {
      name: 'broken',
      answer() {
        return Promise.reject(new Error('upstream down'));
      },
    });
    const result = await failing.resolve('fråga')!.execute(context(failing, '!fråga x', 'Hej'));
    expect(result.overlay?.answer).toContain('Kunde inte generera');
  });

  it('greets without requesting a private reply', async () => {
    const result = await registry.resolve('hej')!.execute(context(registry, '!hej', ''));
    expect(result.overlay?.answer).toContain('@tittare');
    expect(result.privateReplyText).toBeNull();
  });
});
