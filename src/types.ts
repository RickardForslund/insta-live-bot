/** A live comment normalized from either Instagram webhook shape. */
export interface LiveComment {
  commentId: string;
  text: string;
  username: string;
  userId: string;
  mediaId: string;
  igAccountId: string;
  timestamp?: number;
}

export type OverlayKind = 'question' | 'help' | 'info';

export interface OverlayCard {
  id: string;
  kind: OverlayKind;
  username: string;
  question: string;
  answer: string;
  hideAfterMs: number;
  createdAt: string;
}

export type OverlayServerMessage =
  | { type: 'hello'; hideAfterMs: number; card: OverlayCard | null }
  | { type: 'show'; card: OverlayCard }
  | { type: 'hide' };
