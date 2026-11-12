import type { ClientMessage, CollabTransport, ServerMessage, TransportListener } from '../../src';

export class FakeWire {
  readonly sent: ClientMessage[] = [];

  private listener: TransportListener | undefined;

  private connections = 0;

  readonly transport: CollabTransport = {
    open: (listener) => {
      this.listener = listener;
      this.connections += 1;

      return {
        send: (message) => {
          this.sent.push(message);
        },
        close: () => {
          listener.closed();
        },
      };
    },
  };

  get opened(): number {
    return this.connections;
  }

  open(): void {
    this.listener?.opened();
  }

  hear(message: ServerMessage): void {
    this.listener?.message(message);
  }
}
