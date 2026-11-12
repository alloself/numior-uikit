import type { NuiTablePeer, NuiTableRange, NuiTableRect } from './table.types';

export interface ShownPeerArea {
  readonly key: string;
  readonly rect: NuiTableRect;
}

export interface ShownPeer {
  readonly key: string;
  readonly name: string;
  readonly tone: number;
  readonly flagBelow: boolean;
  readonly rect: NuiTableRect | undefined;
  readonly areas: readonly ShownPeerArea[];
}

const TONES = 8;

const toneOf = (colour: number): number => (((Math.trunc(colour) % TONES) + TONES) % TONES) + 1;

export const shownPeers = (
  peers: readonly NuiTablePeer[],
  rectOf: (range: NuiTableRange) => NuiTableRect | undefined,
): readonly ShownPeer[] =>
  peers.map((peer) => ({
    key: peer.key,
    name: peer.name,
    tone: toneOf(peer.colour),
    flagBelow: Math.min(peer.cell.from.row, peer.cell.to.row) === 0,
    rect: rectOf(peer.cell),
    areas: (peer.areas ?? []).reduce<ShownPeerArea[]>((areas, range, at) => {
      const rect = rectOf(range);

      if (rect !== undefined) {
        areas.push({ key: String(at), rect });
      }

      return areas;
    }, []),
  }));
