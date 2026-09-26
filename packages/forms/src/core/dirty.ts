import { getAt } from '../values/access';
import { isEqualValue } from '../values/equal';
import type { FormCore } from './form-core';

export const isPathDirty = <V extends object, O>(core: FormCore<V, O>, path: string): boolean =>
  !isEqualValue(getAt(core.engine.values, path), getAt(core.initial.value, path));
