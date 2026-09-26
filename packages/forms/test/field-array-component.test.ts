import { describe, expect, it } from 'vitest';
import { min, required } from '../src';
import { FieldArrayDriver } from './drivers/field-array';
import { issue, probeSchema, type SchemaValues } from './harness/schema';

const contactIssues = (values: SchemaValues) => {
  const contacts = Array.isArray(values.contacts) ? values.contacts : [];

  const index = contacts.findIndex(
    (contact: unknown) =>
      typeof contact === 'object' && contact !== null && Reflect.get(contact, 'name') === 'dup',
  );

  return index === -1 ? [] : [issue('This contact is listed twice', 'contacts', index)];
};

describe('NuiFieldArray', () => {
  it('adds a row, focuses its first control and announces it', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann', 'Bob'] });

    await list.add();
    expect(list.names).toEqual(['Ann', 'Bob', '']);
    expect(list.focused).toBe('name:2');
    expect(list.live).toBe('Row 3 added.');
  });

  it('moves focus to the next row, then the previous one, then the add button on removal', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann', 'Bob', 'Cid'] });

    await list.remove(1);
    expect(list.names).toEqual(['Ann', 'Cid']);
    expect(list.focused).toBe('name:1');
    expect(list.live).toBe('Row 2 removed.');

    await list.remove(1);
    expect(list.focused).toBe('name:0');

    await list.remove(0);
    expect(list.focused).toBe('add');
    expect(list.empty).toBe('No rows yet');
  });

  it('hides removal at the minimum and stops adding at the maximum', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann'], min: 1, max: 2 });

    expect(list.removeLabels).toEqual([]);

    await list.add();
    expect(list.removeLabels).toEqual(['Remove row 1', 'Remove row 2']);
    expect(list.canAdd).toBe(false);
    expect(list.limit).toBe('Row limit reached: 2');
  });

  it('shows list, row and field errors where they belong', async () => {
    const list = FieldArrayDriver.mount({
      names: ['dup'],
      listRules: [min(2)],
      rowRules: [required()],
      schema: probeSchema(contactIssues),
    });

    await list.add();
    await list.submit();
    expect(list.listError).toBeUndefined();
    expect(list.rowError(0)).toBe('This contact is listed twice');
    expect(list.fieldError(1)).toBe('Fill in this field');

    await list.remove(1);
    expect(list.listError).toBe('Add at least 2 items');
  });

  it('keeps a typed value in its row after an earlier row goes away', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann', 'Bob', 'Cid'] });

    await list.type(2, 'Zed');
    await list.remove(0);
    expect(list.names).toEqual(['Bob', 'Zed']);
    expect(list.values).toEqual([{ name: 'Bob' }, { name: 'Zed' }]);
  });

  it('reorders with the keyboard, announces each step and keeps the grip focused', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann', 'Bob', 'Cid'], reorderable: true });

    await list.press(0, ' ');

    expect(list.live).toBe(
      'Row 1 grabbed, position 1 of 3. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.',
    );

    expect(list.reordering).toBe(true);

    await list.press(0, 'ArrowDown');
    expect(list.live).toBe('Row 1, position 2 of 3.');

    await list.press(0, 'Enter');
    expect(list.names).toEqual(['Bob', 'Ann', 'Cid']);
    expect(list.live).toBe('Row 1 dropped at position 2 of 3.');
    expect(list.focused).toBe('grip:1');
  });

  it('cancels a keyboard move with Escape', async () => {
    const list = FieldArrayDriver.mount({ names: ['Ann', 'Bob'], reorderable: true });

    await list.press(0, ' ');
    await list.press(0, 'ArrowDown');
    await list.press(0, 'Escape');
    expect(list.names).toEqual(['Ann', 'Bob']);
    expect(list.live).toBe('Row 1, move cancelled.');
    expect(list.reordering).toBe(false);
  });

  it('drags a row with the pointer under an opaque ghost and moves its message along', async () => {
    const list = FieldArrayDriver.mount({
      names: ['', 'Bob', 'Cid'],
      reorderable: true,
      rowRules: [required()],
    });

    await list.submit();
    await list.drag(0, 2);
    expect(list.ghost).toBe('Row 1');
    expect(list.dragging(0)).toBe(true);

    await list.drop();
    expect(list.names).toEqual(['Bob', 'Cid', '']);
    expect(list.fieldError(2)).toBe('Fill in this field');
    expect(list.fieldError(0)).toBeUndefined();
    expect(list.ghost).toBeUndefined();
  });

  it('speaks the configured language', () => {
    const list = FieldArrayDriver.mount({
      names: ['Ann'],
      reorderable: true,
      config: { locale: 'ru-RU' },
    });

    expect(list.addText).toBe('Добавить строку');
    expect(list.removeLabels).toEqual(['Удалить строку 1']);
    expect(list.gripLabels).toEqual(['Переместить строку 1']);
  });
});
