import type { NuiTableRect } from '@numior/table';

export const rectStyle = (shown: NuiTableRect | undefined): Record<string, string> =>
  shown === undefined
    ? { display: 'none' }
    : {
        insetBlockStart: `${String(shown.top)}px`,
        insetInlineStart: `${String(shown.start)}px`,
        inlineSize: `${String(shown.width)}px`,
        blockSize: `${String(shown.height)}px`,
      };
