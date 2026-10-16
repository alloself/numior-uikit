let segmenter: Intl.Segmenter | undefined;

const graphemeSegmenter = (): Intl.Segmenter => {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return segmenter;
};

export const graphemesOf = (text: string): string[] =>
  Array.from(graphemeSegmenter().segment(text), (part) => part.segment);
