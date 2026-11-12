import { describe, expect, it } from 'vite-plus/test';
import { ClientMessageKind } from '../src';
import { parseClientMessage } from '../src/room';

describe('the room entry for an own server', () => {
  it('reads a frame into a client message and drops what breaks the protocol', () => {
    expect(parseClientMessage({ kind: ClientMessageKind.Pull, from: 3 })).toEqual({
      kind: ClientMessageKind.Pull,
      from: 3,
    });

    expect(parseClientMessage({ kind: ClientMessageKind.Pull, from: -1 })).toBeUndefined();
    expect(parseClientMessage({ kind: 'nonsense' })).toBeUndefined();
    expect(parseClientMessage([ClientMessageKind.Ping])).toBeUndefined();
  });
});
