import { describe, expect, it } from 'vitest';
import { plural } from '../src';

const files = { one: 'файл', few: 'файла', many: 'файлов', other: 'файла' };

describe('plural', () => {
  it('picks Russian forms by the plural rules of the language', () => {
    expect([1, 2, 5, 11, 21, 22, 1.5].map((count) => plural('ru', count, files))).toEqual([
      'файл',
      'файла',
      'файлов',
      'файлов',
      'файл',
      'файла',
      'файла',
    ]);
  });

  it('picks English forms and falls back to other for a missing form', () => {
    expect(plural('en', 1, { one: 'file', other: 'files' })).toBe('file');
    expect(plural('en', 2, { one: 'file', other: 'files' })).toBe('files');
    expect(plural('ru', 5, { one: 'штука', other: 'штуки' })).toBe('штуки');
  });
});
