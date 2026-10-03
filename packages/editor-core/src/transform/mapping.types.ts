export type Assoc = -1 | 1;

export interface MapResult {
  readonly pos: number;
  readonly deleted: boolean;
  readonly deletedBefore: boolean;
  readonly deletedAfter: boolean;
  readonly deletedAcross: boolean;
}

export interface Mappable {
  map(pos: number, assoc?: Assoc): number;
  mapResult(pos: number, assoc?: Assoc): MapResult;
}

export interface MapRange {
  readonly start: number;
  readonly oldSize: number;
  readonly newSize: number;
}

export interface StepMap extends Mappable {
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
