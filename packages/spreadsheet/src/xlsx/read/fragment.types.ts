import type { SlotAxis, SlotPolicy } from '../../core/layout/fragments.types';
import type { XmlName } from '../xml/xml.types';

export type SlotSpec =
  | { readonly kind: 'cell' | 'ranges'; readonly policy: SlotPolicy }
  | {
      readonly kind: 'line';
      readonly base: number;
      readonly policy: SlotPolicy;
      readonly axis?: SlotAxis | undefined;
    }
  | { readonly kind: 'split'; readonly axis: SlotAxis }
  | { readonly kind: 'offset' | 'formula' | 'count' | 'anchor' };

export interface ElementSpec {
  readonly fragment?: 'item' | 'group';
  readonly attributes?: Readonly<Record<string, SlotSpec>>;
  readonly text?: SlotSpec;
  readonly raw?: boolean;
}

export type ElementSpecs = Readonly<Record<string, ElementSpec>>;

export interface RecorderOptions {
  readonly specs: ElementSpecs;
  readonly inherit: string;
  readonly opaqueTop?: ((name: XmlName) => boolean) | undefined;
}
