import { afterEach, describe, expect, it } from 'vite-plus/test';
import { PressTargetsHarness } from './harness/press-targets';
import { watchPointerListenerAdds, type ListenerAdds } from './support/listener-adds';

let host: PressTargetsHarness | undefined;

let adds: ListenerAdds | undefined;

const mounted = (options: { shown?: boolean; stops?: boolean } = {}): PressTargetsHarness => {
  host = PressTargetsHarness.mount(options);
  return host;
};

afterEach(() => {
  adds?.restore();
  adds = undefined;
  host?.unmount();
  host = undefined;
});

describe('createPressTargets', () => {
  it('hands a press to every attached part from the deepest one out', () => {
    const owner = mounted();

    owner.pressMark();

    expect(owner.presses).toEqual(['inner', 'outer', 'root']);
  });

  it('hands a press only to the parts around the pressed spot', () => {
    const owner = mounted();

    owner.pressOuter();

    expect(owner.presses).toEqual(['outer', 'root']);
  });

  it('stops at a part that stops the press', () => {
    const owner = mounted({ stops: true });

    owner.pressMark();

    expect(owner.presses).toEqual(['inner']);
  });

  it('takes a part that appears later without a listener of its own', async () => {
    const owner = mounted({ shown: false });

    adds = watchPointerListenerAdds();
    await owner.show();
    owner.pressMark();

    expect(adds.types()).toEqual([]);
    expect(owner.presses).toEqual(['inner', 'outer', 'root']);
  });
});
