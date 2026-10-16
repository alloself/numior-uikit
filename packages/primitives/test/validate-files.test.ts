import { describe, expect, it } from 'vite-plus/test';
import { validateFiles } from '../src';
import { fileOf } from './harness/upload';

const names = (files: readonly File[]): string[] => files.map((file) => file.name);

describe('validateFiles', () => {
  it('matches accept tokens by extension, exact type and wildcard', () => {
    const files = [
      fileOf('notes.txt'),
      fileOf('photo.JPG', 3, 'image/jpeg'),
      fileOf('clip.mp4', 3, 'video/mp4'),
      fileOf('sheet.xlsx', 3, ''),
    ];

    const result = validateFiles(files, { accept: '.txt, image/*,video/mp4' });
    expect(names(result.accepted)).toEqual(['notes.txt', 'photo.JPG', 'clip.mp4']);
    expect(result.rejected).toEqual([{ file: files[3], error: { reason: 'type' } }]);
    expect(validateFiles(files).rejected).toEqual([]);
  });

  it('limits size and count including files already present, in order of arrival', () => {
    const files = [fileOf('a.txt', 10), fileOf('b.txt', 2), fileOf('c.txt', 2), fileOf('d.txt', 2)];
    const result = validateFiles(files, { maxSize: 5, maxFiles: 3, existing: 1 });
    expect(names(result.accepted)).toEqual(['b.txt', 'c.txt']);

    expect(result.rejected.map((entry) => [entry.file.name, entry.error.reason])).toEqual([
      ['a.txt', 'size'],
      ['d.txt', 'count'],
    ]);
  });

  it('runs the custom check last and keeps its message', () => {
    const files = [fileOf('draft.txt'), fileOf('final.txt')];

    const result = validateFiles(files, {
      validate: (file) => (file.name.startsWith('draft') ? 'Drafts are not accepted' : undefined),
    });

    expect(names(result.accepted)).toEqual(['final.txt']);

    expect(result.rejected).toEqual([
      { file: files[0], error: { reason: 'custom', message: 'Drafts are not accepted' } },
    ]);
  });
});
