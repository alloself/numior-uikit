import { toHTML, type Doc } from '@numior/editor-core';
import type { NuiContentSize } from './content.types';

export interface RenderContentOptions {
  readonly size?: NuiContentSize | undefined;
}

export const renderContent = (doc: Doc, options: RenderContentOptions = {}): string => {
  const root = ['nui-content', `nui-content--size-${options.size ?? 'md'}`].join(' ');

  return ['<div class="', root, '">', toHTML(doc), '</div>'].join('');
};
