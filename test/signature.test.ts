import { describe, expect, it } from 'vitest';
import { isValidHubSignature, signBody, tokensMatch } from '../src/webhook/signature.js';

const secret = 'app-secret';
const body = Buffer.from('{"object":"instagram"}');

describe('isValidHubSignature', () => {
  it('accepts a sha256 signature of the raw body', () => {
    expect(isValidHubSignature(body, signBody(body, secret), secret)).toBe(true);
  });

  it('accepts the header in uppercase', () => {
    expect(isValidHubSignature(body, signBody(body, secret).toUpperCase(), secret)).toBe(true);
  });

  it('rejects a missing, tampered, or wrongly signed header', () => {
    expect(isValidHubSignature(body, undefined, secret)).toBe(false);
    expect(isValidHubSignature(body, 'sha256=abc', secret)).toBe(false);
    expect(isValidHubSignature(body, signBody(body, 'other-secret'), secret)).toBe(false);
    expect(
      isValidHubSignature(Buffer.from('{"changed":true}'), signBody(body, secret), secret),
    ).toBe(false);
    expect(isValidHubSignature(body, signBody(body, secret), '')).toBe(false);
  });
});

describe('tokensMatch', () => {
  it('compares equal strings and rejects empty or different lengths', () => {
    expect(tokensMatch('dev-verify-token', 'dev-verify-token')).toBe(true);
    expect(tokensMatch('dev-verify-token', 'other')).toBe(false);
    expect(tokensMatch('', '')).toBe(false);
  });
});
