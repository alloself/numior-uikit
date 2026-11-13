import { afterEach, describe, expect, it } from 'vite-plus/test';
import { PointerSessionHarness } from './harness/pointer-session';
import { watchPointerListenerAdds, type ListenerAdds } from './support/listener-adds';

const owners: PointerSessionHarness[] = [];

const listeners: ListenerAdds[] = [];

const mounted = (capture = false): PointerSessionHarness => {
  const owner = PointerSessionHarness.mount({ capture });

  owners.push(owner);
  return owner;
};

const watched = (): ListenerAdds => {
  const adds = watchPointerListenerAdds();

  listeners.push(adds);
  return adds;
};

afterEach(() => {
  for (const adds of listeners.splice(0)) {
    adds.restore();
  }

  for (const owner of owners.splice(0)) {
    owner.unmount();
  }
});

describe('usePointerSession', () => {
  it('hears the moves and the release of a press until the press ends', () => {
    const owner = mounted();

    owner.press();
    PointerSessionHarness.move();
    PointerSessionHarness.release();
    owner.end();
    PointerSessionHarness.move();

    expect(owner.events).toEqual(['move', 'up']);
  });

  it('hears the browser taking the pointer away', () => {
    const owner = mounted();

    owner.press();
    PointerSessionHarness.loseThePointer();

    expect(owner.events).toEqual(['cancel']);
  });

  it('adds no listener to the page when a press begins', () => {
    const owner = mounted();
    const other = mounted(true);
    const adds = watched();

    owner.press();
    other.press();
    PointerSessionHarness.move();

    expect(adds.types()).toEqual([]);
    expect(owner.events).toEqual(['move']);
    expect(other.events).toEqual(['move']);
  });

  it('hears a release stopped on its way up only when it listens on the way down', () => {
    const stopper = document.createElement('div');
    const late = mounted();
    const early = mounted(true);

    stopper.addEventListener('pointerup', (event) => {
      event.stopPropagation();
    });

    document.body.append(stopper);
    late.press();
    early.press();
    PointerSessionHarness.release(stopper);
    stopper.remove();

    expect(late.events).toEqual([]);
    expect(early.events).toEqual(['up']);
  });

  it('keeps a press that begins during a move for the moves after it', () => {
    const first = mounted();
    const second = mounted();

    first.pressThen(() => {
      second.press();
    });

    PointerSessionHarness.move();

    expect(second.events).toEqual([]);

    PointerSessionHarness.move();

    expect(second.events).toEqual(['move']);
  });

  it('skips a press that another one ends during the same move', () => {
    const first = mounted();
    const second = mounted();

    first.pressThen(() => {
      second.end();
    });

    second.press();
    PointerSessionHarness.move();

    expect(first.events).toEqual(['move']);
    expect(second.events).toEqual([]);
  });

  it('stops hearing a press once its owner goes away', () => {
    const owner = PointerSessionHarness.mount();

    owner.press();
    owner.unmount();
    PointerSessionHarness.move();

    expect(owner.events).toEqual([]);
  });
});
