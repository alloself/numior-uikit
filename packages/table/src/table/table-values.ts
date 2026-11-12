import { isEqual } from 'lodash-es';

export const keepEqual = <V>(next: V, previous: V | undefined): V =>
  previous !== undefined && isEqual(previous, next) ? previous : next;
