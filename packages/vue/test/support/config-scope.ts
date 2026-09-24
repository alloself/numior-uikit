import { defineComponent, h, type Component, type VNode } from 'vue';
import { provideNuiConfig, type NuiConfigOptions } from '../../src';

export const configScope = (options: NuiConfigOptions, render: () => VNode | VNode[]): Component =>
  defineComponent({
    setup: () => {
      provideNuiConfig(options);
      return () => h('div', { class: 'config-scope' }, render());
    },
  });
