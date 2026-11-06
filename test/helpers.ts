import type { Config } from '../src/config.js';
import { DEFAULT_SYSTEM_PROMPT } from '../src/config.js';

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    host: '127.0.0.1',
    port: 0,
    nodeEnv: 'test',
    metaAppSecret: 'test-secret',
    metaVerifyToken: 'test-verify',
    igUserId: '17890000000000000',
    igAccessToken: 'test-token',
    graphApiVersion: 'v25.0',
    graphApiBaseUrl: 'https://graph.instagram.com',
    privateRepliesEnabled: false,
    simulatorEnabled: true,
    commandPrefix: '!',
    overlayHideMs: 12_000,
    llmApiKey: '',
    llmBaseUrl: 'https://api.openai.com/v1',
    llmModel: 'gpt-4o-mini',
    llmSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    ...overrides,
  };
}
