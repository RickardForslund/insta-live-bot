import type { Config } from '../config.js';
import { isRecord } from '../util.js';

/**
 * Private replies are the only supported way to answer an Instagram Live comment.
 * The API does not let an app publish a public comment or a public reply on a Live video.
 * One message can be sent per comment. On Live, that message has to go out while the
 * broadcast is still active. After the viewer replies, the normal messaging window applies.
 *
 * POST {GRAPH_API_BASE_URL}/{version}/{IG_USER_ID}/messages
 * { "recipient": { "comment_id": "<id>" }, "message": { "text": "<text>" } }
 */
const MAX_DM_CHARS = 1000;

export type PrivateReplyOutcome =
  | { status: 'disabled' }
  | { status: 'skipped'; reason: string }
  | { status: 'sent'; messageId?: string; recipientId?: string }
  | { status: 'error'; message: string };

export function graphUrl(config: Config, path: string): string {
  const version = config.graphApiVersion.replace(/^\/+|\/+$/g, '');
  const suffix = path.replace(/^\/+/, '');
  return `${config.graphApiBaseUrl}/${version}/${suffix}`;
}

export async function sendPrivateReply(options: {
  config: Config;
  commentId: string;
  text: string;
  fetchImpl?: typeof fetch;
}): Promise<PrivateReplyOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!options.config.privateRepliesEnabled) return { status: 'disabled' };
  if (!options.config.igAccessToken) {
    return { status: 'skipped', reason: 'missing IG_ACCESS_TOKEN' };
  }
  if (!options.config.igUserId) return { status: 'skipped', reason: 'missing IG_USER_ID' };
  if (!options.commentId) return { status: 'skipped', reason: 'missing comment id' };

  const text = options.text.trim();
  if (!text) return { status: 'skipped', reason: 'empty text' };
  const clipped =
    text.length > MAX_DM_CHARS ? `${text.slice(0, MAX_DM_CHARS - 1).trimEnd()}…` : text;

  const url = graphUrl(options.config, `${options.config.igUserId}/messages`);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.config.igAccessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { comment_id: options.commentId },
        message: { text: clipped },
      }),
    });
    const parsed = await readJson(response);
    if (!response.ok) {
      return { status: 'error', message: graphErrorMessage(parsed, response.status) };
    }
    return {
      status: 'sent',
      ...(isRecord(parsed) && typeof parsed.message_id === 'string'
        ? { messageId: parsed.message_id }
        : {}),
      ...(isRecord(parsed) && typeof parsed.recipient_id === 'string'
        ? { recipientId: parsed.recipient_id }
        : {}),
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'request failed',
    };
  }
}

/**
 * GET /{ig-user-id}/live_media lists media that is live right now.
 * An empty list means there is no active broadcast to receive comments from.
 */
export async function listLiveMedia(options: {
  config: Config;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!options.config.igAccessToken || !options.config.igUserId) {
    return { ok: false, message: 'IG_USER_ID and IG_ACCESS_TOKEN are required' };
  }
  const url = new URL(graphUrl(options.config, `${options.config.igUserId}/live_media`));
  url.searchParams.set('fields', 'id,media_type,media_product_type,permalink,timestamp');
  try {
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${options.config.igAccessToken}` },
    });
    const parsed = await readJson(response);
    if (!response.ok) {
      return { ok: false, message: graphErrorMessage(parsed, response.status) };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'request failed' };
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function graphErrorMessage(parsed: unknown, status: number): string {
  if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string') {
    const code = typeof parsed.error.code === 'number' ? ` (${parsed.error.code})` : '';
    return `Graph API ${status}${code}: ${parsed.error.message}`;
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    return `Graph API ${status}: ${parsed.slice(0, 300)}`;
  }
  return `Graph API ${status}`;
}
