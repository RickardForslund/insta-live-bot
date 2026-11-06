import { describe, expect, it } from 'vitest';
import { parseLiveComments } from '../src/webhook/parse.js';

describe('parseLiveComments', () => {
  it('reads the changes-array shape used by Facebook Login and Unified Login', () => {
    const comments = parseLiveComments({
      object: 'instagram',
      entry: [
        {
          id: 'ig-account',
          time: 1_700_000_000,
          changes: [
            {
              field: 'live_comments',
              value: {
                from: { id: 'user-1', username: 'tittare' },
                comment_id: 'comment-1',
                text: '!fråga Hej',
                media: { id: 'live-1', media_product_type: 'LIVE' },
              },
            },
            { field: 'comments', value: { id: 'ignore-me', text: 'not live' } },
          ],
        },
      ],
    });

    expect(comments).toEqual([
      {
        commentId: 'comment-1',
        text: '!fråga Hej',
        username: 'tittare',
        userId: 'user-1',
        mediaId: 'live-1',
        igAccountId: 'ig-account',
        timestamp: 1_700_000_000,
      },
    ]);
  });

  it('reads the entry field/value shape and value.id as the comment id', () => {
    const comments = parseLiveComments({
      object: 'instagram',
      entry: [
        {
          id: 'ig-account',
          time: 10,
          field: 'live_comments',
          value: {
            id: 'comment-2',
            from: { id: 'user-2', username: 'anna' },
            text: '!hjälp',
            media: { id: 'live-2' },
          },
        },
      ],
    });

    expect(comments).toHaveLength(1);
    expect(comments[0]?.commentId).toBe('comment-2');
    expect(comments[0]?.username).toBe('anna');
  });

  it('skips payloads that are not Instagram live comments or have no text', () => {
    expect(parseLiveComments(null)).toEqual([]);
    expect(parseLiveComments({ object: 'page', entry: [] })).toEqual([]);
    expect(
      parseLiveComments({
        object: 'instagram',
        entry: [
          {
            id: 'ig',
            changes: [{ field: 'live_comments', value: { comment_id: 'c', text: '   ' } }],
          },
        ],
      }),
    ).toEqual([]);
  });
});
