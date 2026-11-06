import { randomUUID } from 'node:crypto';
import { WebSocket, type WebSocket as WebSocketConnection } from 'ws';
import type { CommandOverlay } from '../commands/types.js';
import type { OverlayCard, OverlayServerMessage } from '../types.js';

export class OverlayHub {
  private readonly clients = new Set<WebSocketConnection>();
  private current: OverlayCard | null = null;

  constructor(private readonly hideAfterMs: number) {}

  get latest(): OverlayCard | null {
    return this.current;
  }

  clientCount(): number {
    return this.clients.size;
  }

  add(socket: WebSocketConnection): void {
    this.clients.add(socket);
    this.send(socket, {
      type: 'hello',
      hideAfterMs: this.hideAfterMs,
      card: this.current,
    });
    socket.on('close', () => {
      this.clients.delete(socket);
    });
    socket.on('error', () => {
      this.clients.delete(socket);
    });
  }

  show(cardInput: CommandOverlay & { username: string }): OverlayCard {
    const card: OverlayCard = {
      id: randomUUID(),
      kind: cardInput.kind,
      username: cardInput.username,
      question: cardInput.question,
      answer: cardInput.answer,
      hideAfterMs: this.hideAfterMs,
      createdAt: new Date().toISOString(),
    };
    this.current = card;
    this.broadcast({ type: 'show', card });
    return card;
  }

  private broadcast(message: OverlayServerMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  private send(socket: WebSocketConnection, message: OverlayServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }
}
