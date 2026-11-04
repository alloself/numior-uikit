import { FragmentSlotKind, type SlotPolicy } from '../../core/layout/fragments.types';
import type { XmlName } from '../xml/xml.types';
import type { LineAxis } from '../../core/cell.types';

export type AnchorMode = (typeof AnchorMode)[keyof typeof AnchorMode];

export type SlotSpec =
  | {
      readonly kind: typeof FragmentSpecKind.Cell | typeof FragmentSpecKind.Ranges;
      readonly policy: SlotPolicy;
    }
  | {
      readonly kind: typeof FragmentSpecKind.Line;
      readonly base: number;
      readonly policy: SlotPolicy;
      readonly axis?: LineAxis | undefined;
    }
  | { readonly kind: typeof FragmentSpecKind.Split; readonly axis: LineAxis }
  | {
      readonly kind:
        | typeof FragmentSpecKind.Offset
        | typeof FragmentSpecKind.Formula
        | typeof FragmentSpecKind.Count
        | typeof FragmentSpecKind.Anchor;
    };

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

export const FragmentSpecKind = { ...FragmentSlotKind, Anchor: 'anchor' } as const;

export const FragmentPieceKind = { Pending: 'pending' } as const;

export const AnchorMode = { TwoCell: 'twoCell', OneCell: 'oneCell', Absolute: 'absolute' } as const;

export const FragmentSpace = { Main: 'main', Other: 'other' } as const;
