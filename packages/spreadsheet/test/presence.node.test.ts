import { describe, expect, it } from 'vite-plus/test';
import { workbookPeers } from '../src/core';

const USER = { id: 'anna', name: 'Анна' };

const PLACE = {
  sheet: 'Sheet1',
  selection: {
    active: { row: 1, col: 2 },
    ranges: [{ top: 1, left: 2, bottom: 3, right: 4 }],
  },
};

const peersOf = (state: unknown): ReturnType<typeof workbookPeers> =>
  workbookPeers(new Map([['client-1', state]]));

describe('workbook presence', () => {
  it('reads someone standing on a sheet', () => {
    const [peer] = peersOf({ user: USER, place: PLACE });

    expect(peer?.clientId).toBe('client-1');
    expect(peer?.user).toEqual(USER);
    expect(peer?.place).toEqual(PLACE);
  });

  it('keeps someone who has not picked a cell yet', () => {
    const [peer] = peersOf({ user: USER, place: null });

    expect(peer?.place).toBeNull();
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'Анна'],
    ['no user', { place: null }],
    ['a user without a name', { user: { id: 'anna' }, place: null }],
    [
      'a negative row',
      { user: USER, place: { ...PLACE, selection: { active: { row: -1, col: 0 }, ranges: [] } } },
    ],
    [
      'a broken range',
      {
        user: USER,
        place: { ...PLACE, selection: { active: { row: 0, col: 0 }, ranges: [{ top: 0 }] } },
      },
    ],
    ['a sheet without a name', { user: USER, place: { selection: PLACE.selection } }],
  ])('skips %s', (_, state) => {
    expect(peersOf(state)).toEqual([]);
  });

  it('gives the same person the same colour on every client', () => {
    const [first] = peersOf({ user: USER, place: null });
    const [second] = workbookPeers(new Map([['client-2', { user: USER, place: PLACE }]]));

    expect(first?.colour).toBe(second?.colour);
    expect(first?.colour).toBeGreaterThanOrEqual(0);
    expect(first?.colour).toBeLessThan(8);
  });
});
