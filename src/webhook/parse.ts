import type { LiveComment } from '../types.js';
import { isRecord, readString } from '../util.js';

/**
 * Pull `live_comments` out of an Instagram webhook body.
 *
 * Instagram Login sometimes puts `field` and `value` directly on the entry.
 * Facebook Login and Unified Login use `entry[].changes[]`.
 * The comment id is `value.comment_id` in one shape and `value.id` in the other.
 * Other fields (including regular `comments`) are ignored.
 */
export function parseLiveComments(body: unknown): LiveComment[] {
  if (!isRecord(body) || body.object !== 'instagram' || !Array.isArray(body.entry)) {
    return [];
  }

  const comments: LiveComment[] = [];
  for (const entry of body.entry) {
    if (!isRecord(entry)) continue;
    const igAccountId = readString(entry.id);
    const timestamp = typeof entry.time === 'number' ? entry.time : undefined;
    for (const change of entryChanges(entry)) {
      if (change.field !== 'live_comments' || !isRecord(change.value)) continue;
      const comment = toLiveComment(change.value, igAccountId, timestamp);
      if (comment) comments.push(comment);
    }
  }
  return comments;
}

function entryChanges(entry: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(entry.changes)) {
    return entry.changes.filter(isRecord);
  }
  if (typeof entry.field === 'string') {
    return [{ field: entry.field, value: entry.value }];
  }
  return [];
}

function toLiveComment(
  value: Record<string, unknown>,
  igAccountId: string,
  timestamp: number | undefined,
): LiveComment | null {
  const commentId = readString(value.comment_id) || readString(value.id);
  const text = typeof value.text === 'string' ? value.text : '';
  if (!commentId || !text.trim()) return null;

  const from = isRecord(value.from) ? value.from : {};
  const media = isRecord(value.media) ? value.media : {};
  const comment: LiveComment = {
    commentId,
    text,
    username: readString(from.username) || 'okänd',
    userId: readString(from.id),
    mediaId: readString(media.id),
    igAccountId,
  };
  if (timestamp !== undefined) comment.timestamp = timestamp;
  return comment;
}
