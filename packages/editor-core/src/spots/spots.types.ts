import type { NodeId } from '../model/node.types';

export interface BlockSpot {
  readonly block: NodeId;
  readonly part: readonly string[];
}

export interface PeerSpot extends BlockSpot {
  readonly peer: string;
  readonly name: string;
  readonly colour: number;
}

export interface BlockSpotState {
  readonly spot: BlockSpot | undefined;
}
