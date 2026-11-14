import type { Locator } from '@playwright/test';
import type { Accent, Density, Direction } from '../e2e/pages/playground';

export type Scheme = 'light' | 'dark';

export type Target = 'playground' | 'docs';

export interface Profile {
  readonly id: string;
  readonly target: Target;
  readonly scheme: Scheme;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly direction: Direction;
  readonly density: Density;
  readonly accent: Accent | null;
  readonly states: boolean;
  readonly stills: boolean;
  readonly motion: boolean;
}

export type RawNode = readonly [parent: number, segment: string, rect: string, style: number[]];

export interface RawScene {
  readonly values: string[];
  readonly nodes: RawNode[];
}

export interface CollectOptions {
  readonly root: string;
  readonly properties: readonly string[];
}

export type Note = readonly [subject: string, value: string];

export interface SeekOptions {
  readonly root: string;
  readonly progress: number;
}

export interface FrameWatch {
  readonly store: string;
  readonly type: string;
}

export interface FrameReport {
  readonly count: number;
  readonly height: number;
}

export interface FrameReports {
  readonly waiting: number;
  readonly signature: string;
}

export type StoredNode = readonly [parent: number, segment: string, rect: string, own: number[]];

export interface StoredScene {
  readonly name: string;
  readonly properties: readonly string[];
  readonly values: readonly string[];
  readonly modes: readonly number[];
  readonly nodes: readonly StoredNode[];
  readonly notes: readonly Note[];
}

export interface Finding {
  readonly scene: string;
  readonly element: string;
  readonly property: string;
  readonly before: string;
  readonly after: string;
}

export interface Allowance {
  readonly scene?: string;
  readonly element?: string;
  readonly property?: string;
  readonly reason: string;
}

export interface ClassChange {
  readonly element: string;
  readonly dropped: readonly string[];
  readonly reason: string;
}

export interface SceneTotals {
  readonly elements: number;
  readonly values: number;
}

export interface Image {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly pixels: Uint8Array;
}

export type Shot = 'page' | 'viewport' | Locator;

export interface Comparison {
  readonly scenes: number;
  readonly elements: number;
  readonly values: number;
  readonly images: number;
  readonly findings: readonly Finding[];
  readonly allowed: readonly Finding[];
}
