export type Assoc = -1 | 1;

export interface MapResult {
  readonly pos: number;
  readonly deleted: boolean;
  readonly deletedBefore: boolean;
  readonly deletedAfter: boolean;
  readonly deletedAcross: boolean;
}

export interface MapSpan {
  readonly from: MapResult;
  readonly to: MapResult;
}

export interface Mappable {
  map(pos: number, assoc?: Assoc): number;
  mapResult(pos: number, assoc?: Assoc): MapResult;
  mapSpan(from: number, to: number, outward?: boolean): MapSpan | undefined;
}

export type StepMapKind = (typeof StepMapKind)[keyof typeof StepMapKind];

export interface MapRange {
  readonly start: number;
  readonly oldSize: number;
  readonly newSize: number;
}

export interface StepMap extends Mappable {
  readonly kind: StepMapKind;
  readonly ranges: readonly MapRange[];
  invert(): StepMap;
}

export interface Mapping extends Mappable {
  readonly maps: readonly StepMap[];
  append(map: StepMap): Mapping;
  concat(other: Mapping): Mapping;
  invert(): Mapping;
  slice(from?: number, to?: number): Mapping;
}

export const StepMapKind = { Ranges: 'ranges', Move: 'move' } as const;
