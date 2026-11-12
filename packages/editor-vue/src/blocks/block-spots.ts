import type { NodeId, PeerSpot } from '@numior/editor-core';

export const NO_PEERS: readonly PeerSpot[] = [];

const NO_BLOCKS: ReadonlyMap<NodeId, readonly PeerSpot[]> = new Map();

const grouped = new WeakMap<readonly PeerSpot[], ReadonlyMap<NodeId, readonly PeerSpot[]>>();

export const spotsInBlocks = (
  spots: readonly PeerSpot[],
): ReadonlyMap<NodeId, readonly PeerSpot[]> => {
  if (spots.length === 0) {
    return NO_BLOCKS;
  }

  const known = grouped.get(spots);

  if (known !== undefined) {
    return known;
  }

  const blocks = spots.reduce((found, spot) => {
    found.set(spot.block, [...(found.get(spot.block) ?? []), spot]);
    return found;
  }, new Map<NodeId, readonly PeerSpot[]>());

  grouped.set(spots, blocks);
  return blocks;
};
