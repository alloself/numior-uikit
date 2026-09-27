import type { NuiDateRange } from '../../src';
import { isString, nullable, shapeOf, type Guard } from '../../../primitives/test/support/guards';

export const isDateRange: Guard<NuiDateRange> = shapeOf({
  start: nullable(isString),
  end: nullable(isString),
});
