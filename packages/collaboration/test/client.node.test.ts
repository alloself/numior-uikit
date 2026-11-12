import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  ClientMessageKind,
  CollabFailure,
  CollabStatusKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
} from '../src';
import {
  createClientDriver,
  lastPull,
  sentOfKind,
  type ClientDriver,
  type ClientDriverOptions,
} from './harness/client-driver';

const online = (options?: ClientDriverOptions): ClientDriver => {
  const driver = createClientDriver(options);

  driver.open();
  driver.welcome(0);
  return driver;
};

const presenceSent = (driver: ClientDriver): readonly unknown[] =>
  sentOfKind(driver, ClientMessageKind.Presence).reduce<unknown[]>((states, message) => {
    if (message.kind === ClientMessageKind.Presence) {
      states.push(message.state);
    }
    return states;
  }, []);

const sentSteps = (driver: ClientDriver): number =>
  sentOfKind(driver, ClientMessageKind.Steps).length;

const sentPings = (driver: ClientDriver): number =>
  sentOfKind(driver, ClientMessageKind.Ping).length;

const QUIET = 15_000;

const UNANSWERED = 10_000;

const RETRY = 200;

const reconnected = (driver: ClientDriver): void => {
  vi.advanceTimersByTime(RETRY);
  driver.open();
  driver.welcome(driver.version() ?? 0);
};

describe('collaboration client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('introduces itself with the local version and schema', () => {
    const driver = createClientDriver({ version: 4 });

    driver.open();

    expect(driver.sent()[0]).toEqual({
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'me',
      version: 4,
      schema: { name: 'fixture', version: 1 },
    });
  });

  it('asks for a snapshot without a local document and loads it', () => {
    const driver = createClientDriver({ version: null });

    driver.open();
    driver.welcome(7, { any: 'snapshot' });

    expect(driver.sent()[0]).toMatchObject({ version: null });
    expect(driver.version()).toBe(7);
    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);
  });

  it('fails when the snapshot cannot be loaded', () => {
    const driver = createClientDriver({ version: null, loadable: false });

    driver.open();
    driver.welcome(7, {});

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Document,
    });
  });

  it('holds a single batch in flight until it is accepted', () => {
    const driver = online();

    driver.edit();
    driver.edit(2);

    expect(sentSteps(driver)).toBe(1);

    driver.accept(1, 1);

    expect(sentSteps(driver)).toBe(2);
    expect(driver.sent().at(-1)).toMatchObject({ seq: 2, version: 1 });

    driver.accept(2, 3);

    expect(driver.pending()).toBe(0);
    expect(driver.version()).toBe(3);
  });

  it('ignores an acknowledgement of another batch', () => {
    const driver = online();

    driver.edit();

    driver.accept(99, 1);

    expect(driver.pending()).toBe(1);
  });

  it('applies steps of other clients in order', () => {
    const driver = online();

    driver.steps(0, 'other', 2);

    expect(driver.received()).toEqual([expect.objectContaining({ version: 0, clientId: 'other' })]);
    expect(driver.version()).toBe(2);
  });

  it('pulls when a batch skips versions', () => {
    const driver = online();

    driver.steps(5, 'other');

    expect(lastPull(driver)).toBe(0);
    expect(driver.received()).toHaveLength(0);
  });

  it('skips the part of a batch it already has', () => {
    const driver = createClientDriver({ version: 2 });

    driver.open();
    driver.welcome(2);
    driver.steps(0, 'other', 3);

    expect(driver.received()[0]?.steps).toHaveLength(1);
    expect(driver.received()[0]?.version).toBe(2);
    expect(driver.version()).toBe(3);
  });

  it('ignores a batch it already has completely', () => {
    const driver = createClientDriver({ version: 2 });

    driver.open();
    driver.welcome(2);
    driver.steps(0, 'other', 2);

    expect(driver.received()).toHaveLength(0);
  });

  it('confirms its own steps when they come back through a pull', () => {
    const driver = online();

    driver.edit();
    driver.drop();
    vi.runOnlyPendingTimers();
    driver.open();
    driver.welcome(1);

    expect(lastPull(driver)).toBe(0);

    driver.steps(0, 'me');

    expect(driver.pending()).toBe(0);
    expect(driver.received()).toHaveLength(0);
  });

  it('applies own steps the queue no longer holds as ordinary steps', () => {
    const driver = online();

    driver.edit();
    driver.steps(0, 'me', 3);

    expect(driver.pending()).toBe(0);
    expect(driver.version()).toBe(3);
    expect(driver.received()).toMatchObject([{ version: 1, clientId: 'me' }]);
    expect(driver.received()[0]?.steps).toHaveLength(2);
  });

  it('replaces the batch in flight with the steps the server rebased', () => {
    const driver = online();

    driver.edit(2);
    driver.steps(0, 'other');
    driver.accept(1, 2, 1);

    expect(driver.settled()).toMatchObject([{ count: 2, steps: [{ kind: 'replace' }] }]);
    expect(driver.pending()).toBe(0);
    expect(driver.version()).toBe(2);
    expect(driver.statuses().at(-1)).toBe(CollabStatusKind.Online);
  });

  it('sends the next batch once the rebased one is settled', () => {
    const driver = online();

    driver.edit();
    driver.steps(0, 'other');
    driver.edit();
    driver.accept(1, 2, 1);

    expect(sentSteps(driver)).toBe(2);
    expect(driver.pending()).toBe(1);
  });

  it('stops when rebased steps do not follow its version', () => {
    const driver = online();

    driver.edit();
    driver.accept(1, 3, 1);

    expect(driver.settled()).toHaveLength(0);

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Protocol,
    });
  });

  it('stops when the rebased steps cannot be applied', () => {
    const driver = online({ receivable: false });

    driver.edit();
    driver.accept(1, 1, 1);

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Document,
    });
  });

  it('settles its queue with a whole batch of its own that comes back through a pull', () => {
    const driver = online();

    driver.edit(3);
    driver.drop();
    vi.runOnlyPendingTimers();
    driver.open();
    driver.welcome(1);
    driver.steps(0, 'me', 1, 2);

    expect(driver.settled()).toMatchObject([{ count: 2 }]);
    expect(driver.pending()).toBe(1);
    expect(driver.version()).toBe(1);
  });

  it('catches up and resends after a stale rejection', () => {
    const driver = online();

    driver.edit();
    driver.reject(1, RejectReason.Stale, 2);

    expect(lastPull(driver)).toBe(0);
    expect(sentSteps(driver)).toBe(1);

    driver.steps(0, 'other', 2);

    expect(sentSteps(driver)).toBe(2);
    expect(driver.sent().at(-1)).toMatchObject({ seq: 2, version: 2 });
  });

  it('resends at once when the stale rejection is already caught up', () => {
    const driver = online();

    driver.edit();
    driver.steps(0, 'other');
    driver.reject(1, RejectReason.Stale, 1);

    expect(sentSteps(driver)).toBe(2);
    expect(sentOfKind(driver, ClientMessageKind.Pull)).toHaveLength(0);
  });

  it('holds new steps while it is behind a known version', () => {
    const driver = createClientDriver({ version: 1 });

    driver.open();
    driver.welcome(3);
    driver.edit();

    expect(sentSteps(driver)).toBe(0);

    driver.steps(1, 'other', 2);

    expect(sentSteps(driver)).toBe(1);
  });

  it('ignores a rejection of another batch', () => {
    const driver = online();

    driver.edit();

    driver.reject(99, RejectReason.Invalid, 0);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);
  });

  it('stops on a refused batch', () => {
    const driver = online();

    driver.edit();
    driver.reject(1, RejectReason.Invalid, 0);

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Invalid,
    });
  });

  it('stops when steps of others cannot be read', () => {
    const driver = online({ receivable: false });

    driver.steps(0, 'other');

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Document,
    });
  });

  it('stops when the local document is ahead of the server', () => {
    const driver = createClientDriver({ version: 5 });

    driver.open();
    driver.welcome(2);

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Diverged,
    });
  });

  it.each([
    [ServerErrorCode.Schema, CollabFailure.Schema],
    [ServerErrorCode.Protocol, CollabFailure.Protocol],
  ])('stops on the server error %s', (code, reason) => {
    const driver = online();

    driver.deliver({ kind: ServerMessageKind.Error, code });

    expect(driver.client.status()).toEqual({ kind: CollabStatusKind.Failed, reason });
  });

  it.each([
    ['garbage', 'nonsense'],
    ['an unknown kind', { kind: 'nope' }],
    ['a malformed welcome', { kind: ServerMessageKind.Welcome, version: -1, presence: [] }],
    ['a malformed presence list', { kind: ServerMessageKind.Welcome, version: 0, presence: [1] }],
    ['malformed presence', { kind: ServerMessageKind.Presence, clientId: 1, state: 1 }],
    ['a malformed acknowledgement', { kind: ServerMessageKind.Accepted, seq: 'a', version: 1 }],
    [
      'a malformed rejection',
      { kind: ServerMessageKind.Rejected, seq: 1, reason: 'x', version: 1 },
    ],
    ['malformed steps', { kind: ServerMessageKind.Steps, version: 0, clientId: 'x', steps: [1] }],
    ['a malformed error', { kind: ServerMessageKind.Error, code: 'x' }],
  ])('stops on %s from the server', (_name, value) => {
    const driver = online();

    driver.deliver(value);

    expect(driver.client.status()).toEqual({
      kind: CollabStatusKind.Failed,
      reason: CollabFailure.Protocol,
    });
  });

  it('reconnects with a growing delay and resets it once welcomed', () => {
    const driver = online();

    driver.drop();

    expect(driver.client.status().kind).toBe(CollabStatusKind.Offline);

    vi.advanceTimersByTime(99);

    expect(driver.opens()).toBe(1);

    vi.advanceTimersByTime(101);

    expect(driver.opens()).toBe(2);

    driver.drop();
    vi.advanceTimersByTime(199);

    expect(driver.opens()).toBe(2);

    vi.advanceTimersByTime(201);

    expect(driver.opens()).toBe(3);

    driver.open();
    driver.welcome(0);
    driver.drop();
    vi.advanceTimersByTime(200);

    expect(driver.opens()).toBe(4);
  });

  it('resends unconfirmed steps after a reconnect', () => {
    const driver = online();

    driver.edit();
    driver.drop();
    vi.runOnlyPendingTimers();
    driver.open();
    driver.welcome(0);

    expect(sentSteps(driver)).toBe(2);
    expect(driver.sent().at(-1)).toMatchObject({ seq: 2, version: 0 });
  });

  it('publishes peers from the welcome and from updates', () => {
    const driver = createClientDriver();

    driver.open();

    driver.deliver({
      kind: ServerMessageKind.Welcome,
      version: 0,
      presence: [{ clientId: 'ann', state: 1 }],
    });

    driver.deliver({ kind: ServerMessageKind.Presence, clientId: 'bob', state: 2 });
    driver.deliver({ kind: ServerMessageKind.Presence, clientId: 'ann', state: null });

    expect(driver.peers()).toEqual(new Map([['bob', 2]]));
  });

  it('forgets peers while offline', () => {
    const driver = online();

    driver.deliver({ kind: ServerMessageKind.Presence, clientId: 'bob', state: 2 });
    driver.drop();

    expect(driver.peers().size).toBe(0);
  });

  it('sends presence once per interval and keeps the latest', () => {
    const driver = online();

    driver.client.setPresence('a');
    driver.client.setPresence('b');
    driver.client.setPresence('c');

    expect(presenceSent(driver)).toEqual(['a']);

    vi.advanceTimersByTime(60);

    expect(presenceSent(driver)).toEqual(['a', 'c']);
  });

  it('holds presence while steps wait for the batch in flight', () => {
    const driver = online();

    driver.edit();
    driver.edit();
    driver.client.setPresence('a');

    expect(presenceSent(driver)).toEqual([]);

    driver.accept(1, 1);

    expect(driver.sent().at(-1)).toMatchObject({ kind: ClientMessageKind.Presence, state: 'a' });
  });

  it('sends presence again after a reconnect', () => {
    const driver = online();

    driver.client.setPresence('a');
    vi.advanceTimersByTime(60);
    driver.drop();
    vi.runOnlyPendingTimers();
    driver.open();
    driver.welcome(0);

    expect(presenceSent(driver)).toEqual(['a', 'a']);
  });

  it('refreshes only when online with a document', () => {
    const offline = createClientDriver();
    const driver = online();

    offline.client.refresh();
    driver.client.refresh();

    expect(sentOfKind(offline, ClientMessageKind.Pull)).toHaveLength(0);
    expect(lastPull(driver)).toBe(0);
  });

  it('asks a quiet server whether it is there and reconnects when nothing answers', () => {
    const driver = online();

    vi.advanceTimersByTime(QUIET - 1);

    expect(sentPings(driver)).toBe(0);

    vi.advanceTimersByTime(1);

    expect(driver.sent().at(-1)).toEqual({ kind: ClientMessageKind.Ping });
    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);

    vi.advanceTimersByTime(UNANSWERED);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Offline);

    vi.advanceTimersByTime(RETRY);

    expect(driver.opens()).toBe(2);
  });

  it('stays connected while the server answers and asks again after the next quiet interval', () => {
    const driver = online();

    vi.advanceTimersByTime(QUIET);
    driver.pong();
    vi.advanceTimersByTime(UNANSWERED);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);
    expect(driver.opens()).toBe(1);

    vi.advanceTimersByTime(QUIET - UNANSWERED);

    expect(sentPings(driver)).toBe(2);
  });

  it('does not ask a server that keeps talking', () => {
    const driver = online();

    vi.advanceTimersByTime(QUIET - 1);
    driver.steps(0, 'other');
    vi.advanceTimersByTime(QUIET - 1);

    expect(sentPings(driver)).toBe(0);
  });

  it('reconnects and resends when a batch gets no answer', () => {
    const driver = online();

    driver.edit();
    vi.advanceTimersByTime(UNANSWERED - 1);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);

    vi.advanceTimersByTime(1);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Offline);

    reconnected(driver);

    expect(sentSteps(driver)).toBe(2);
    expect(driver.pending()).toBe(1);
  });

  it('reconnects when the greeting gets no answer', () => {
    const driver = createClientDriver();

    driver.open();
    vi.advanceTimersByTime(UNANSWERED);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Offline);

    vi.advanceTimersByTime(RETRY);

    expect(driver.opens()).toBe(2);
  });

  it('ignores what a connection it gave up on still delivers', () => {
    const driver = online();

    vi.advanceTimersByTime(QUIET + UNANSWERED);
    reconnected(driver);
    driver.deliverLate({ kind: 'nope' });
    driver.steps(0, 'other');
    driver.dropLate();

    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);
    expect(driver.received()).toHaveLength(1);
    expect(driver.opens()).toBe(2);
  });

  it('never asks with the quiet interval switched off and still waits for answers', () => {
    const driver = createClientDriver({ liveness: { interval: 0, timeout: 50 } });

    driver.open();
    driver.welcome(0);
    vi.advanceTimersByTime(QUIET * 4);

    expect(sentPings(driver)).toBe(0);
    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);

    driver.edit();
    vi.advanceTimersByTime(50);

    expect(driver.client.status().kind).toBe(CollabStatusKind.Offline);
  });

  it('greets through a transport that opens before it returns the connection', () => {
    const driver = createClientDriver({ eager: true });

    driver.welcome(0);

    expect(sentOfKind(driver, ClientMessageKind.Hello)).toHaveLength(1);
    expect(driver.client.status().kind).toBe(CollabStatusKind.Online);
  });

  it('stays down after stop', () => {
    const driver = online();

    driver.client.stop();
    vi.runOnlyPendingTimers();

    expect(driver.opens()).toBe(1);
    expect(driver.statuses().at(-1)).toBe(CollabStatusKind.Offline);
  });
});
