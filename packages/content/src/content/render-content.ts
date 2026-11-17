import type { Doc } from '@numior/editor-core';
import { ICONS_KEY, type IconRegistry } from '@numior/primitives';
import { createSSRApp } from 'vue';
import NuiContent from './NuiContent.vue';
import type { NuiContentSize } from './content.types';

export interface RenderContentOptions {
  readonly size?: NuiContentSize | undefined;
  readonly icons?: IconRegistry | undefined;
}

const NO_ICONS: IconRegistry = {};

export const renderContent = async (
  doc: Doc,
  options: RenderContentOptions = {},
): Promise<string> => {
  const { renderToString } = await import('vue/server-renderer');
  const app = createSSRApp(NuiContent, { document: doc, size: options.size });

  app.provide(ICONS_KEY, options.icons ?? NO_ICONS);
  return renderToString(app);
};
