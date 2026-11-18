import { camelCase, upperFirst } from 'lodash-es';

const KEBAB_PREFIX = 'nui-';

export const componentName = (raw: string): string =>
  raw.startsWith(KEBAB_PREFIX) ? upperFirst(camelCase(raw)) : raw;
