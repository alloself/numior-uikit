import { afterEach, describe, expect, it } from 'vite-plus/test';
import { documentOf } from './comments-adapter';
import { SessionDriver } from './session-driver';

let session: SessionDriver | undefined;

afterEach(() => {
  session?.unmount();
  session = undefined;
});

describe('presence of a shared document', () => {
  it('tells the others each cell the person moves to inside a block', async () => {
    session = await SessionDriver.mount();

    await session.welcome(documentOf('one', 'two'), 4);
    await session.workIn('p1', ['r1', 'name']);
    await session.workIn('p1', ['r2', 'name']);

    expect(session.toldSpots.slice(-2)).toEqual([
      { block: 'p1', part: ['r1', 'name'] },
      { block: 'p1', part: ['r2', 'name'] },
    ]);
  });
});
