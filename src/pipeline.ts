import type { Config } from './config.js';
import { parseCommand } from './commands/parser.js';
import type { CommandRegistry } from './commands/registry.js';
import type { PrivateReplyOutcome } from './instagram/client.js';
import { sendPrivateReply } from './instagram/client.js';
import { log } from './logger.js';
import type { OverlayHub } from './overlay/hub.js';
import type { TtlSet } from './dedupe.js';
import type { LiveComment, OverlayCard } from './types.js';

export interface PipelineDeps {
  config: Config;
  registry: CommandRegistry;
  hub: OverlayHub;
  dedupe: TtlSet;
  fetchImpl?: typeof fetch;
}

export interface PipelineResult {
  handled: boolean;
  reason?: 'not-a-command' | 'unknown-command' | 'duplicate';
  command?: string;
  overlay: OverlayCard | null;
  privateReply: PrivateReplyOutcome | null;
}

export async function handleLiveComment(
  comment: LiveComment,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  if (!deps.dedupe.add(comment.commentId)) {
    log.info(`Skipping duplicate comment ${comment.commentId}`);
    return { handled: false, reason: 'duplicate', overlay: null, privateReply: null };
  }

  const parsed = parseCommand(comment.text, deps.config.commandPrefix);
  if (!parsed) {
    return { handled: false, reason: 'not-a-command', overlay: null, privateReply: null };
  }

  const command = deps.registry.resolve(parsed.name);
  if (!command) {
    log.info(`Unknown command “${parsed.name}” from @${comment.username}`);
    return {
      handled: false,
      reason: 'unknown-command',
      command: parsed.name,
      overlay: null,
      privateReply: null,
    };
  }

  log.info(`Command ${deps.config.commandPrefix}${command.name} from @${comment.username}`);
  const result = await command.execute({
    comment,
    args: parsed.args,
    prefix: deps.config.commandPrefix,
    registry: deps.registry,
    hideAfterMs: deps.config.overlayHideMs,
  });

  const overlay = result.overlay
    ? deps.hub.show({ ...result.overlay, username: comment.username })
    : null;

  let privateReply: PrivateReplyOutcome | null = null;
  if (result.privateReplyText) {
    privateReply = await sendPrivateReply({
      config: deps.config,
      commentId: comment.commentId,
      text: result.privateReplyText,
      ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    });
    if (privateReply.status === 'error') {
      log.warn(`Private reply failed for ${comment.commentId}`, privateReply.message);
    } else if (privateReply.status === 'sent') {
      log.info(`Private reply sent for comment ${comment.commentId}`);
    }
  }

  return {
    handled: true,
    command: command.name,
    overlay,
    privateReply,
  };
}
