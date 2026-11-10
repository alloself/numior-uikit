import { describe, expect, it } from 'vite-plus/test';
import { EdgeScrollHarness } from './harness/edge-scroll';

describe('useEdgeScroll', () => {
  it('scrolls the same distance over the same frames whatever the number of pointer moves', () => {
    const still = EdgeScrollHarness.mount();
    still.drag(190, { frames: 10, movesPerFrame: 0 });

    const steady = EdgeScrollHarness.mount();
    steady.drag(190, { frames: 10, movesPerFrame: 1 });

    const busy = EdgeScrollHarness.mount();
    busy.drag(190, { frames: 10, movesPerFrame: 25 });

    expect([still.scrollTop, steady.scrollTop, busy.scrollTop]).toEqual([80, 80, 80]);
    expect([still.steps, steady.steps, busy.steps]).toEqual([10, 10, 10]);

    still.unmount();
    steady.unmount();
    busy.unmount();
  });

  it('only records the pointer on a move and stops asking for frames away from the edges', () => {
    const edge = EdgeScrollHarness.mount();
    edge.moveTo(190);
    expect([edge.scrollTop, edge.steps]).toEqual([0, 0]);

    edge.frame();
    expect([edge.scrollTop, edge.steps]).toEqual([8, 1]);

    edge.moveTo(100);
    edge.frame();
    edge.frame();
    expect([edge.scrollTop, edge.steps]).toEqual([8, 1]);
    expect(edge.awaitsFrame).toBe(false);

    edge.moveTo(5);
    edge.frame();
    expect(edge.scrollTop).toBe(0);

    edge.stop();
    expect(edge.awaitsFrame).toBe(false);

    edge.unmount();
  });

  it('keeps one step per frame after the pointer leaves an edge and comes straight back', () => {
    const edge = EdgeScrollHarness.mount();
    edge.moveTo(190);
    edge.frame();
    expect(edge.scrollTop).toBe(8);

    edge.moveTo(100);
    edge.frame();
    edge.moveTo(190);
    edge.frame();
    expect(edge.scrollTop).toBe(16);

    edge.frame();
    expect([edge.scrollTop, edge.steps]).toEqual([24, 3]);

    edge.unmount();
  });

  it('scales a step by the frame time, caps a long frame and scrolls across on the other axis', () => {
    const edge = EdgeScrollHarness.mount();
    edge.moveTo(190);
    edge.frame();
    edge.frame(1000 / 120);
    expect(edge.scrollTop).toBe(12);

    edge.frame(1000);
    expect(edge.scrollTop).toBe(44);

    edge.moveAcross(195);
    edge.frame();
    expect([edge.scrollLeft, edge.scrollTop]).toEqual([8, 44]);

    edge.unmount();
  });
});
