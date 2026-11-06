import { existsSync } from 'node:fs';

/** Load a dotenv file without overriding variables that are already set. */
export function loadEnvFile(file = '.env'): void {
  if (!existsSync(file)) return;
  process.loadEnvFile(file);
}
