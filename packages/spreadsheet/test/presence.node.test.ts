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

const LONG_IDS = [
  '3f2b8c1e-7a44-4d0b-9c1f-0a6f5d2e8b11',
  'b81d4e02-55c7-4f3a-8e90-c2d71a9f6e34',
  '0c9a7f56-1e2d-4b8c-a3f4-9d8e7c6b5a40',
  'e47f1a93-8b2c-4d6e-b5a1-3c2d1e0f9a88',
  '7d5e3c21-9f0a-4b1c-8d2e-6f7a8b9c0d15',
  'a2c4e6f8-1b3d-4f5a-9c7e-0d2f4a6c8e19',
  'user-with-a-long-readable-identifier-0001',
];

const LONG_ID_COLOURS = [7, 2, 5, 4, 4, 7, 1];

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
    const [peer] = peersOf({ user: USER });

    expect(peer?.place).toBeUndefined();
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'Анна'],
    ['no user', {}],
    ['a user without a name', { user: { id: 'anna' } }],
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
    const [first] = peersOf({ user: USER });
    const [second] = workbookPeers(new Map([['client-2', { user: USER, place: PLACE }]]));

    expect(first?.colour).toBe(second?.colour);
    expect(first?.colour).toBeGreaterThanOrEqual(0);
    expect(first?.colour).toBeLessThan(8);
  });

  it('spreads people with long ids over the colours, the same way the editor does', () => {
    const peers = workbookPeers(
      new Map(LONG_IDS.map((id, index) => [`client-${String(index)}`, { user: { id, name: id } }])),
    );

    expect(peers.map((peer) => peer.colour)).toEqual(LONG_ID_COLOURS);
  });
});
