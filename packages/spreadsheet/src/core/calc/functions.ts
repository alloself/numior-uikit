import { ARRAY_FUNCTIONS } from './array-functions';
import type { FunctionSpec } from './calc.types';
import { DATE_FUNCTIONS } from './date-functions';
import { FINANCIAL_FUNCTIONS } from './financial-functions';
import { INFORMATION_FUNCTIONS } from './information-functions';
import { LOGICAL_FUNCTIONS } from './logical-functions';
import { LOOKUP_FUNCTIONS } from './lookup-functions';
import { MATH_FUNCTIONS } from './math-functions';
import { REFERENCE_FUNCTIONS } from './reference-functions';
import { SHAPE_FUNCTIONS } from './shape-functions';
import { STATISTICS_FUNCTIONS } from './statistics-functions';
import { TEXT_FUNCTIONS } from './text-functions';
import { VOLATILE_FUNCTIONS } from './volatile-functions';

export const BASE_FUNCTIONS: readonly FunctionSpec[] = [
  ...MATH_FUNCTIONS,
  ...STATISTICS_FUNCTIONS,
  ...LOGICAL_FUNCTIONS,
  ...TEXT_FUNCTIONS,
  ...INFORMATION_FUNCTIONS,
  ...LOOKUP_FUNCTIONS,
  ...REFERENCE_FUNCTIONS,
  ...ARRAY_FUNCTIONS,
  ...SHAPE_FUNCTIONS,
  ...VOLATILE_FUNCTIONS,
  ...DATE_FUNCTIONS,
  ...FINANCIAL_FUNCTIONS,
];
