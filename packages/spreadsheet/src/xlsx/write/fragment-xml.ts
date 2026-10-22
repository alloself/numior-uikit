import { formatCell, formatRange } from '../../core/address';
import type { CellAddress } from '../../core/cell.types';
import { FILE_FORMULAS } from '../../core/formula/locale';
import { printFormula } from '../../core/formula/printer';
import { anchorOf, childCount, isSlot } from '../../core/layout/fragments';
import type { Fragment, FragmentSlot } from '../../core/layout/fragments.types';
import { escapeAttribute } from '../xml/writer';
import { withFuturePrefixes } from './future-functions';

const slotText = (slot: FragmentSlot, anchor: CellAddress, children: number): string => {
  switch (slot.kind) {
    case 'cell':
      return formatCell(slot.cell);
    case 'ranges':
      return slot.ranges.map(formatRange).join(' ');
    case 'line':
      return String(slot.line + slot.base);
    case 'split':
      return String(slot.count);
    case 'offset':
      return String(slot.offset);
    case 'formula':
      return escapeAttribute(printFormula(withFuturePrefixes(slot.ast), FILE_FORMULAS, anchor));
    case 'count':
      return String(children);
  }
};

export const fragmentXml = (fragment: Fragment): string => {
  const anchor = anchorOf(fragment);
  const children = childCount(fragment.pieces);

  return fragment.pieces
    .map((piece) => {
      if (typeof piece === 'string') {
        return piece;
      }
      return isSlot(piece) ? slotText(piece, anchor, children) : fragmentXml(piece);
    })
    .join('');
};
