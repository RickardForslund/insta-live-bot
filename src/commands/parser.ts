export interface ParsedCommand {
  name: string;
  args: string;
}

/**
 * Split a live comment into a command name and the remaining text.
 * Names are limited to letters, numbers, `_` and `-`, then lowercased for Swedish.
 */
export function parseCommand(text: string, prefix: string): ParsedCommand | null {
  if (!prefix) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) return null;

  const rest = trimmed.slice(prefix.length).trim();
  if (!rest) return null;

  const splitAt = rest.search(/\s/u);
  const rawName = splitAt === -1 ? rest : rest.slice(0, splitAt);
  const args = splitAt === -1 ? '' : rest.slice(splitAt + 1).trim();
  if (!/^[\p{L}\p{N}_-]+$/u.test(rawName)) return null;

  return {
    name: rawName.toLocaleLowerCase('sv'),
    args,
  };
}
