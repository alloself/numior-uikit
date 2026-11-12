import type { NuiTableRect } from './table.types';

export const tableRectStyle = (shown: NuiTableRect | undefined): Record<string, string> =>
  shown === undefined
    ? { display: 'none' }
    : {
        insetBlockStart: `${String(shown.top)}px`,
        insetInlineStart: `${String(shown.start)}px`,
        inlineSize: `${String(shown.width)}px`,
        blockSize: `${String(shown.height)}px`,
      };
