import { moveBlock, type Doc } from '@numior/editor-core';
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

const mixed = (): Doc =>
  page(
    paragraph('n', 'note'),
    paragraph('m', 'middle'),
    list('list', item('a', 'one'), item('b', 'two', list('sub', item('x', 'first')))),
    paragraph('z', 'last'),
  );

const tasks = (): Doc =>
  page(
    list('list', item('a', 'one'), item('b', 'two', list('sub', item('x', 'first')))),
    fixtureSchema.element('todo_list', {
      id: 'todo',
      content: [
        fixtureSchema.element('todo_item', { id: 't', content: [paragraph('t-text', 'task')] }),
      ],
    }),
  );

const single = (): Doc => page(paragraph('n', 'note'), list('list', item('a', 'one')));

describe.each(ORDERS)(
  'a block carried into a container of another kind while someone types %s',
  (_name, order) => {
    it('keeps text typed into a paragraph that becomes a list item', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'root', index: 0 }, { parent: 'list', index: 1 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'n', offset: 2 },
        },
        order,
      );

      const text = 'middle|one|noANNte|two|first|last';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the blocks the paragraph passes on its way into the list', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'root', index: 0 }, { parent: 'list', index: 1 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'm', offset: 3 },
        },
        order,
      );

      const text = 'midANNdle|one|note|two|first|last';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into a list item that becomes a paragraph of the page', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'list', index: 0 }, { parent: 'root', index: 0 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'a-text', offset: 1 },
        },
        order,
      );

      const text = 'oANNne|note|middle|two|first|last';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items nested under a list item that leaves its list', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'list', index: 1 }, { parent: 'root', index: 4 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'x-text', offset: 2 },
        },
        order,
      );

      const text = 'note|middle|one|last|two|fiANNrst';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the only item of a list that leaves the list empty', () => {
      const network = raced(
        {
          doc: single(),
          command: moveBlock({ parent: 'list', index: 0 }, { parent: 'root', index: 0 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'a-text', offset: 3 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['oneANN|note', 'oneANN|note']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps both halves of a paragraph someone split while it was carried into a list', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'root', index: 0 }, { parent: 'list', index: 1 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'n', offset: 2 },
          change: splitLine,
        },
        order,
      );

      const text = 'middle|one|no|te|two|first|last';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps both halves of a paragraph someone split on the way of a block carried into a list', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'root', index: 0 }, { parent: 'list', index: 1 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'm', offset: 2 },
          change: splitLine,
        },
        order,
      );

      const text = 'mi|ddle|one|note|two|first|last';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps both halves of a list item someone split while it was carried out of its list', () => {
      const network = raced(
        {
          doc: mixed(),
          command: moveBlock({ parent: 'list', index: 0 }, { parent: 'root', index: 4 }),
          caret: { block: 'n', offset: 0 },
          typed: { block: 'a-text', offset: 1 },
          change: splitLine,
        },
        order,
      );

      const letters = textsOf(network).map((text) => text.replaceAll('|', ''));

      expect(letters).toEqual(['notemiddletwofirstlastone', 'notemiddletwofirstlastone']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into a bullet item that becomes a to-do item', () => {
      const network = raced(
        {
          doc: tasks(),
          command: moveBlock({ parent: 'list', index: 1 }, { parent: 'todo', index: 1 }),
          caret: { block: 'a-text', offset: 0 },
          typed: { block: 'x-text', offset: 2 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|task|two|fiANNrst', 'one|task|two|fiANNrst']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps both halves of a bullet item someone split while it became a to-do item', () => {
      const network = raced(
        {
          doc: tasks(),
          command: moveBlock({ parent: 'list', index: 1 }, { parent: 'todo', index: 0 }),
          caret: { block: 'a-text', offset: 0 },
          typed: { block: 'b-text', offset: 1 },
          change: splitLine,
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|t|wo|first|task', 'one|t|wo|first|task']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into a list whose items are carried into a list of another kind', () => {
      const network = raced(
        {
          doc: tasks(),
          command: moveBlock({ parent: 'root', index: 0 }, { parent: 'todo', index: 1 }),
          caret: { block: 't-text', offset: 0 },
          typed: { block: 'b-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['task|one|tANNwo|first', 'task|one|tANNwo|first']);
      expect(sameDocs(network)).toBe(true);
    });
  },
);
