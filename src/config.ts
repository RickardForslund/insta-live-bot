export interface Config {
  host: string;
  port: number;
  nodeEnv: string;
  metaAppSecret: string;
  metaVerifyToken: string;
  igUserId: string;
  igAccessToken: string;
  graphApiVersion: string;
  graphApiBaseUrl: string;
  privateRepliesEnabled: boolean;
  simulatorEnabled: boolean;
  commandPrefix: string;
  overlayHideMs: number;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  llmSystemPrompt: string;
}

export const DEFAULT_SYSTEM_PROMPT = [
  'Du svarar på frågor från tittare i en Instagram-sändning.',
  'Svara kort på svenska, högst tre meningar, utan hashtags och utan att hälsa i varje svar.',
  'Om du inte vet, säg det.',
].join(' ');

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function readBool(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  throw new Error(`Invalid boolean for ${name}: ${raw}`);
}

function readPort(raw: string | undefined): number {
  const text = raw ?? '3000';
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${text}`);
  }
  return port;
}

function normalizeVersion(raw: string | undefined): string {
  const trimmed = raw?.trim() || 'v25.0';
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const prefix = env.COMMAND_PREFIX ?? '!';
  if (!prefix.trim()) {
    throw new Error('COMMAND_PREFIX must not be empty');
  }

  const hideRaw = env.OVERLAY_HIDE_MS?.trim() || '12000';
  const overlayHideMs = Number(hideRaw);
  if (!Number.isInteger(overlayHideMs) || overlayHideMs < 0) {
    throw new Error(`Invalid OVERLAY_HIDE_MS: ${hideRaw}`);
  }

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port: readPort(env.PORT),
    nodeEnv,
    metaAppSecret: env.META_APP_SECRET?.trim() ?? '',
    metaVerifyToken: env.META_VERIFY_TOKEN?.trim() ?? '',
    igUserId: env.IG_USER_ID?.trim() ?? '',
    igAccessToken: env.IG_ACCESS_TOKEN?.trim() ?? '',
    graphApiVersion: normalizeVersion(env.GRAPH_API_VERSION),
    graphApiBaseUrl: (env.GRAPH_API_BASE_URL?.trim() || 'https://graph.instagram.com').replace(
      /\/$/,
      '',
    ),
    privateRepliesEnabled: readBool(env, 'PRIVATE_REPLIES_ENABLED', false),
    simulatorEnabled: readBool(env, 'SIMULATOR_ENABLED', nodeEnv !== 'production'),
    commandPrefix: prefix,
    overlayHideMs,
    llmApiKey: env.LLM_API_KEY?.trim() ?? '',
    llmBaseUrl: (env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, ''),
    llmModel: env.LLM_MODEL?.trim() || 'gpt-4o-mini',
    llmSystemPrompt: env.LLM_SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT,
  };
}
