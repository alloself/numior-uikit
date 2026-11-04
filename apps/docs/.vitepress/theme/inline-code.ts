import type { InlineSegment } from './theme.types';

export const inlineSegments = (text: string): readonly InlineSegment[] =>
  text.split('`').map((part, index) => ({ text: part, code: index % 2 === 1 }));

export const withoutInlineCode = (text: string): string => text.replaceAll('`', '');
