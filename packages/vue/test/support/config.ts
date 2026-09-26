import type { Plugin } from 'vue';
import { createNuiConfig, type NuiConfigOptions } from '../../src';

export const configPlugins = (config: NuiConfigOptions | undefined): Plugin[] =>
  config === undefined ? [] : [createNuiConfig(config)];
