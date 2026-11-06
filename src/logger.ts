const quietInfo = process.env.VITEST === 'true';

function write(level: 'info' | 'warn' | 'error', message: string, extra?: unknown): void {
  if (level === 'info' && quietInfo) return;
  const line = `[${level}] ${message}`;
  if (extra === undefined) {
    console[level === 'info' ? 'log' : level](line);
    return;
  }
  console[level === 'info' ? 'log' : level](line, extra);
}

export const log = {
  info(message: string, extra?: unknown): void {
    write('info', message, extra);
  },
  warn(message: string, extra?: unknown): void {
    write('warn', message, extra);
  },
  error(message: string, extra?: unknown): void {
    write('error', message, extra);
  },
};
