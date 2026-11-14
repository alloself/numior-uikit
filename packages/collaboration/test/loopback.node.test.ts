import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { SETTLE_MS, createLoopbackPair, openRawLine } from './harness/loopback';
import { paragraphs } from './harness/network';

describe('a room in the page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('brings what one pane types to the other', () => {
    const [ann, bob] = createLoopbackPair(paragraphs('chair'));
    vi.advanceTimersByTime(SETTLE_MS);

    ann.type('oak ', 1);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(bob.text()).toBe('oak chair');
    expect(bob.status()).toBe('online');
  });

  it('keeps what a pane types without the link and sends it once the link is back', () => {
    const [ann, bob] = createLoopbackPair(paragraphs('chair'));
    vi.advanceTimersByTime(SETTLE_MS);

    bob.link.setOnline(false);
    vi.advanceTimersByTime(SETTLE_MS);
    bob.type('soft ', 1);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(bob.status()).toBe('offline');
    expect(ann.text()).toBe('chair');

    bob.link.setOnline(true);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(bob.status()).toBe('online');
    expect(bob.link.online()).toBe(true);
    expect(ann.text()).toBe('soft chair');
  });

  it('merges what both panes typed while one of them was cut off', () => {
    const [ann, bob] = createLoopbackPair(paragraphs('chair'));
    vi.advanceTimersByTime(SETTLE_MS);

    bob.link.setOnline(false);
    vi.advanceTimersByTime(SETTLE_MS);
    ann.type('oak ', 1);
    bob.type(' set', 6);
    vi.advanceTimersByTime(SETTLE_MS);
    bob.link.setOnline(true);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(ann.text()).toBe('oak chair set');
    expect(bob.text()).toBe('oak chair set');
  });

  it('answers a message that breaks the protocol with an error', () => {
    const line = openRawLine(paragraphs('chair'));
    vi.advanceTimersByTime(SETTLE_MS);

    line.send({ kind: 'nonsense' });
    vi.advanceTimersByTime(SETTLE_MS);

    expect(line.heard()).toEqual([{ kind: 'error', code: 'protocol' }]);
  });
});
