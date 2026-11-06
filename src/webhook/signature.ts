import { createHmac, timingSafeEqual } from 'node:crypto';

/** Header value Meta sends as `X-Hub-Signature-256`. */
export function signBody(rawBody: Buffer, appSecret: string): string {
  const digest = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return `sha256=${digest}`;
}

export function isValidHubSignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header || !appSecret) return false;
  const actual = Buffer.from(header.trim().toLowerCase());
  const expected = Buffer.from(signBody(rawBody, appSecret));
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function tokensMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
