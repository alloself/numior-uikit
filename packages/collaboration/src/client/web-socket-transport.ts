import type { CollabTransport } from './client.types';

const parsed = (data: unknown): unknown => {
  if (typeof data !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};

export const webSocketTransport = (url: string | URL): CollabTransport => ({
  open: (listener) => {
    const socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      listener.opened();
    });

    socket.addEventListener('message', (event) => {
      listener.message(parsed(event.data));
    });

    socket.addEventListener('close', () => {
      listener.closed();
    });

    return {
      send: (message) => {
        socket.send(JSON.stringify(message));
      },
      close: () => {
        socket.close();
      },
    };
  },
});
