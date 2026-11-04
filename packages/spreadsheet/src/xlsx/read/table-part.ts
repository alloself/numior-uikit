import { parseRange } from '../../core/address';
import type { CellRange } from '../../core/cell.types';
import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';
import { OoxmlElement } from '../ooxml.types';

export interface TableEntry {
  readonly name: string;
  readonly range: CellRange;
  readonly columns: readonly string[];
  readonly headers: boolean;
  readonly totals: boolean;
}

export const readTablePart = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<TableEntry | undefined> => {
  const columns: string[] = [];
  let name = '';
  let range: CellRange | undefined;
  let headers = true;
  let totals = false;

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (!MAIN.has(element.uri)) {
          return;
        }
        if (element.local === OoxmlElement.Table) {
          name = attributeOf(attributes, 'displayName') ?? attributeOf(attributes, 'name') ?? '';
          range = parseRange(attributeOf(attributes, 'ref') ?? '');
          headers = numberOf(attributeOf(attributes, 'headerRowCount'), 1) > 0;
          totals = numberOf(attributeOf(attributes, 'totalsRowCount'), 0) > 0;
        } else if (element.local === OoxmlElement.TableColumn) {
          columns.push(decodeXstring(attributeOf(attributes, 'name') ?? ''));
        }
      },
    },
    options,
  );

  return range === undefined || name === '' ? undefined : { name, range, columns, headers, totals };
};
