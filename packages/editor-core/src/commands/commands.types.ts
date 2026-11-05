import type { NodeId } from '../model/node.types';
import type { Schema } from '../schema/schema.types';

export interface BlockMaker {
  readonly doc: { readonly schema: Schema };
  readonly newId: () => NodeId;
}

export type BesideSide = (typeof BesideSide)[keyof typeof BesideSide];

export const BesideSide = { Start: 'start', End: 'end' } as const;
