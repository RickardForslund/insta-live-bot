import type { LiveComment, OverlayKind } from '../types.js';
import type { CommandRegistry } from './registry.js';

export interface CommandContext {
  comment: LiveComment;
  args: string;
  prefix: string;
  registry: CommandRegistry;
  hideAfterMs: number;
}

export interface CommandOverlay {
  kind: OverlayKind;
  question: string;
  answer: string;
}

export interface CommandResult {
  /** Card for the OBS overlay. Null leaves the overlay untouched. */
  overlay: CommandOverlay | null;
  /** DM body. Null means this command does not request a private reply. */
  privateReplyText: string | null;
}

export interface Command {
  /** Canonical name without the prefix, compared case-insensitively. */
  name: string;
  aliases?: string[];
  description: string;
  /** Usage after the prefix, for example `fråga <text>`. */
  usage: string;
  execute(ctx: CommandContext): Promise<CommandResult>;
}
