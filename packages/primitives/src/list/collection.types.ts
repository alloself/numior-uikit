import type { ComponentPublicInstance } from 'vue';

export type ElementRef = (value: Element | ComponentPublicInstance | null) => void;

export interface BoundRef {
  readonly also: ElementRef | undefined;
  readonly bound: ElementRef;
}

export interface ElementCollection<K = unknown> {
  readonly ref: (key: K, also?: ElementRef) => ElementRef;
  readonly set: (key: K, value: unknown) => void;
  readonly release: (key: K, element: HTMLElement | null) => void;
  readonly get: (key: K) => HTMLElement | undefined;
  readonly elements: () => readonly HTMLElement[];
  readonly first: (test: (key: K) => boolean) => HTMLElement | undefined;
}
