import { loadEnvFile } from '../src/env.js';

loadEnvFile();

const port = process.env.PORT?.trim() || '3000';
const configuredHost = process.env.HOST?.trim() || '127.0.0.1';
const host = configuredHost === '0.0.0.0' ? '127.0.0.1' : configuredHost;

function parseArgs(argv: string[]): { username: string; text: string } {
  let username = 'simulator';
  const words: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith('--user=')) username = arg.slice('--user='.length) || username;
    else words.push(arg);
  }
  const text = words.join(' ').trim() || '!fråga Vad är huvudstaden i Sverige?';
  return { username, text };
}

async function main(): Promise<void> {
  const { username, text } = parseArgs(process.argv.slice(2));
  const url = `http://${host}:${port}/dev/simulate`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, text }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not reach ${url} (${message}). Start the server with npm run dev.`);
    process.exitCode = 1;
    return;
  }

  const body = await response.text();
  console.log(response.status);
  console.log(body);
  if (!response.ok) process.exitCode = 1;
}

await main();
