import type { NuiTableRange, NuiTableRect } from '@numior/table';

export interface SheetReference {
  readonly range: NuiTableRange;
  readonly tone: string;
}

export interface SheetReferenceBox {
  readonly key: string;
  readonly style: Readonly<Record<string, string>>;
}

export const referenceBoxes = (
  rectOf: (range: NuiTableRange) => NuiTableRect | undefined,
  references: readonly SheetReference[],
): SheetReferenceBox[] =>
  references.flatMap((reference, index) => {
    const rect = rectOf(reference.range);

    return rect === undefined
      ? []
      : [
          {
            key: String(index),
            style: {
              '--_ref': reference.tone,
              insetBlockStart: `${rect.top}px`,
              insetInlineStart: `${rect.start}px`,
              inlineSize: `${rect.width}px`,
              blockSize: `${rect.height}px`,
            },
          },
        ];
  });
