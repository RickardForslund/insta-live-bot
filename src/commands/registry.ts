import type { Command } from './types.js';

export class CommandRegistry {
  private readonly byName = new Map<string, Command>();

  register(command: Command): void {
    const names = [command.name, ...(command.aliases ?? [])];
    for (const name of names) {
      const key = name.toLocaleLowerCase('sv');
      const existing = this.byName.get(key);
      if (existing && existing !== command) {
        throw new Error(`Duplicate command name: ${key}`);
      }
      this.byName.set(key, command);
    }
  }

  resolve(name: string): Command | undefined {
    return this.byName.get(name.toLocaleLowerCase('sv'));
  }

  /** Unique commands in registration order, ignoring aliases. */
  list(): Command[] {
    const seen = new Set<Command>();
    const commands: Command[] = [];
    for (const command of this.byName.values()) {
      if (seen.has(command)) continue;
      seen.add(command);
      commands.push(command);
    }
    return commands;
  }
}
