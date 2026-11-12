import { joinBackward, joinForward, type Doc } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import {
  ORDERS,
  item,
  list,
  page,
  paragraph,
  raced,
  sameDocs,
  splitLine,
  textsOf,
} from './harness/races';

const quoted = (): Doc =>
  page(
    fixtureSchema.element('blockquote', {
      id: 'q',
      content: [paragraph('q0', 'first'), paragraph('q1', 'second')],
    }),
    paragraph('n', 'next'),
  );

const listed = (): Doc =>
  page(paragraph('n', 'prev'), list('list', item('a', 'one'), item('b', 'two')));

const parent = (text: string): Doc =>
  page(
    list(
      'list',
      item('a', 'one'),
      item('b', text, list('sub', item('x', 'first'), item('y', 'second'))),
      item('c', 'three'),
    ),
  );

describe.each(ORDERS)(
  'a line joined to a line of another container while someone types %s',
  (_name, order) => {
    it('keeps text typed into the line that Backspace pulls into a quote', () => {
      const network = raced(
        {
          doc: quoted(),
          command: joinBackward,
          caret: { block: 'n', offset: 0 },
          typed: { block: 'n', offset: 2 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['first|secondneANNxt', 'first|secondneANNxt']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the quote line that Backspace joins the next line to', () => {
      const network = raced(
        {
          doc: quoted(),
          command: joinBackward,
          caret: { block: 'n', offset: 0 },
          typed: { block: 'q1', offset: 6 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['first|secondANNnext', 'first|secondANNnext']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the first list line that Delete pulls out of its list', () => {
      const network = raced(
        {
          doc: listed(),
          command: joinForward,
          caret: { block: 'n', offset: 4 },
          typed: { block: 'a-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['prevoANNne|two', 'prevoANNne|two']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items left behind by a line that Delete pulls out', () => {
      const network = raced(
        {
          doc: parent('two'),
          command: joinForward,
          caret: { block: 'a-text', offset: 3 },
          typed: { block: 'y-text', offset: 1 },
        },
        order,
      );

      const text = 'onetwo|first|sANNecond|three';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items of an empty line that Backspace removes', () => {
      const network = raced(
        {
          doc: parent(''),
          command: joinBackward,
          caret: { block: 'b-text', offset: 0 },
          typed: { block: 'x-text', offset: 1 },
        },
        order,
      );

      const text = 'one|fANNirst|second|three';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items of an empty line that Delete removes from above', () => {
      const network = raced(
        {
          doc: parent(''),
          command: joinForward,
          caret: { block: 'a-text', offset: 3 },
          typed: { block: 'y-text', offset: 6 },
        },
        order,
      );

      const text = 'one|first|secondANN|three';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps both halves of a line that someone split while Backspace pulled it into a quote', () => {
      const network = raced(
        {
          doc: quoted(),
          command: joinBackward,
          caret: { block: 'n', offset: 0 },
          typed: { block: 'n', offset: 2 },
          change: splitLine,
        },
        order,
      );

      expect(textsOf(network)).toEqual(['first|secondne|xt', 'first|secondne|xt']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps every letter of a list line that someone split while Delete pulled it out', () => {
      const network = raced(
        {
          doc: parent('two'),
          command: joinForward,
          caret: { block: 'a-text', offset: 3 },
          typed: { block: 'b-text', offset: 1 },
          change: splitLine,
        },
        order,
      );

      const letters = textsOf(network).map((text) => text.replaceAll('|', ''));

      expect(letters).toEqual(['onetwofirstsecondthree', 'onetwofirstsecondthree']);
      expect(sameDocs(network)).toBe(true);
    });
  },
);
